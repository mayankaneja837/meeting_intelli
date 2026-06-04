import type { ActionItemParsed } from "./analysis-schema";

export interface CitationVerificationResult {
  valid: ActionItemParsed[];
  dropped: Array<{
    actionItem: ActionItemParsed;
    reason: string;
  }>;
}

/**
 * Verifies each action item's speakerTimestamp exists in the real transcript.
 *
 * Why: Groq can hallucinate timestamps that don't exist in the actual transcript.
 * This verifier is the last line of defense — any action item whose timestamp
 * is not in the Set of real TranscriptSegment timestamps gets dropped, not stored.
 *
 * O(1) per lookup because we use a Set.
 */
export function verifyCitations(
  actionItems: ActionItemParsed[],
  validTimestamps: Set<string>
): CitationVerificationResult {
  const valid: ActionItemParsed[] = [];
  const dropped: CitationVerificationResult["dropped"] = [];

  for (const item of actionItems) {
    if (validTimestamps.has(item.speakerTimestamp)) {
      valid.push(item);
    } else {
      dropped.push({
        actionItem: item,
        reason: `Timestamp "${item.speakerTimestamp}" does not exist in the transcript. Possible hallucination — action item dropped.`,
      });
    }
  }

  return { valid, dropped };
}