import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { listSessions } from "@/lib/db/sessions";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createStudent, deleteStudent } from "@/lib/db/students";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let courseId: string;
let studentId: string;

function daysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

beforeAll(async () => {
  const location = await createLocation({
    name: `Sessions Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 60,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Sessions Karate ${suffix}`);
  disciplineId = discipline.id;
  const course = await prisma.course.create({
    data: { name: `Sessions Course ${suffix}`, locationId, disciplineId },
  });
  courseId = course.id;
  studentId = await createStudent({
    firstName: "Session",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
    guardianPhone: null,
    guardianRelationship: null,
    addressLine: null,
    city: null,
    state: null,
    postcode: null,
    country: null,
    notes: null,
    status: "ACTIVE",
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [disciplineId],
  });
});

afterAll(async () => {
  await prisma.attendance.deleteMany({ where: { session: { courseId } } });
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.course.delete({ where: { id: courseId } }).catch(() => undefined);
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("listSessions", () => {
  it("returns a true totalCount beyond the page size and paginates", async () => {
    // 8 past sessions — more than one page of 3.
    const created: string[] = [];
    for (let index = 1; index <= 8; index++) {
      const session = await prisma.classSession.create({
        data: {
          courseId,
          locationId,
          date: daysFromToday(-index * 2),
          startTime: "18:00",
          endTime: "19:00",
        },
      });
      created.push(session.id);
    }

    const firstPage = await listSessions({
      courseId,
      fromDate: daysFromToday(-20),
      toDate: daysFromToday(0),
      page: 1,
      pageSize: 3,
    });
    expect(firstPage.totalCount).toBe(8);
    expect(firstPage.sessions).toHaveLength(3);
    // Ordered oldest-first: the first row is the earliest in the window.
    expect(
      firstPage.sessions[0]!.date.getTime(),
    ).toBeLessThan(firstPage.sessions[1]!.date.getTime());

    const lastPage = await listSessions({
      courseId,
      fromDate: daysFromToday(-20),
      toDate: daysFromToday(0),
      page: 3,
      pageSize: 3,
    });
    expect(lastPage.sessions).toHaveLength(2);
  });

  it("reports marked and trained counts per session", async () => {
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: daysFromToday(-1),
        startTime: "18:00",
        endTime: "19:00",
      },
    });
    await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId,
        status: "PRESENT",
      },
    });

    const result = await listSessions({
      courseId,
      fromDate: daysFromToday(-2),
      toDate: daysFromToday(0),
    });
    const ours = result.sessions.find((row) => row.id === session.id);
    expect(ours?.marked).toBe(1);
    expect(ours?.trained).toBe(1);
  });

  it("filters by location and excludes out-of-range dates", async () => {
    const result = await listSessions({
      courseId,
      fromDate: daysFromToday(-30),
      toDate: daysFromToday(30),
      locationId,
    });
    expect(result.totalCount).toBeGreaterThanOrEqual(9);
    expect(
      result.sessions.every((session) => session.locationName.includes(suffix)),
    ).toBe(true);

    const outOfRange = await listSessions({
      courseId,
      fromDate: daysFromToday(-400),
      toDate: daysFromToday(-300),
      locationId,
    });
    expect(outOfRange.totalCount).toBe(0);
  });
});
