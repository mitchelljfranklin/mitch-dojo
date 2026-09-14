-- CreateTable
CREATE TABLE "student_disciplines" (
    "studentId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,

    CONSTRAINT "student_disciplines_pkey" PRIMARY KEY ("studentId","disciplineId")
);

-- CreateIndex
CREATE INDEX "student_disciplines_disciplineId_idx" ON "student_disciplines"("disciplineId");

-- AddForeignKey
ALTER TABLE "student_disciplines" ADD CONSTRAINT "student_disciplines_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_disciplines" ADD CONSTRAINT "student_disciplines_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: link students to disciplines they demonstrably train.
-- 1) Belt history in the discipline.
INSERT INTO "student_disciplines" ("studentId", "disciplineId")
SELECT DISTINCT sb."studentId", bre."disciplineId"
FROM "student_belts" sb
JOIN "belt_range_entries" bre ON bre."id" = sb."beltRangeEntryId"
WHERE bre."disciplineId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2) Any attendance on a course of the discipline (Present/Late/Excused/Absent —
--    any recorded row shows the student trains that discipline).
INSERT INTO "student_disciplines" ("studentId", "disciplineId")
SELECT DISTINCT a."studentId", c."disciplineId"
FROM "attendance" a
JOIN "class_sessions" cs ON cs."id" = a."sessionId"
JOIN "courses" c ON c."id" = cs."courseId"
ON CONFLICT DO NOTHING;
