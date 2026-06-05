import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import type { AuthContext } from "@/types/auth";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import { cacheKeys, getCachedData, setCachedData } from "@/lib/cache";
import { ValidationError } from "@/types/errors";
import prisma from "../../../../prisma/client";
import { ActionItemStatus } from "@/generated/prisma/client";

// GET /api/action-items
// Query params:
//   status=PENDING|IN_PROGRESS|COMPLETED  (optional, filter by status)
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
        },
        ...(statusFilter ? { status: statusFilter } : {}),
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
