import { NextRequest } from "next/server";
import  prisma  from "../../../../../prisma/client"
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import { withAuth } from "@/middleware/auth";
import { NotFoundError } from "@/types/errors";
import type { AuthContext } from "@/types/auth";

const handler = async (req: NextRequest, auth: AuthContext) => {
  const traceId = getTraceId(req);
  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { meetings: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        meetingCount: user._count.meetings,
      },
      traceId
    );
  } catch (err) {
    return errorResponse(err, traceId);
  }
};

export const GET = withAuth(handler);