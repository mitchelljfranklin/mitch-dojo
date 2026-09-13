-- Replace the check-in token hash with the raw token: the QR/link must embed
-- the token itself, so it has to be retrievable (regenerating invalidates it).
-- Runs after the attendance migration that introduced "checkinTokenHash".
-- Column names stay camelCase to match Prisma's mapping.
ALTER TABLE "locations" DROP COLUMN IF EXISTS "checkinTokenHash";

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "checkinToken" TEXT;
ALTER TABLE "locations" DROP COLUMN IF EXISTS "checkin_token";

CREATE UNIQUE INDEX IF NOT EXISTS "locations_checkinToken_key"
  ON "locations"("checkinToken");