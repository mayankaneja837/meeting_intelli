import type { TranscriptSegment } from "@/generated/prisma/client";
import { getGroqClient, GROQ_MODEL, GROQ_TEMPERATURE, GROQ_MAX_TOKENS } from "./groq";
import { AnalysisResponseSchema, type AnalysisResponse } from "./analysis-schema";
import { buildSystemPrompt, buildUserPrompt, buildTimestampSet } from "./prompt";
import { verifyCitations, type CitationVerificationResult } from "./citation-verifier";
import { AppError} from "@/types/errors";

export interface AnalysisServiceResult {
  parsed: AnalysisResponse;
  citations: CitationVerificationResult;
  droppedCount: number;
  validActionItemCount: number;
}

/**
 * Calls Groq, parses + validates the response with Zod,
 * then runs citation verification against the real transcript timestamps.
 *
 * Does NOT write to the DB — that's the route's job via $transaction.
 */
export async function runMeetingAnalysis(
  meetingTitle: string,
  segments: Pick<TranscriptSegment, "timestamp" | "speaker" | "text">[]
): Promise<AnalysisServiceResult> {
  if (segments.length === 0) {
    throw new AppError(
      "Cannot analyze a meeting with no transcript segments",
      422,
      "NO_TRANSCRIPT"
    );
  }

  const groq = getGroqClient();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(meetingTitle, segments);

  // ── Step 1: Call Groq, wait for full completion ──────────────────────────
  let rawContent: string;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: GROQ_TEMPERATURE,
      max_tokens: GROQ_MAX_TOKENS,
      response_format: { type: "json_object" }, // Force JSON mode
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    rawContent = completion.choices[0]?.message?.content ?? "";

    if (!rawContent) {
      throw new AppError(
        "Groq returned an empty response",
        502,
        "AI_EMPTY_RESPONSE"
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Groq API call failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      502,
      "AI_UNAVAILABLE"
    );
  }

  // ── Step 2: Parse JSON safely ────────────────────────────────────────────
  let rawJson: unknown;

  try {
    rawJson = JSON.parse(rawContent);
  } catch {
    throw new AppError(
      "Groq response was not valid JSON — cannot parse analysis",
      502,
      "AI_INVALID_JSON"
    );
  }

  // ── Step 3: Zod validation ───────────────────────────────────────────────
  const zodResult = AnalysisResponseSchema.safeParse(rawJson);

  if (!zodResult.success) {
    const issues = zodResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(" | ");
    throw new AppError(
      `Groq response failed schema validation: ${issues}`,
      502,
      "AI_SCHEMA_MISMATCH",
      zodResult.error.issues
    );
  }

  const parsed = zodResult.data;

  // ── Step 4: Citation verification ───────────────────────────────────────
  const timestampSet = buildTimestampSet(segments);
  const citations = verifyCitations(parsed.actionItems, timestampSet);

  if (citations.dropped.length > 0) {
    console.warn(
      `[Analysis] Citation verification dropped ${citations.dropped.length} action item(s):`,
      citations.dropped.map((d) => `"${d.actionItem.task}" — ${d.reason}`)
    );
  }

  // Replace actionItems in parsed with only the citation-verified ones
  parsed.actionItems = citations.valid;

  return {
    parsed,
    citations,
    droppedCount: citations.dropped.length,
    validActionItemCount: citations.valid.length,
  };
}