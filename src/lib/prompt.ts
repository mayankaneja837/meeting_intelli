import type { TranscriptSegment } from "@/generated/prisma/client";
import { AppError } from "@/types/errors";

/**
 * Builds the system prompt that instructs Groq exactly how to behave.
 * Strict JSON-only, no markdown, no preamble.
 */
export function buildSystemPrompt(today = new Date()): string {
  const todayLabel = today.toISOString().split("T")[0];

  return `You are a meeting intelligence assistant. Your job is to analyze meeting transcripts and extract structured information.

Today's date is ${todayLabel}.

You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no explanation, no preamble.
The JSON must conform exactly to this structure:

{
  "summary": [
    {
      "text": "string — a factual summary point",
      "citations": [{ "timestamp": "string — EXACT HH:MM:SS timestamp from the transcript supporting this point" }]
    }
  ],
  "decisions": [
    {
      "text": "string — a concrete agreement or conclusion reached",
      "citations": [{ "timestamp": "string — EXACT HH:MM:SS timestamp from the transcript supporting this decision" }]
    }
  ],
  "followUps": [
    {
      "text": "string — open question or topic needing future discussion",
      "citations": [{ "timestamp": "string — EXACT HH:MM:SS timestamp from the transcript supporting this follow-up" }]
    }
  ],
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
2. Every summary point, decision, and follow-up MUST include at least one citation timestamp copied EXACTLY from the transcript.
3. dueDate MUST be null unless a specific deadline was explicitly spoken in the transcript. Do not guess or assume dates.
4. Resolve explicit relative deadlines using today's date above. For example, "today", "by EOD", or "by 5 PM today" means today's date; "tomorrow" means the next calendar date. Return only YYYY-MM-DD, not a time.
5. decisions are things that were AGREED UPON — not tasks, not questions.
6. followUps are UNRESOLVED topics — questions or discussions deferred to a future meeting.
7. actionItems are ASSIGNED TASKS — work given to a specific person.
8. Extract both explicit assignments ("Alice, can you...") and implicit commitments ("I will...", "I can...", "I'll...") as action items when the speaker is a real person and the work is concrete.
9. If one transcript line contains multiple concrete commitments, extract each commitment as a separate action item with the same speakerTimestamp.
10. Only include action items where a real person is clearly assigned. Ignore vague or unassigned tasks.
11. Return an empty array [] if there are no decisions, followUps, or actionItems — never omit the field.
12. If there are no action items in the transcript, return "actionItems": [] — do not invent tasks.`;
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
- every generated summary point, decision, and follow-up must include citation timestamps copied from the transcript.
- Extract implicit commitments such as "I will run a smoke test" as action items.
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
