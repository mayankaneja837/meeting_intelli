import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import { getTraceId, successResponse, errorResponse } from "@/lib/response";
import { createMeeting, listMeetings } from "@/lib/meetings";
import { CreateMeetingSchema, ListMeetingsQuerySchema } from "@/types/meetings";
import { ValidationError } from "@/types/errors";
import type { AuthContext } from "@/types/auth";
import type { PaginatedData } from "@/types/api";

// ─── POST /api/meetings ───────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const traceId = getTraceId(req);
  try {
    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });

    const parsed = CreateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const meeting = await createMeeting(ctx.userId, parsed.data);
    return successResponse(meeting, traceId, 201);
  } catch (err) {
    return errorResponse(err, traceId);
  }
});

// ─── GET /api/meetings ────────────────────────────────────────────────────────

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const traceId = getTraceId(req);
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

    const parsed = ListMeetingsQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { items, nextCursor } = await listMeetings(ctx.userId, parsed.data);

    const data: PaginatedData<(typeof items)[number]> = {
        items, nextCursor,
    };
    return successResponse(data, traceId);
  } catch (err) {
    return errorResponse(err, traceId);
  }
});