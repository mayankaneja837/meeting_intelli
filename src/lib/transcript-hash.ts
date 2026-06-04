import { createHash } from "crypto";
import type { TranscriptSegment } from "@/generated/prisma/client";

/**
 * Produces a stable SHA-256 hash of the transcript content.
 *
 * Hash input: ordered JSON array of { timestamp, speaker, text }
 * Ordered by timestamp ASC — same order we pass to Groq.
 *
 * Why SHA-256: deterministic, fast, collision-resistant enough for
 * a content-change gate. We don't need cryptographic security here,
 * just reliable change detection.
 */
export function hashTranscript(
  segments: Pick<TranscriptSegment, "timestamp" | "speaker" | "text">[]
): string {
  const ordered = [...segments].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  const content = JSON.stringify(
    ordered.map((s) => ({
      timestamp: s.timestamp,
      speaker: s.speaker,
      text: s.text,
    }))
  );

  return createHash("sha256").update(content).digest("hex");
}