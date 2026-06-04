import { describe, expect, test } from "bun:test";
import { hashTranscript } from "./transcript-hash";

describe("hashTranscript", () => {
  test("returns the same hash for the same transcript regardless of input order", () => {
    const first = hashTranscript([
      { timestamp: "00:00:20", speaker: "Alice", text: "I will write notes." },
      { timestamp: "00:00:10", speaker: "Bob", text: "Launch is Friday." },
    ]);

    const second = hashTranscript([
      { timestamp: "00:00:10", speaker: "Bob", text: "Launch is Friday." },
      { timestamp: "00:00:20", speaker: "Alice", text: "I will write notes." },
    ]);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test("changes when transcript content changes", () => {
    const original = hashTranscript([
      { timestamp: "00:00:10", speaker: "Bob", text: "Launch is Friday." },
    ]);

    const changed = hashTranscript([
      { timestamp: "00:00:10", speaker: "Bob", text: "Launch is Monday." },
    ]);

    expect(changed).not.toBe(original);
  });
});
