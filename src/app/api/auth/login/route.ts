import { NextRequest } from "next/server";
import { z } from "zod";
import  prisma  from "../../../../../prisma/client"
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import { UnauthorizedError, ValidationError } from "@/types/errors";

const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const traceId = getTraceId(req);
  try {
    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      throw new ValidationError(message);
    }

    const { email, password } = parsed.data;

    // Fetch user — don't reveal which field is wrong
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signToken({sub:user.id,email:user.email});

    return successResponse(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      },
      traceId
    );
  } catch (err) {
    return errorResponse(err, traceId);
  }
}
