-- Discipline-scoped belt ladders: per-course belt levels are replaced by
-- disciplines that own their ladder in belt_range_entries. Courses belong to
-- a discipline; student ranks reference the discipline's ladder entries and
-- are global across all locations teaching that discipline.

-- 1. Create the disciplines table.
CREATE TABLE "disciplines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "disciplines_name_key" ON "disciplines"("name");

-- 2. Seed one default discipline for existing data.
INSERT INTO "disciplines" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('d_default_martial_arts', 'Martial Arts', true, NOW(), NOW());

-- 3. Belt range entries belong to a discipline.
ALTER TABLE "belt_range_entries" ADD COLUMN "disciplineId" TEXT;
UPDATE "belt_range_entries" SET "disciplineId" = 'd_default_martial_arts';
ALTER TABLE "belt_range_entries" ALTER COLUMN "disciplineId" SET NOT NULL;
ALTER TABLE "belt_range_entries" ADD CONSTRAINT "belt_range_entries_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "belt_range_entries_disciplineId_idx" ON "belt_range_entries"("disciplineId");
CREATE UNIQUE INDEX "belt_range_entries_disciplineId_name_key" ON "belt_range_entries"("disciplineId", "name");
DROP INDEX IF EXISTS "belt_range_entries_name_key";

-- 4. Courses belong to a discipline.
ALTER TABLE "courses" ADD COLUMN "disciplineId" TEXT;
UPDATE "courses" SET "disciplineId" = 'd_default_martial_arts';
ALTER TABLE "courses" ALTER COLUMN "disciplineId" SET NOT NULL;
ALTER TABLE "courses" ADD CONSTRAINT "courses_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "courses_disciplineId_idx" ON "courses"("disciplineId");

-- 5. Student belts reference the discipline's ladder (replacing per-course
--    belt levels). Backfill: match by belt name from the old belt_levels.
ALTER TABLE "student_belts" ADD COLUMN "beltRangeEntryId" TEXT;
UPDATE "student_belts" SET "beltRangeEntryId" = (
  SELECT bre."id" FROM "belt_range_entries" bre
  WHERE bre."name" = (SELECT bl."name" FROM "belt_levels" bl WHERE bl."id" = "student_belts"."beltLevelId")
  LIMIT 1
);
ALTER TABLE "student_belts" ADD CONSTRAINT "student_belts_beltRangeEntryId_fkey" FOREIGN KEY ("beltRangeEntryId") REFERENCES "belt_range_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "student_belts_beltRangeEntryId_idx" ON "student_belts"("beltRangeEntryId");

-- 6. Drop the per-course belt levels.
ALTER TABLE "student_belts" DROP COLUMN IF EXISTS "beltLevelId";
DROP TABLE IF EXISTS "belt_levels";
