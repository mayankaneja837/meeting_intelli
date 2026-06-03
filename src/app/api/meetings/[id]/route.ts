import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import { getTraceId, successResponse, errorResponse } from "@/lib/response";
import { getMeetingById, updateMeeting, deleteMeeting } from "@/lib/meetings";
import { UpdateMeetingSchema } from "@/types/meetings";
import { NotFoundError, ValidationError } from "@/types/errors";
import type { AuthContext } from "@/types/auth";

// ─── GET /api/meetings/[id] ───────────────────────────────────────────────────

export const GET = withAuth(
  async (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) => {
    const traceId = getTraceId(req);
    try {
      const id = params?.id;
      if (!id) throw new ValidationError("Meeting ID is required");

      const meeting = await getMeetingById(id, ctx.userId);
      if (!meeting) throw new NotFoundError("Meeting");

      return successResponse(meeting, traceId);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);

// ─── PATCH /api/meetings/[id] ─────────────────────────────────────────────────

export const PATCH = withAuth(
  async (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) => {
    const traceId = getTraceId(req);
    try {
      const id = params?.id;
      if (!id) throw new ValidationError("Meeting ID is required");

      const body = await req.json().catch(() => {
        throw new ValidationError("Invalid JSON body");
      });

      const parsed = UpdateMeetingSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
      }

      const meeting = await updateMeeting(id, ctx.userId, parsed.data);
      if (!meeting) throw new NotFoundError("Meeting");

      return successResponse(meeting, traceId);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);

// ─── DELETE /api/meetings/[id] ────────────────────────────────────────────────

export const DELETE = withAuth(
  async (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) => {
    const traceId = getTraceId(req);
    try {
      const id = params?.id;
      if (!id) throw new ValidationError("Meeting ID is required");

      const deleted = await deleteMeeting(id, ctx.userId);
      if (!deleted) throw new NotFoundError("Meeting");

      return successResponse({ id, deleted: true }, traceId);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);