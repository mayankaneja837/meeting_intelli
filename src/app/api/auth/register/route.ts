import { NextRequest } from "next/server";
import { z } from "zod";
import  prisma  from "../../../../../prisma/client"
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { successResponse, errorResponse, getTraceId } from "@/lib/response";
import { ConflictError, ValidationError } from "@/types/errors";

const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export async function POST(req: NextRequest) {
  const traceId = getTraceId(req);
  try {
    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid JSON body");
    });

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      throw new ValidationError(message);
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = signToken({sub:user.id,email:user.email});

    return successResponse({ user, token }, traceId, 201);
  } catch (err) {
    return errorResponse(err, traceId);
  }
}
