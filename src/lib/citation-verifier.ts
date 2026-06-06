import type {
  ActionItemParsed,
  AnalysisResponse,
  CitedInsightParsed,
} from "./analysis-schema";

export interface CitationVerificationResult {
  parsed: AnalysisResponse;
  dropped: Array<{
    field: "summary" | "decisions" | "followUps" | "actionItems";
    text: string;
    reason: string;
  }>;
}

/**
 * Verifies every generated citation timestamp exists in the real transcript.
 *
 * Why: Groq can hallucinate timestamps that do not exist in the actual transcript.
 * This verifier is the last line of defense: unsupported summary points,
 * decisions, follow-ups, and action items are dropped before persistence.
 * Action items keep their original contract and are verified by speakerTimestamp.
 *
 * O(1) per lookup because we use a Set.
 */
export function verifyAnalysisCitations(
  parsed: AnalysisResponse,
  validTimestamps: Set<string>
): CitationVerificationResult {
  const dropped: CitationVerificationResult["dropped"] = [];

  function keepCitedInsight(
    field: "summary" | "decisions" | "followUps",
    insight: CitedInsightParsed
  ) {
    const invalidTimestamp = insight.citations.find(
      (citation) => !validTimestamps.has(citation.timestamp)
    )?.timestamp;

    if (invalidTimestamp) {
      dropped.push({
        field,
        text: insight.text,
        reason: `Timestamp "${invalidTimestamp}" does not exist in the transcript. Possible hallucination — insight dropped.`,
      });
      return false;
    }

    return true;
  }

  function keepActionItem(item: ActionItemParsed) {
    if (!validTimestamps.has(item.speakerTimestamp)) {
      dropped.push({
        field: "actionItems",
        text: item.task,
        reason: `Timestamp "${item.speakerTimestamp}" does not exist in the transcript. Possible hallucination — action item dropped.`,
      });
      return false;
    }

    return true;
  }

  return {
    parsed: {
      summary: parsed.summary.filter((insight) =>
        keepCitedInsight("summary", insight)
      ),
      decisions: parsed.decisions.filter((insight) =>
        keepCitedInsight("decisions", insight)
      ),
      followUps: parsed.followUps.filter((insight) =>
        keepCitedInsight("followUps", insight)
      ),
      actionItems: parsed.actionItems.filter(keepActionItem),
    },
    dropped,
  };
}
