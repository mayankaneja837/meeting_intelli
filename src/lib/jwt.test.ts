import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { UnauthorizedError } from "@/types/errors";
import { extractBearerToken, signToken, verifyToken } from "./jwt";

const originalJwtSecret = process.env.JWT_SECRET;

describe("jwt helpers", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "unit-test-secret";
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  test("signs and verifies a JWT payload", () => {
    const token = signToken({ sub: "user_123", email: "user@example.com" });
    const payload = verifyToken(token);

    expect(payload.sub).toBe("user_123");
    expect(payload.email).toBe("user@example.com");
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
  });

  test("rejects invalid JWTs as unauthorized", () => {
    expect(() => verifyToken("not-a-real-token")).toThrow(UnauthorizedError);
  });

  test("extracts bearer tokens from authorization headers", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  test("rejects missing, malformed, and empty bearer tokens", () => {
    expect(() => extractBearerToken(null)).toThrow(UnauthorizedError);
    expect(() => extractBearerToken("Basic abc")).toThrow(UnauthorizedError);
    expect(() => extractBearerToken("Bearer   ")).toThrow(UnauthorizedError);
  });
});
