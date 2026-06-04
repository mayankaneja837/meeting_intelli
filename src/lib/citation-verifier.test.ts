import { describe, expect, test } from "bun:test";
import { verifyCitations } from "./citation-verifier";

describe("verifyCitations", () => {
  test("keeps action items whose timestamp exists in the transcript", () => {
    const result = verifyCitations(
      [
        {
          assignee: "Alice",
          task: "Prepare release notes",
          speakerTimestamp: "00:00:20",
          dueDate: null,
        },
      ],
      new Set(["00:00:20"])
    );

    expect(result.valid).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
  });

  test("drops action items with hallucinated timestamps", () => {
    const result = verifyCitations(
      [
        {
          assignee: "Alice",
          task: "Prepare release notes",
          speakerTimestamp: "00:09:99",
          dueDate: null,
        },
      ],
      new Set(["00:00:20"])
    );

    expect(result.valid).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0].reason).toContain("does not exist");
  });
});
