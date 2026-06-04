import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import type { AuthContext } from "@/types/auth";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import { ValidationError } from "@/types/errors";
import prisma from "../../../../../prisma/client";
import { ActionItemStatus } from "@/generated/prisma/client";

// GET /api/action-items/overdue
export const GET = withAuth(async (req: NextRequest, auth: AuthContext) => {
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit");

    const limit = Math.min(limitParam ? parseInt(limitParam, 10) : 20, 100);
    if (isNaN(limit) || limit < 1) {
      throw new ValidationError("limit must be a positive integer");
    }

    const asOf = new Date();
    const items = await prisma.actionItem.findMany({
      where: {
        dueDate: { lt: asOf },
        status: { not: ActionItemStatus.COMPLETED },
        meeting: {
          createdById: auth.userId,
        },
      },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        meetingId: true,
        task: true,
        assignee: true,
        speakerTimestamp: true,
        dueDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        meeting: {
          select: {
            id: true,
            title: true,
            meetingDate: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    const data = items.map((item) => ({
      ...item,
      daysOverdue: item.dueDate
        ? Math.floor((asOf.getTime() - item.dueDate.getTime()) / 86_400_000)
        : null,
    }));

    return successResponse(
      {
        items: data,
        nextCursor,
        asOf: asOf.toISOString(),
      },
      traceId
    );
  } catch (err) {
    return errorResponse(err, traceId);
  }
})