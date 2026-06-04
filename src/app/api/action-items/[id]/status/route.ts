import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import type { AuthContext } from "@/types/auth";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import { NotFoundError, ValidationError } from "@/types/errors";
import prisma from "../../../../../../prisma/client";
import { ActionItemStatus } from "@/generated/prisma/client";
import { z } from "zod";

const VALID_TRANSITIONS: Record<ActionItemStatus, ActionItemStatus[]> = {
  [ActionItemStatus.PENDING]: [ActionItemStatus.IN_PROGRESS],
  [ActionItemStatus.IN_PROGRESS]: [
    ActionItemStatus.COMPLETED,
    ActionItemStatus.PENDING, // allow reverting
  ],
  [ActionItemStatus.COMPLETED]: [ActionItemStatus.IN_PROGRESS], // allow reopening
};

const patchSchema = z
  .object({
    status: z.enum(ActionItemStatus),
  })
  .strict();

// PATCH /api/action-items/[id]
// Body: { status: "PENDING" | "IN_PROGRESS" | "COMPLETED" }
// Enforces valid status transitions and ownership
export const PATCH = withAuth(
  async (
    req: NextRequest,
    auth: AuthContext,
    params?: Record<string, string>
  ) => {
    const traceId = getTraceId(req);

    try {
      const id = params?.id;
      if (!id) {
        throw new ValidationError("Action item ID is required");
      }

      // --- parse body ---
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ValidationError("Request body must be valid JSON");
      }

      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((e) => e.message).join(", ")
        );
      }

      const { status: newStatus } = parsed.data;

      // --- fetch action item with ownership check ---
      const actionItem = await prisma.actionItem.findFirst({
        where: {
          id,
          meeting: {
            createdById: auth.userId,
          },
        },
        select: {
          id: true,
          status: true,
          task: true,
          assignee: true,
          dueDate: true,
          speakerTimestamp: true,
          meetingId: true,
        },
      });

      if (!actionItem) {
        throw new NotFoundError("Action item not found");
      }

      // --- validate transition ---
      const allowedNext = VALID_TRANSITIONS[actionItem.status];
      if (!allowedNext.includes(newStatus)) {
        throw new ValidationError(
          `Cannot transition from ${actionItem.status} to ${newStatus}. ` +
            `Allowed transitions: ${allowedNext.join(", ")}`
        );
      }

      // --- perform update ---
      const updated = await prisma.actionItem.update({
        where: { id },
        data: { status: newStatus },
        select: {
          id: true,
          task: true,
          assignee: true,
          dueDate: true,
          status: true,
          speakerTimestamp: true,
          meetingId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return successResponse(updated, traceId);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);
