import { describe, expect, test } from "bun:test";
import { verifyAnalysisCitations } from "../citation-verifier";

describe("verifyAnalysisCitations", () => {
  test("keeps generated insights whose citation timestamps exist in the transcript", () => {
    const result = verifyAnalysisCitations(
      {
        summary: [
          {
            text: "The team agreed on launch preparation.",
            citations: [{ timestamp: "00:00:10" }],
          },
        ],
        decisions: [
          {
            text: "The launch will happen next Friday.",
            citations: [{ timestamp: "00:00:10" }],
          },
        ],
        followUps: [],
        actionItems: [
          {
            assignee: "Alice",
            task: "Prepare release notes",
            speakerTimestamp: "00:00:20",
            dueDate: null,
          },
        ],
      },
      new Set(["00:00:10", "00:00:20"])
    );

    expect(result.parsed.summary).toHaveLength(1);
    expect(result.parsed.decisions).toHaveLength(1);
    expect(result.parsed.actionItems).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
  });

  test("drops action items with hallucinated timestamps", () => {
    const result = verifyAnalysisCitations(
      {
        summary: [
          {
            text: "The team discussed release readiness.",
            citations: [{ timestamp: "00:00:20" }],
          },
        ],
        decisions: [],
        followUps: [],
        actionItems: [
          {
            assignee: "Alice",
            task: "Prepare release notes",
            speakerTimestamp: "00:09:99",
            dueDate: null,
          },
        ],
      },
      new Set(["00:00:20"])
    );

    expect(result.parsed.actionItems).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0].reason).toContain("does not exist");
  });

  test("drops summary, decisions, and follow-ups with hallucinated citations", () => {
    const result = verifyAnalysisCitations(
      {
        summary: [
          {
            text: "The team discussed release readiness.",
            citations: [{ timestamp: "00:00:20" }],
          },
        ],
        decisions: [
          {
            text: "The launch date is final.",
            citations: [{ timestamp: "00:09:99" }],
          },
        ],
        followUps: [
          {
            text: "Review unresolved launch risks.",
            citations: [{ timestamp: "00:08:88" }],
          },
        ],
        actionItems: [
          {
            assignee: "Alice",
            task: "Prepare release notes",
            speakerTimestamp: "00:00:20",
            dueDate: null,
          },
        ],
      },
      new Set(["00:00:20"])
    );

    expect(result.parsed.summary).toHaveLength(1);
    expect(result.parsed.decisions).toHaveLength(0);
    expect(result.parsed.followUps).toHaveLength(0);
    expect(result.parsed.actionItems).toHaveLength(1);
    expect(result.dropped).toHaveLength(2);
  });
});
