import { z } from "zod";

// Timestamp must be HH:MM:SS — exact format stored in TranscriptSegment
const TimestampSchema = z
  .string()
  .regex(
    /^\d{2}:\d{2}:\d{2}$/,
    "Timestamp must be in HH:MM:SS format (e.g. 00:02:34)"
  );

export const ActionItemSchema = z.object({
  assignee: z
    .string()
    .min(1, "Assignee name cannot be empty")
    .describe("Full name or identifier of the person assigned this task"),

  task: z
    .string()
    .min(5, "Task description too short")
    .describe("Clear, specific description of what needs to be done"),

  speakerTimestamp: TimestampSchema.describe(
    "HH:MM:SS timestamp of the transcript segment where this action item was mentioned — must be an EXACT timestamp from the transcript"
  ),

  dueDate: z
    .string()
    .nullable()
    .describe(
      "ISO 8601 date string (YYYY-MM-DD) if a deadline was explicitly mentioned in the transcript, otherwise null — DO NOT invent a date"
    ),
});

export const AnalysisResponseSchema = z.object({
  summary: z
    .string()
    .min(20, "Summary too short")
    .describe("2-4 sentence factual summary of what was discussed"),

  decisions: z
    .array(z.string().min(5))
    .describe(
      "List of concrete agreements or conclusions reached during the meeting — things that were debated and settled"
    ),

  followUps: z
    .array(z.string().min(5))
    .describe(
      "Open questions or topics that need further discussion in a future meeting"
    ),

  actionItems: z
    .array(ActionItemSchema)
    .describe(
      "Specific tasks assigned to individuals, each grounded in an exact transcript timestamp"
    ),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type ActionItemParsed = z.infer<typeof ActionItemSchema>;