import { z } from "zod";

// ─── Create Meeting ───────────────────────────────────────────────────────────

export const CreateMeetingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  meetingDate: z
    .string({message: "meetingDate is required" })
    .datetime({ message: "meetingDate must be a valid ISO 8601 datetime" }),
  participants: z
    .array(z.string().min(1).max(255))
    .max(100, "Too many participants")
    .default([]),
});

export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;

// ─── Update Meeting ───────────────────────────────────────────────────────────

export const UpdateMeetingSchema = z
  .object({
    title: z.string().min(1).max(255),
    meetingDate: z
      .string()
      .datetime({ message: "meetingDate must be a valid ISO 8601 datetime" }),
    participants: z.array(z.string().min(1).max(255)).max(100),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateMeetingInput = z.infer<typeof UpdateMeetingSchema>;

// ─── List Meetings Query Params ───────────────────────────────────────────────

export const ListMeetingsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = parseInt(v ?? "20", 10);
      return isNaN(n) ? 20 : Math.min(Math.max(n, 1), 100);
    }),
  from: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export type ListMeetingsQuery = z.infer<typeof ListMeetingsQuerySchema>;

// ─── Transcript Upload ────────────────────────────────────────────────────────

export const TranscriptSegmentSchema = z.object({
  speaker: z.string().min(1).max(255),
  text: z.string().min(1),
  timestamp: z.string().min(1, "timestamp is required"),
});

export const UploadTranscriptSchema = z.object({
  segments: z
    .array(TranscriptSegmentSchema)
    .min(1, "At least one segment is required")
    .max(5000, "Too many segments in a single upload"),
});

export type TranscriptSegmentInput = z.infer<typeof TranscriptSegmentSchema>;
export type UploadTranscriptInput = z.infer<typeof UploadTranscriptSchema>;