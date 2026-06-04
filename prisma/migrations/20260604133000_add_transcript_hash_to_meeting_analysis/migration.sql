-- Add the column as nullable first so existing rows can be backfilled.
ALTER TABLE "MeetingAnalysis"
ADD COLUMN "TranscriptHash" TEXT;

-- Mark legacy analyses as needing a fresh hash.
-- The analyze route will overwrite this with a real transcript hash
-- the next time the meeting is analyzed.
UPDATE "MeetingAnalysis"
SET "TranscriptHash" = 'legacy-unhashed'
WHERE "TranscriptHash" IS NULL;

ALTER TABLE "MeetingAnalysis"
ALTER COLUMN "TranscriptHash" SET NOT NULL;
