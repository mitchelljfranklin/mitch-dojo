import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createCourse } from "@/lib/db/courses";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createStudent, deleteStudent } from "@/lib/db/students";
import {
  createDiscipline,
  deleteDiscipline,
  createBeltRangeEntry,
} from "@/lib/db/belts";
import { ensureHistoricalSession } from "@/lib/db/sessions";
import { recordBackfillAttendance } from "@/lib/db/attendance";
import { findStudentForImport } from "@/lib/db/students";
import { recordHistoricalPromotion } from "@/lib/db/belts";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let courseId: string;
let studentId: string;
let studentBId: string;
let noviceBeltId: string;

beforeAll(async () => {
  const location = await createLocation({
    name: `Import Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
  locationId = location.id;

  const discipline = await createDiscipline(`Import Disc ${suffix}`);
  disciplineId = discipline.id;

  studentId = await createStudent({
    firstName: "Mia",
    lastName: `Importer${suffix}`,
    email: `mia-${suffix}@example.test`,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
    guardianPhone: null,
    status: "ACTIVE",
    notes: null,
    locationIds: [locationId],
    primaryLocationId: locationId,
  });
  studentBId = await createStudent({
    firstName: "Mia",
    lastName: `Duplicate${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
    guardianPhone: null,
    status: "ACTIVE",
    notes: null,
    locationIds: [locationId],
    primaryLocationId: locationId,
  });

  courseId = await createCourse({
    name: `Import Course ${suffix}`,
    description: null,
    locationId,
    disciplineId,
    trainerId: null,
    isActive: true,
    trainingTimes: [{ weekday: 3, startTime: "17:30", endTime: "18:30" }],
  });

  const novice = await createBeltRangeEntry(disciplineId, {
    name: "Novice",
    colorHex: "#FFFFFF",
    order: 0,
    requiredTrainings: 0,
  });
  noviceBeltId = novice.id;
});

afterAll(async () => {
  await prisma.attendance.deleteMany({
    where: { session: { courseId } },
  });
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.studentBelt.deleteMany({
    where: { beltRangeEntry: { disciplineId } },
  });
  await prisma.beltRangeEntry.deleteMany({ where: { disciplineId } });
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  if (studentBId) await deleteStudent(studentBId).catch(() => undefined);
  await prisma.course.deleteMany({ where: { id: courseId } });
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("ensureHistoricalSession", () => {
  it("creates a session once and reuses it for the same date", async () => {
    const date = new Date(2026, 5, 3); // local Wednesday
    const first = await ensureHistoricalSession(courseId!, date);
    const second = await ensureHistoricalSession(courseId!, date);
    expect(first).toBe(second);

    const sessions = await prisma.classSession.findMany({
      where: { courseId },
    });
    expect(sessions).toHaveLength(1);
  });

  it("separates sessions per date", async () => {
    const monday = await ensureHistoricalSession(
      courseId!,
      new Date(2026, 5, 8),
    );
    const tuesday = await ensureHistoricalSession(
      courseId!,
      new Date(2026, 5, 9),
    );
    expect(monday).not.toBe(tuesday);
  });

  it("uses the course's weekday slot when one exists", async () => {
    // 2026-06-03 is a Wednesday — the course's 17:30 slot.
    const sessionId = await ensureHistoricalSession(
      courseId!,
      new Date(2026, 5, 3),
    );
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });
    expect(session?.startTime).toBe("17:30");
    expect(session?.endTime).toBe("18:30");
  });

  it("falls back to a default slot when the course has none that weekday", async () => {
    // 2026-06-04 is a Thursday — no training time configured.
    const sessionId = await ensureHistoricalSession(
      courseId!,
      new Date(2026, 5, 4),
    );
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });
    expect(session?.startTime).toBe("18:00");
    expect(session?.endTime).toBe("19:00");
  });
});

