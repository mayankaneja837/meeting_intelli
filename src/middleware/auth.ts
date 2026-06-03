import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/jwt";
import { errorResponse, getTraceId, USER_ID_HEADER } from "@/lib/response";
import type { AuthContext } from "@/types/auth";

export type AuthedHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

export function withAuth(handler: AuthedHandler) {
  return async (
    req: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {}
  ): Promise<NextResponse> => {
    const traceId = getTraceId(req);
    try {
      const token = extractBearerToken(req.headers.get("Authorization"));
      const payload = verifyToken(token);
      const authCtx: AuthContext = {
        userId: payload.sub,
      };

      // Await params — Next.js 15 passes dynamic route params as a Promise
      const resolvedParams = params ? await params : undefined;

      // Inject userId into headers for downstream handlers
      const mutatedHeaders = new Headers(req.headers);
      mutatedHeaders.set(USER_ID_HEADER, authCtx.userId);

      const mutatedReq = new NextRequest(req.url, {
        method: req.method,
        headers: mutatedHeaders,
        body: req.body,
      });

      return handler(mutatedReq, authCtx, resolvedParams);
    } catch (err) {
      return errorResponse(err, traceId);
    }
  };
}