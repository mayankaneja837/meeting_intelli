import { describe, expect, test } from "bun:test";
import { buildSystemPrompt, buildUserPrompt } from "../prompt";

describe("analysis prompts", () => {
  test("injects today's date so relative due dates can be resolved", () => {
    const prompt = buildSystemPrompt(new Date("2026-06-05T09:00:00.000Z"));

    expect(prompt).toContain("Today's date is 2026-06-05.");
    expect(prompt).toContain('"tomorrow" means the next calendar date');
  });

  test("instructs the model to extract implicit commitments as action items", () => {
    const systemPrompt = buildSystemPrompt(new Date("2026-06-05T09:00:00.000Z"));
    const userPrompt = buildUserPrompt("Deployment Review", [
      {
        timestamp: "00:03:20",
        speaker: "Bob",
        text: "Once I have access I can push the final config and run a smoke test before EOD.",
      },
    ]);

    expect(systemPrompt).toContain("implicit commitments");
    expect(systemPrompt).toContain('"I will..."');
    expect(systemPrompt).toContain("multiple concrete commitments");
    expect(userPrompt).toContain("Extract implicit commitments");
  });
});