describe.skipIf(!hasTestDatabase)("recordBackfillAttendance", () => {
  it("creates attendance and refuses to overwrite an existing mark", async () => {
    const date = new Date(2026, 5, 10);
    const first = await recordBackfillAttendance({
      studentId: studentId!,
      courseId: courseId!,
      date,
      status: "PRESENT",
      markedById: null,
    });
    expect(first.outcome).toBe("created");

    const second = await recordBackfillAttendance({
      studentId: studentId!,
      courseId: courseId!,
      date,
      status: "LATE",
      markedById: null,
    });
    expect(second.outcome).toBe("already_recorded");
    if (second.outcome === "already_recorded") {
      expect(second.existingStatus).toBe("PRESENT");
    }

    const rows = await prisma.attendance.findMany({
      where: { studentId: studentId!, session: { courseId: courseId! } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("PRESENT");
  });
});

describe.skipIf(!hasTestDatabase)("findStudentForImport", () => {
  it("matches by email and verifies the location", async () => {
    const found = await findStudentForImport(
      { email: `mia-${suffix}@example.test` },
      locationId!,
    );
    expect(found.status).toBe("found");
    if (found.status === "found") {
      expect(found.studentId).toBe(studentId);
    }
  });

  it("rejects email matches outside the location", async () => {
    const otherLocation = await createLocation({
      name: `Other Dojo ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 1,
    });
    const result = await findStudentForImport(
      { email: `mia-${suffix}@example.test` },
      otherLocation.id,
    );
    expect(result.status).toBe("not_at_location");
    await deleteLocation(otherLocation.id);
  });

  it("matches unique names and flags ambiguity", async () => {
    const unique = await findStudentForImport(
      { firstName: "mia", lastName: `importer${suffix}` },
      locationId!,
    );
    expect(unique.status).toBe("found");

    // Both "Clone Twin" students share a full name — an import row matching
    // them must be flagged ambiguous rather than attributed to either.
    await prisma.student.create({
      data: {
        firstName: "Clone",
        lastName: `Twin${suffix}`,
        locations: { create: { locationId: locationId! } },
      },
    });
    await prisma.student.create({
      data: {
        firstName: "Clone",
        lastName: `Twin${suffix}`,
        locations: { create: { locationId: locationId! } },
      },
    });
    const ambiguous = await findStudentForImport(
      { firstName: "clone", lastName: `twin${suffix}` },
      locationId!,
    );
    expect(ambiguous.status).toBe("ambiguous");

    const missing = await findStudentForImport(
      { firstName: "Nobody", lastName: `Nobody${suffix}` },
      locationId!,
    );
    expect(missing.status).toBe("not_found");

    await prisma.student.deleteMany({
      where: { lastName: `Twin${suffix}` },
    });
  });
});

describe.skipIf(!hasTestDatabase)("recordHistoricalPromotion", () => {
  it("creates a backdated row and skips same-day duplicates", async () => {
    const created = await recordHistoricalPromotion({
      studentId: studentId!,
      beltRangeEntryId: noviceBeltId!,
      awardedAt: new Date(2026, 5, 15),
      notes: "Imported",
    });
    expect(created).toBe("created");

    const skipped = await recordHistoricalPromotion({
      studentId: studentId!,
      beltRangeEntryId: noviceBeltId!,
      awardedAt: new Date(2026, 5, 15),
      notes: null,
    });
    expect(skipped).toBe("skipped");

    const rows = await prisma.studentBelt.findMany({
      where: { studentId: studentId!, beltRangeEntryId: noviceBeltId! },
    });
    expect(rows).toHaveLength(1);
  });

  it("allows the same belt awarded on a different date", async () => {
    const created = await recordHistoricalPromotion({
      studentId: studentId!,
      beltRangeEntryId: noviceBeltId!,
      awardedAt: new Date(2026, 7, 20),
      notes: null,
    });
    expect(created).toBe("created");

    await prisma.studentBelt.deleteMany({
      where: { studentId: studentId!, beltRangeEntryId: noviceBeltId! },
    });
  });
});
