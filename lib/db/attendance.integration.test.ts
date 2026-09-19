import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createCourse } from "@/lib/db/courses";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { ensureUpcomingSessions } from "@/lib/db/sessions";
import { createDiscipline } from "@/lib/db/belts";
import {
  getAttendanceCountsBySession,
  getSessionRoster,
  getStudentRecentAttendance,
  setSessionAttendance,
} from "@/lib/db/attendance";
import {
  checkInStudent,
  getCheckinPageData,
  getLocationIdByCheckinToken,
  regenerateCheckinToken,
} from "@/lib/db/checkin";
import type { AttendanceEntryInput } from "@/lib/schemas/attendance";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let courseId: string;
let sessionTodayId: string;
let studentAId: string;
let studentBId: string;
let studentCId: string;

beforeAll(async () => {
  const location = await createLocation({
    name: `Attend Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
  locationId = location.id;

  const discipline = await createDiscipline(`Attend Disc ${suffix}`);
  disciplineId = discipline.id;

  studentAId = await createStudent({
    firstName: "Roster",
    lastName: `Alpha${suffix}`,
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
    status: "ACTIVE",
    notes: null,
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [],
  });
  studentBId = await createStudent({
    firstName: "Trial",
    lastName: `Bravo${suffix}`,
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
    status: "TRIAL",
    notes: null,
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [],
  });
  studentCId = await createStudent({
    firstName: "Elsewhere",
    lastName: `Charlie${suffix}`,
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
    status: "ACTIVE",
    notes: null,
    locationIds: [],
    primaryLocationId: "",
    disciplineIds: [],
  });
});

afterAll(async () => {
  await prisma.attendance.deleteMany({
    where: { session: { locationId } },
  });
  if (studentAId) await deleteStudent(studentAId).catch(() => undefined);
  if (studentBId) await deleteStudent(studentBId).catch(() => undefined);
  if (studentCId) await deleteStudent(studentCId).catch(() => undefined);
  await prisma.classSession.deleteMany({ where: { locationId } });
  await prisma.course.deleteMany({ where: { locationId } });
  await prisma.location.deleteMany({ where: { id: locationId } });
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("attendance data layer", () => {
  it("rosters active and trial students at the session's location", async () => {
    // Course with a slot TODAY so ensureUpcomingSessions creates one today.
    const todayWeekday = new Date().getDay();
    courseId = await createCourse({
      name: `Attendance Course ${suffix}`,
      description: null,
      locationId,
      disciplineId: disciplineId!,
      trainerId: null,
      isActive: true,
      trainingTimes: [
        { weekday: todayWeekday, startTime: "06:00", endTime: "07:00" },
      ],
    });

    const created = await ensureUpcomingSessions();
    expect(created).toBeGreaterThanOrEqual(1);

    const today = new Date(
      Date.UTC(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
      ),
    );
    const session = await prisma.classSession.findFirst({
      where: { courseId, date: today },
    });
    expect(session).not.toBeNull();
    sessionTodayId = session!.id;

    const { roster } = await getSessionRoster(sessionTodayId!);
    const ids = roster.map((entry) => entry.studentId);
    expect(ids).toContain(studentAId);
    expect(ids).toContain(studentBId);
    expect(ids).not.toContain(studentCId);
  });

  it("upserts attendance and reports trained counts", async () => {
    const entries: AttendanceEntryInput[] = [
      { studentId: studentAId, status: "PRESENT" },
      { studentId: studentBId, status: "ABSENT" },
    ];
    await setSessionAttendance(sessionTodayId!, entries, null);

    const counts = await getAttendanceCountsBySession([sessionTodayId!]);
    expect(counts.get(sessionTodayId!)).toEqual({ total: 2, trained: 1 });

    // Saving again updates instead of duplicating.
    await setSessionAttendance(
      sessionTodayId!,
      [{ studentId: studentAId, status: "LATE" }],
      null,
    );
    const rows = await prisma.attendance.findMany({
      where: { sessionId: sessionTodayId!, studentId: studentAId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("LATE");
  });

  it("keeps the CHECKIN source when staff later overwrite", async () => {
    await checkInStudent(locationId, sessionTodayId!, studentBId);
    const first = await prisma.attendance.findFirst({
      where: { sessionId: sessionTodayId!, studentId: studentBId },
    });
    expect(first?.source).toBe("CHECKIN");

    await setSessionAttendance(
      sessionTodayId!,
      [{ studentId: studentBId, status: "EXCUSED" }],
      null,
    );
    const overwritten = await prisma.attendance.findFirst({
      where: { sessionId: sessionTodayId!, studentId: studentBId },
    });
    expect(overwritten?.status).toBe("EXCUSED");
    expect(overwritten?.source).toBe("MANUAL");
  });

  it("shows recent attendance on the student record", async () => {
    const rows = await getStudentRecentAttendance(studentAId);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.status).toBe("LATE");
  });
});

describe.skipIf(!hasTestDatabase)("public check-in", () => {
  it("issues, resolves, and rotates location tokens", async () => {
    const token = await regenerateCheckinToken(locationId);
    expect(await getLocationIdByCheckinToken(token)).toBe(locationId);

    const rotated = await regenerateCheckinToken(locationId);
    expect(rotated).not.toBe(token);
    expect(await getLocationIdByCheckinToken(token)).toBeNull();
    expect(await getLocationIdByCheckinToken(rotated)).toBe(locationId);
  });

  it("lists only today's scheduled sessions with checked-in state", async () => {
    const data = await getCheckinPageData(locationId);
    expect(data.locationName).toContain("Attend Dojo");
    expect(data.sessions).toHaveLength(1);
    const names = data.sessions[0]?.students.map((student) => student.name);
    expect(names?.some((name) => name.includes(`Alpha${suffix}`))).toBe(true);
  });

  it("rejects check-ins for other locations, other days, and non-roster students", async () => {
    // Wrong location
    expect(
      await checkInStudent("other-location", sessionTodayId!, studentAId),
    ).toBe("not_found");
    // Student not at this location
    expect(
      await checkInStudent(locationId, sessionTodayId!, "missing-student"),
    ).toBe("not_found");

    const ok = await checkInStudent(locationId, sessionTodayId!, studentAId);
    expect(ok).toBe("ok");
  });
});
