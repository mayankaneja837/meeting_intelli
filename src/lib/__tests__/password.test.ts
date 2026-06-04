import { describe, expect, test } from "bun:test";
import { comparePassword, hashPassword } from "../password";

describe("password helpers", () => {
  test("hashes and verifies passwords", async () => {
    const hashed = await hashPassword("correct horse battery staple");

    expect(hashed).not.toBe("correct horse battery staple");
    expect(await comparePassword("correct horse battery staple", hashed)).toBe(true);
    expect(await comparePassword("wrong password", hashed)).toBe(false);
  });
});
