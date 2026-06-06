import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import type { AuthContext } from "@/types/auth";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import {
  cacheKeys,
  getCachedData,
  invalidateActionItemCaches,
  setCachedData,
} from "@/lib/cache";
import { NotFoundError, ValidationError } from "@/types/errors";
import prisma from "../../../../prisma/client";
import { ActionItemStatus } from "@/generated/prisma/client";
import { z } from "zod";

const createActionItemSchema = z.object({
  meetingId: z.string().min(1, "meetingId is required"),
  task: z.string().min(1, "task is required").max(1000),
  assignee: z.string().min(1, "assignee is required").max(255),
  speakerTimestamp: z.string().min(1, "speakerTimestamp is required"),
  dueDate: z
    .string()
    .datetime({ message: "dueDate must be a valid ISO 8601 datetime" })
    .nullable()
    .optional(),
});

// POST /api/action-items
// Body: { meetingId, task, assignee, speakerTimestamp, dueDate? }
export const POST = withAuth(
  async (req: NextRequest, auth: AuthContext) => {
    const traceId = getTraceId(req);

    try {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ValidationError("Request body must be valid JSON");
      }

      const parsed = createActionItemSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((issue) => issue.message).join(", ")
        );
      }

      const { meetingId, task, assignee, speakerTimestamp, dueDate } =
        parsed.data;

      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, createdById: auth.userId },
        select: {
          id: true,
          transcriptSegments: {
            where: { timestamp: speakerTimestamp },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!meeting) {
        throw new NotFoundError("Meeting");
      }

      if (meeting.transcriptSegments.length === 0) {
        throw new ValidationError(
          "speakerTimestamp must match an existing transcript segment timestamp"
        );
      }

      const actionItem = await prisma.actionItem.create({
        data: {
          meetingId,
          task,
          assignee,
          speakerTimestamp,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: ActionItemStatus.PENDING,
        },
        select: {
          id: true,
          task: true,
          assignee: true,
          dueDate: true,
          status: true,
          speakerTimestamp: true,
          createdAt: true,
          updatedAt: true,
          meetingId: true,
        },
      });

      await invalidateActionItemCaches(auth.userId);

      return successResponse(actionItem, traceId, 201);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);

// GET /api/action-items
// Query params:
//   status=PENDING|IN_PROGRESS|COMPLETED  (optional, filter by status)
//   assignee=<name>                      (optional, filter by assignee)
//   meetingId=<id>                       (optional, filter by meeting)
//   overdue=true                        (optional, filter to overdue items only)
//   cursor=<id>                         (optional, pagination cursor)
//   limit=<number>                      (optional, default 20, max 100)
export const GET = withAuth(
  async (req: NextRequest, auth: AuthContext) => {
    const traceId = getTraceId(req);

    try {
      const { searchParams } = new URL(req.url);

      // --- parse & validate query params ---
      const statusParam = searchParams.get("status");
      const assigneeParam = searchParams.get("assignee");
      const meetingIdParam = searchParams.get("meetingId");
      const overdueParam = searchParams.get("overdue");
      const cursor = searchParams.get("cursor") ?? undefined;
      const limitParam = searchParams.get("limit");

      const limit = Math.min(
        limitParam ? parseInt(limitParam, 10) : 20,
        100
      );

      if (isNaN(limit) || limit < 1) {
        throw new ValidationError("limit must be a positive integer");
      }

      // Validate status filter
      let statusFilter: ActionItemStatus | undefined;
      if (statusParam) {
        const validStatuses: ActionItemStatus[] = [
          ActionItemStatus.PENDING,
          ActionItemStatus.IN_PROGRESS,
          ActionItemStatus.COMPLETED,
        ];
        if (!validStatuses.includes(statusParam as ActionItemStatus)) {
          throw new ValidationError(
            `status must be one of: ${validStatuses.join(", ")}`
          );
        }
        statusFilter = statusParam as ActionItemStatus;
      }

      const overdueOnly = overdueParam === "true";
      const cacheKey = cacheKeys.actionItems(
        auth.userId,
        searchParams.toString()
      );
      const cached = await getCachedData<{
        items: unknown[];
        nextCursor: string | null;
      }>(cacheKey);

      if (cached) {
        return successResponse(cached, traceId);
      }

      // --- build where clause ---
      const where = {
        meeting: {
          createdById: auth.userId,
          ...(meetingIdParam ? { id: meetingIdParam } : {}),
        },
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(assigneeParam ? { assignee: assigneeParam } : {}),
        ...(overdueOnly
          ? {
              dueDate: { lt: new Date() },
              status: { not: ActionItemStatus.COMPLETED },
            }
          : {}),
      };

      // --- paginated fetch (cursor-based) ---
      const items = await prisma.actionItem.findMany({
        where,
        take: limit + 1, // fetch one extra to determine if there's a next page
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1, // skip the cursor item itself
            }
          : {}),
        orderBy: [
          { dueDate: "asc" },   // soonest due first (nulls last via Prisma default)
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          task: true,
          assignee: true,
          dueDate: true,
          status: true,
          speakerTimestamp: true,
          createdAt: true,
          updatedAt: true,
          meetingId: true,
          meeting: {
            select: {
              id: true,
              title: true,
              meetingDate: true,
            },
          },
        },
      });

      // --- determine next cursor ---
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const nextItem = items.pop(); // remove the extra item
        nextCursor = nextItem!.id;
      }

      const data = {
        items,
        nextCursor,
      };

      await setCachedData(cacheKey, data);

      return successResponse(data, traceId);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);
