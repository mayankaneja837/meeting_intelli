import { NextRequest } from "next/server";
import { withAuth } from "@/middleware/auth";
import { getTraceId, successResponse, errorResponse } from "@/lib/response";
import { upsertTranscriptSegments } from "@/lib/meetings";
import { invalidateMeetingCaches } from "@/lib/cache";
import { UploadTranscriptSchema } from "@/types/meetings";
import { NotFoundError, ValidationError } from "@/types/errors";
import type { AuthContext } from "@/types/auth";

// ─── POST /api/meetings/[id]/transcript ──────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, ctx: AuthContext, params?: Record<string, string>) => {
    const traceId = getTraceId(req);
    try {
      const id = params?.id;
      if (!id) throw new ValidationError("Meeting ID is required");

      const body = await req.json().catch(() => {
        throw new ValidationError("Invalid JSON body");
      });

      const parsed = UploadTranscriptSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0].message);
      }

      const result = await upsertTranscriptSegments(id, ctx.userId, parsed.data.segments);
      if (!result) throw new NotFoundError("Meeting");

      await invalidateMeetingCaches(ctx.userId);

      return successResponse(
        {
          meetingId: id,
          inserted: result.inserted,
          message: `${result.inserted} segment(s) processed successfully`,
        },
        traceId,
        201
      );
    } catch (err) {
      return errorResponse(err, traceId);
    }
  }
);
