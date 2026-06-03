import { NextResponse } from "next/server";
import { AppError } from "@/types/errors";
import type { ApiSuccess, ApiError } from "@/types/api";

// ---------------------------------------------------------------------------
// Header key constants — single source of truth used by middleware + helpers
// ---------------------------------------------------------------------------
export const TRACE_ID_HEADER = "x-trace-id";
export const USER_ID_HEADER = "x-user-id";

// ---------------------------------------------------------------------------
// Success response
// ---------------------------------------------------------------------------
export function successResponse<T>(
  data: T,
  traceId: string,
  status = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true, data, traceId },
    {
      status,
      headers: { [TRACE_ID_HEADER]: traceId },
    }
  );
}

// ---------------------------------------------------------------------------
// Error response
// ---------------------------------------------------------------------------
export function errorResponse(
  err: unknown,
  traceId: string
): NextResponse<ApiError> {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined && { details: err.details }),
        },
        traceId,
      },
      {
        status: err.statusCode,
        headers: { [TRACE_ID_HEADER]: traceId },
      }
    );
  }

  // Unexpected / unhandled errors — don't leak internals
  console.error(`[${traceId}] Unhandled error:`, err);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      traceId,
    },
    {
      status: 500,
      headers: { [TRACE_ID_HEADER]: traceId },
    }
  );
}

// ---------------------------------------------------------------------------
// Helper to extract traceId from incoming request headers inside route handlers
// ---------------------------------------------------------------------------
export function getTraceId(request: Request): string {
  return (
    request.headers.get(TRACE_ID_HEADER) ??
    crypto.randomUUID() // fallback — should never happen if middleware is wired
  );
}