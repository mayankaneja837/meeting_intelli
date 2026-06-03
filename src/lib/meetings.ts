import  prisma  from '../../prisma/client'
import { Prisma } from '@/generated/prisma/client';
import type {
  CreateMeetingInput,
  UpdateMeetingInput,
  ListMeetingsQuery,
  TranscriptSegmentInput,
} from "@/types/meetings";

// ─── Types ────────────────────────────────────────────────────────────────────

const meetingListSelect = {
  id: true,
  title: true,
  meetingDate: true,
  participants: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { transcriptSegments: true, actionItems: true } },
} satisfies Prisma.MeetingSelect;

export type MeetingListItem = Prisma.MeetingGetPayload<{
  select: typeof meetingListSelect;
}>;

export type MeetingFull = Prisma.MeetingGetPayload<{
  include: {
    analysis: true;
    transcriptSegments: { orderBy: { timestamp: "asc" } };
    actionItems: true;
  };
}>;

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMeeting(
  createdById: string,
  input: CreateMeetingInput
) {
  return prisma.meeting.create({
    data: {
      createdById,
      title: input.title,
      meetingDate: new Date(input.meetingDate),
      participants: input.participants,
    },
    select: {
      id: true,
      title: true,
      meetingDate: true,
      participants: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── List (cursor-based pagination) ──────────────────────────────────────────

export async function listMeetings(
  createdById: string,
  query: ListMeetingsQuery
): Promise<{ items: MeetingListItem[]; nextCursor: string | null }> {
  const { cursor, limit, from, to } = query;

  const where: Prisma.MeetingWhereInput = {
    createdById,
    ...(from || to
      ? {
          meetingDate: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
  };

  const rows = await prisma.meeting.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { meetingDate: "desc" },
    select: meetingListSelect,
  });

  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

// ─── Get one (owned) ──────────────────────────────────────────────────────────

export async function getMeetingById(
  meetingId: string,
  createdById: string
): Promise<MeetingFull | null> {
  return prisma.meeting.findFirst({
    where: { id: meetingId, createdById },
    include: {
      analysis: true,
      transcriptSegments: { orderBy: { timestamp: "asc" } },
      actionItems: true,
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMeeting(
  meetingId: string,
  createdById: string,
  input: UpdateMeetingInput
) {
  const existing = await prisma.meeting.findFirst({
    where: { id: meetingId, createdById },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.meeting.update({
    where: { id: meetingId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.meetingDate !== undefined && {
        meetingDate: new Date(input.meetingDate),
      }),
      ...(input.participants !== undefined && {
        participants: input.participants,
      }),
    },
    select: {
      id: true,
      title: true,
      meetingDate: true,
      participants: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMeeting(
  meetingId: string,
  createdById: string
): Promise<boolean> {
  const existing = await prisma.meeting.findFirst({
    where: { id: meetingId, createdById },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.meeting.delete({ where: { id: meetingId } });
  return true;
}

// ─── Upload transcript segments ───────────────────────────────────────────────

export async function upsertTranscriptSegments(
  meetingId: string,
  createdById: string,
  segments: TranscriptSegmentInput[]
): Promise<{ inserted: number } | null> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, createdById },
    select: { id: true },
  });
  if (!meeting) return null;

  // Deduplicate by timestamp within the request (last-write-wins)
  const deduped = new Map<string, TranscriptSegmentInput>();
  for (const seg of segments) {
    deduped.set(seg.timestamp, seg);
  }
  const unique = Array.from(deduped.values());

  // timestamp is a String + only an @@index (not @@unique), so we
  // fetch existing timestamps and split into creates vs updates
  const existing = await prisma.transcriptSegment.findMany({
    where: { meetingId, timestamp: { in: unique.map((s) => s.timestamp) } },
    select: { id: true, timestamp: true },
  });

  const existingMap = new Map(existing.map((e) => [e.timestamp, e.id]));

  const toCreate = unique.filter((s) => !existingMap.has(s.timestamp));
  const toUpdate = unique.filter((s) => existingMap.has(s.timestamp));

  await prisma.$transaction([
    // Bulk create new segments
    prisma.transcriptSegment.createMany({
      data: toCreate.map((s) => ({
        meetingId,
        speaker: s.speaker,
        text: s.text,
        timestamp: s.timestamp,
      })),
      skipDuplicates: true,
    }),
    // Update existing segments individually
    ...toUpdate.map((s) =>
      prisma.transcriptSegment.update({
        where: { id: existingMap.get(s.timestamp)! },
        data: { speaker: s.speaker, text: s.text },
      })
    ),
  ]);

  return { inserted: unique.length };
}