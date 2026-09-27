-- CreateEnum
CREATE TYPE "GradingEventStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "GradingOutcome" AS ENUM ('PENDING', 'PROMOTED', 'ABSENT');

-- CreateTable
CREATE TABLE "grading_events" (
    "id" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "status" "GradingEventStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grading_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_event_students" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "targetBeltRangeEntryId" TEXT,
    "outcome" "GradingOutcome" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "grading_event_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grading_events_disciplineId_idx" ON "grading_events"("disciplineId");

-- CreateIndex
CREATE INDEX "grading_event_students_studentId_idx" ON "grading_event_students"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "grading_event_students_eventId_studentId_key" ON "grading_event_students"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "grading_events" ADD CONSTRAINT "grading_events_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_events" ADD CONSTRAINT "grading_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_events" ADD CONSTRAINT "grading_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_event_students" ADD CONSTRAINT "grading_event_students_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "grading_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_event_students" ADD CONSTRAINT "grading_event_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_event_students" ADD CONSTRAINT "grading_event_students_targetBeltRangeEntryId_fkey" FOREIGN KEY ("targetBeltRangeEntryId") REFERENCES "belt_range_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
