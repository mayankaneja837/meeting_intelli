import { NextRequest, NextResponse } from "next/server";
import { TRACE_ID_HEADER } from "@/lib/response";

export function proxy(request: NextRequest) {
  const traceId = crypto.randomUUID();

  // Clone request headers so we can forward traceId to the route handler
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TRACE_ID_HEADER, traceId);

  // For protected routes, P4 will add JWT verification here and set USER_ID_HEADER.
  // Stub comment left intentionally so P4 has a clear injection point.

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Echo traceId back on every response
  response.headers.set(TRACE_ID_HEADER, traceId);

  return response;
}

export const config = {
  matcher: [
    // Apply to all /api routes, skip Next.js internals and static files
    "/api/:path*",
  ],
};
