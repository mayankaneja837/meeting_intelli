import type { TranscriptSegment } from "@/generated/prisma/client";
import { AppError } from "@/types/errors";

/**
 * Builds the system prompt that instructs Groq exactly how to behave.
 * Strict JSON-only, no markdown, no preamble.
 */
export function buildSystemPrompt(): string {
  return `You are a meeting intelligence assistant. Your job is to analyze meeting transcripts and extract structured information.

You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no explanation, no preamble.
The JSON must conform exactly to this structure:

{
  "summary": "string — 2 to 4 sentences summarizing what was discussed",
  "decisions": ["string — a concrete agreement or conclusion reached", ...],
  "followUps": ["string — open question or topic needing future discussion", ...],
  "actionItems": [
    {
      "assignee": "string — name of the person assigned the task",
      "task": "string — specific, actionable description of what they must do",
      "speakerTimestamp": "string — EXACT HH:MM:SS timestamp from the transcript where this was mentioned",
      "dueDate": "string (YYYY-MM-DD) | null — only if an explicit deadline was stated in the transcript, otherwise null"
    }
  ]
}

CRITICAL RULES:
1. speakerTimestamp MUST be copied EXACTLY from the transcript (format: HH:MM:SS). Do not invent or approximate timestamps.
2. dueDate MUST be null unless a specific deadline was explicitly spoken in the transcript. Do not guess or assume dates.
3. decisions are things that were AGREED UPON — not tasks, not questions.
4. followUps are UNRESOLVED topics — questions or discussions deferred to a future meeting.
5. actionItems are ASSIGNED TASKS — work given to a specific person.
6. Only include action items where a real person is clearly assigned. Ignore vague or unassigned tasks.
7. Return an empty array [] if there are no items for a field — never omit the field.
8. If there are no action items in the transcript, return "actionItems": [] — do not invent tasks.`;
}

/**
 * Builds the user prompt with the formatted transcript.
 * Each segment becomes: [HH:MM:SS] Speaker: "text"
 */
export function buildUserPrompt(
  meetingTitle: string,
  segments: Pick<TranscriptSegment, "timestamp" | "speaker" | "text">[]
): string {
  if (segments.length === 0) {
    throw new AppError(
      "Cannot build prompt from an empty transcript",
      422,
      "NO_TRANSCRIPT"
    );
  }

  const formattedTranscript = segments
    .map((s) => `[${s.timestamp}] ${s.speaker}: "${s.text}"`)
    .join("\n");

  return `Analyze the following meeting transcript and return the structured JSON.

Meeting Title: ${meetingTitle}

TRANSCRIPT:
${formattedTranscript}

Remember:
- speakerTimestamp values must be EXACT timestamps copied from the transcript above (HH:MM:SS format).
- If no action items exist in the transcript, return "actionItems": [].
- dueDate must be null unless a deadline was explicitly mentioned.`;
}

/**
 * Builds a Set of all valid timestamps from the transcript.
 * Used by the citation verifier for O(1) lookup.
 */
export function buildTimestampSet(
  segments: Pick<TranscriptSegment, "timestamp">[]
): Set<string> {
  return new Set(segments.map((s) => s.timestamp));
}