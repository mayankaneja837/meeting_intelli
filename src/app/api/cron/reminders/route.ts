import { NextRequest } from "next/server";
import prisma from "../../../../../prisma/client";
import { sendReminderEmail } from "@/lib/resend";
import { errorResponse, getTraceId, successResponse } from "@/lib/response";
import { ActionItemStatus, ReminderStatus } from "@/generated/prisma/client";
import { UnauthorizedError } from "@/types/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_PROVIDER = "resend";

function verifyCronRequest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw new UnauthorizedError("Invalid cron authorization");
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown reminder error";
}

// GET /api/cron/reminders
// Vercel Cron calls this route daily to notify meeting owners about overdue action items.
export async function GET(req: NextRequest) {
  const traceId = getTraceId(req);

  try {
    verifyCronRequest(req);

    const asOf = new Date();
    const overdueItems = await prisma.actionItem.findMany({
      where: {
        dueDate: { lt: asOf },
        status: { not: ActionItemStatus.COMPLETED },
        reminderHistory: {
          none: {
            status: ReminderStatus.SENT,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        task: true,
        assignee: true,
        status: true,
        dueDate: true,
        meeting: {
          select: {
            title: true,
            createdById: true,
            createdBy: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;
    const failures: Array<{ actionItemId: string; message: string }> = [];
    const ownerCounts = new Map<
      string,
      { processed: number; sent: number; failed: number }
    >();

    for (const item of overdueItems) {
      const ownerId = item.meeting.createdById;
      const ownerCount = ownerCounts.get(ownerId) ?? {
        processed: 0,
        sent: 0,
        failed: 0,
      };
      ownerCount.processed += 1;

      try {
        await sendReminderEmail({
          to: item.meeting.createdBy.email,
          task: item.task,
          assignee: item.assignee,
          status: item.status,
          meetingTitle: item.meeting.title,
          dueDate: item.dueDate,
        });

        await prisma.reminderHistory.create({
          data: {
            actionItemId: item.id,
            provider: REMINDER_PROVIDER,
            status: ReminderStatus.SENT,
          },
        });

        sent += 1;
        ownerCount.sent += 1;
      } catch (error) {
        const message = getErrorMessage(error);

        await prisma.reminderHistory.create({
          data: {
            actionItemId: item.id,
            provider: REMINDER_PROVIDER,
            status: ReminderStatus.FAILED,
            errorMessage: message,
          },
        });

        failures.push({ actionItemId: item.id, message });
        failed += 1;
        ownerCount.failed += 1;
      }

      ownerCounts.set(ownerId, ownerCount);
    }

    return successResponse(
      {
        asOf: asOf.toISOString(),
        processed: overdueItems.length,
        sent,
        failed,
        ownersProcessed: ownerCounts.size,
        ownerCounts: Object.fromEntries(ownerCounts),
        failures,
      },
      traceId
    );
  } catch (error) {
    return errorResponse(error, traceId);
  }
}
