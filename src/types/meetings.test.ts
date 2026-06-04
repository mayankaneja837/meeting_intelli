import { describe, expect, test } from "bun:test";
import {
  CreateMeetingSchema,
  ListMeetingsQuerySchema,
  UpdateMeetingSchema,
  UploadTranscriptSchema,
} from "./meetings";

describe("meeting validation schemas", () => {
  test("validates a minimal create meeting payload and defaults participants", () => {
    const parsed = CreateMeetingSchema.parse({
      title: "Sprint Planning",
      meetingDate: "2026-06-05T10:00:00Z",
    });

    expect(parsed.participants).toEqual([]);
  });

  test("rejects invalid meeting dates", () => {
    const parsed = CreateMeetingSchema.safeParse({
      title: "Sprint Planning",
      meetingDate: "tomorrow",
    });

    expect(parsed.success).toBe(false);
  });

  test("requires at least one update field", () => {
    const parsed = UpdateMeetingSchema.safeParse({});

    expect(parsed.success).toBe(false);
  });

  test("clamps list meeting limit to the supported range", () => {
    const parsed = ListMeetingsQuerySchema.parse({ limit: "500" });

    expect(parsed.limit).toBe(100);
  });

  test("requires at least one transcript segment", () => {
    const parsed = UploadTranscriptSchema.safeParse({ segments: [] });

    expect(parsed.success).toBe(false);
  });
});
