import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../../prisma/client";
import { withAuth } from "@/middleware/auth";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  InternalError,
  ValidationError,
} from "@/types/errors";
import { ActionItemStatus } from "@/generated/prisma/client";
import { runMeetingAnalysis } from "@/lib/analysis-service";
import { checkAnalyzeRateLimit } from "@/lib/rate-limiter";
import { hashTranscript } from "@/lib/transcript-hash";
import { invalidateUserReadCaches } from "@/lib/cache";
import type { AuthContext } from "@/types/auth";

async function analyzeHandler(
  req: NextRequest,
  authCtx: AuthContext,
  params?: Record<string, string>
): Promise<NextResponse> {
  const traceId = getTraceId(req);

  try {
    const meetingId = params?.id;
    if (!meetingId) {
      throw new ValidationError("Meeting ID is required");
    }

    // ── 1. Rate limit check ──────────────────────────────────────────────
    // Runs before any DB reads — cheapest possible guard.
    // Throws 429 if either per-user or per-meeting limit exceeded.
    await checkAnalyzeRateLimit(authCtx.userId, meetingId);

    // ── 2. Fetch meeting + verify ownership ─────────────────────────────
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        transcriptSegments: {
          orderBy: { timestamp: "asc" },
          select: { timestamp: true, speaker: true, text: true },
        },
        analysis: {
          select: {
            id: true,
            transcriptHash: true,
            summary: true,
            decisions: true,
            followUps: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundError("Meeting");
    }

    if (meeting.createdById !== authCtx.userId) {
      throw new ForbiddenError("You do not have access to this meeting");
    }

    if (meeting.transcriptSegments.length === 0) {
      throw new AppError(
        "This meeting has no transcript. Upload a transcript before analyzing.",
        422,
        "NO_TRANSCRIPT"
      );
    }

    // ── 3. Content-change gate (hash check) ─────────────────────────────
    // If transcript hasn't changed since last analysis, return cached result.
    // No Groq call, no DB writes — free response.
    const currentHash = hashTranscript(meeting.transcriptSegments);

    if (meeting.analysis?.transcriptHash === currentHash) {
      const existingActionItems = await prisma.actionItem.findMany({
        where: { meetingId },
        select: {
          id: true,
          assignee: true,
          task: true,
          speakerTimestamp: true,
          dueDate: true,
          status: true,
        },
        orderBy: { createdAt: "asc" },
      });

      return successResponse(
        {
          analysis: {
            id: meeting.analysis.id,
            meetingId,
            summary: meeting.analysis.summary,
            decisions: meeting.analysis.decisions,
            followUps: meeting.analysis.followUps,
            createdAt: meeting.analysis.createdAt,
            updatedAt: meeting.analysis.updatedAt,
          },
          actionItems: existingActionItems,
          meta: {
            transcriptSegmentsProcessed: meeting.transcriptSegments.length,
            actionItemsExtracted: existingActionItems.length,
            actionItemsDropped: 0,
            droppedReason: null,
            cached: true, // signals to caller that this came from cache
          },
        },
        traceId,
        200 // 200 not 201 — nothing was created
      );
    }

    // ── 4. Run AI analysis (Groq → Zod → Citation verifier) ─────────────
    const { parsed, droppedCount, validActionItemCount } =
      await runMeetingAnalysis(meeting.title, meeting.transcriptSegments);

    // ── 5. Upsert MeetingAnalysis ────────────────────────────────────────
    // MeetingAnalysis is always replaced — it's a pure snapshot.
    // transcriptHash stored so future calls can detect unchanged transcripts.
    await prisma.meetingAnalysis.upsert({
      where: { meetingId },
      update: {
        summary: parsed.summary,
        decisions: parsed.decisions,
        followUps: parsed.followUps,
        transcriptHash: currentHash,
      },
      create: {
        meetingId,
        summary: parsed.summary,
        decisions: parsed.decisions,
        followUps: parsed.followUps,
        transcriptHash: currentHash,
      },
    });

    const freshAnalysis = await prisma.meetingAnalysis.findUnique({
      where: { meetingId },
    });

    if (!freshAnalysis) {
      throw new InternalError("Failed to persist analysis — please retry");
    }

    // ── 6. Upsert ActionItems ────────────────────────────────────────────
    //
    // Match key: speakerTimestamp + assignee
    // - More stable than task text (Groq rephrases tasks between runs)
    // - If match found → update task/dueDate, PRESERVE status
    // - If no match → create new with PENDING status
    // - If old item no longer in AI output → delete it
    //   (but only if not IN_PROGRESS or COMPLETED — preserve user progress)
    //
    const existingItems = await prisma.actionItem.findMany({
      where: { meetingId },
    });

    const upsertedIds: string[] = [];

    for (const item of parsed.actionItems) {
      const existing = existingItems.find(
        (e) =>
          e.speakerTimestamp === item.speakerTimestamp &&
          e.assignee === item.assignee
      );

      if (existing) {
        // Match found — update task/dueDate but PRESERVE status
        const updated = await prisma.actionItem.update({
          where: { id: existing.id },
          data: {
            task: item.task,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            // status intentionally not touched — user may have progressed it
          },
          select: {
            id: true,
            assignee: true,
            task: true,
            speakerTimestamp: true,
            dueDate: true,
            status: true,
          },
        });
        upsertedIds.push(updated.id);
      } else {
        // No match — new action item from updated transcript
        const created = await prisma.actionItem.create({
          data: {
            meetingId,
            assignee: item.assignee,
            task: item.task,
            speakerTimestamp: item.speakerTimestamp,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            status: ActionItemStatus.PENDING,
          },
          select: {
            id: true,
            assignee: true,
            task: true,
            speakerTimestamp: true,
            dueDate: true,
            status: true,
          },
        });
        upsertedIds.push(created.id);
      }
    }

    // Delete action items no longer in AI output — but only PENDING ones.
    // IN_PROGRESS or COMPLETED items are preserved regardless — user worked on them.
    const staleIds = existingItems
      .filter((e) => !upsertedIds.includes(e.id))
      .filter((e) => e.status === ActionItemStatus.PENDING)
      .map((e) => e.id);

    if (staleIds.length > 0) {
      await prisma.actionItem.deleteMany({
        where: { id: { in: staleIds } },
      });
    }

    // Fetch final state of all action items for response
    const finalActionItems = await prisma.actionItem.findMany({
      where: { meetingId },
      select: {
        id: true,
        assignee: true,
        task: true,
        speakerTimestamp: true,
        dueDate: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    await invalidateUserReadCaches(authCtx.userId);

    // ── 7. Respond ───────────────────────────────────────────────────────
    return successResponse(
      {
        analysis: {
          id: freshAnalysis.id,
          meetingId,
          summary: freshAnalysis.summary,
          decisions: freshAnalysis.decisions,
          followUps: freshAnalysis.followUps,
          createdAt: freshAnalysis.createdAt,
          updatedAt: freshAnalysis.updatedAt,
        },
        actionItems: finalActionItems,
        meta: {
          transcriptSegmentsProcessed: meeting.transcriptSegments.length,
          actionItemsExtracted: validActionItemCount,
          actionItemsDropped: droppedCount,
          droppedReason:
            droppedCount > 0
              ? "Timestamps did not match any segment in the transcript (citation verification)"
              : null,
          cached: false,
        },
      },
      traceId,
      201
    );
  } catch (err) {
    return errorResponse(err, traceId);
  }
}

export const POST = withAuth(analyzeHandler);
