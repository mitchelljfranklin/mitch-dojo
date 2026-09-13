import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createCourse } from "@/lib/db/courses";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createStudent, deleteStudent } from "@/lib/db/students";
import {
  checkPromotionEligibility,
  createBeltLevel,
  deleteBeltLevel,
  getCourseProgress,
  recordPromotion,
  updateBeltLevel,
} from "@/lib/db/belts";
import { setSessionAttendance } from "@/lib/db/attendance";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let courseId: string;
let studentId: string;
let whiteBeltId: string;
let yellowBeltId: string;

beforeAll(async () => {
  const location = await createLocation({
    name: `Belt Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
  locationId = location.id;

  studentId = await createStudent({
    firstName: "Grader",
    lastName: `Kid${suffix}`,
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
});

afterAll(async () => {
  await prisma.studentBelt.deleteMany({ where: { studentId } });
  await prisma.attendance.deleteMany({
    where: { session: { courseId } },
  });
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.beltLevel.deleteMany({ where: { courseId } });
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await prisma.course.deleteMany({ where: { id: courseId } });
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

async function createPastSession(dateUtc: Date): Promise<string> {
  const session = await prisma.classSession.create({
    data: {
      courseId: courseId!,
      locationId: locationId!,
      date: dateUtc,
      startTime: "17:00",
      endTime: "18:00",
    },
  });
  return session.id;
}

describe.skipIf(!hasTestDatabase)("belt levels", () => {
  it("creates ordered belt levels for a course", async () => {
    courseId = await createCourse({
      name: `Belt Course ${suffix}`,
      description: null,
      locationId,
      trainerId: null,
      isActive: true,
      trainingTimes: [],
    });

    const white = await createBeltLevel(courseId!, {
      name: "White",
      colorHex: "#ffffff",
      order: 0,
      requiredTrainings: 0,
    });
    const yellow = await createBeltLevel(courseId!, {
      name: "Yellow",
      colorHex: "#FFD700",
      order: 1,
      requiredTrainings: 5,
    });
    whiteBeltId = white.id;
    yellowBeltId = yellow.id;

    const { belts } = await getCourseProgress(courseId!);
    expect(belts.map((belt) => belt.name)).toEqual(["White", "Yellow"]);
  });

  it("refuses to delete a belt that has been awarded", async () => {
    await recordPromotion({
      studentId,
      beltLevelId: whiteBeltId!,
      awardedAt: new Date("2026-01-15"),
      notes: null,
      awardedById: null,
    });

    const { rows } = await getCourseProgress(courseId!);
    const row = rows.find((entry) => entry.studentId === studentId);
    expect(row?.currentBeltName).toBe("White");

    await expect(deleteBeltLevel(whiteBeltId!)).rejects.toThrow(/awarded/i);
  });

  it("updates a belt definition", async () => {
    const updated = await updateBeltLevel(yellowBeltId!, {
      name: "Yellow Stripe",
      colorHex: "#FFCC00",
      order: 1,
      requiredTrainings: 3,
    });
    expect(updated.name).toBe("Yellow Stripe");
    expect(updated.colorHex).toBe("#FFCC00");
    expect(updated.requiredTrainings).toBe(3);
  });
});

describe.skipIf(!hasTestDatabase)("eligibility", () => {
  it("counts trainings towards the next belt", async () => {
    const extraSessionId = await createPastSession(
      new Date(Date.UTC(2026, 8, 6)),
    );
    await setSessionAttendance(
      extraSessionId,
      [{ studentId: studentId!, status: "PRESENT" }],
      null,
    );
    const anotherSessionId = await createPastSession(
      new Date(Date.UTC(2026, 8, 8)),
    );
    await setSessionAttendance(
      anotherSessionId,
      [{ studentId: studentId!, status: "PRESENT" }],
      null,
    );

    const { rows } = await getCourseProgress(courseId!);
    const row = rows.find((entry) => entry.studentId === studentId);
    expect(row?.trainingsSince).toBe(2);
    expect(row?.requiredTrainings).toBe(3);
    expect(row?.isEligible).toBe(false);
  });

  it("eligibility gate reports insufficient trainings then eligibility", async () => {
    // A second White record awarded Sep 12 resets the since-date, so none of
    // the earlier trained sessions count towards Yellow (needs 3).
    const awardedAt = new Date(Date.UTC(2026, 8, 12, 12));
    await prisma.studentBelt.create({
      data: {
        studentId: studentId!,
        beltLevelId: whiteBeltId!,
        beltName: "White",
        colorHex: "#FFFFFF",
        awardedAt,
      },
    });

    const eligibility = await checkPromotionEligibility(
      studentId!,
      yellowBeltId!,
    );
    expect(eligibility?.status).toBe("insufficient");
    expect(eligibility?.trainingsSince).toBe(0);
    expect(eligibility?.requiredTrainings).toBe(3);
    expect(eligibility?.currentBeltName).toBe("White");
    expect(eligibility?.targetBeltName).toBe("Yellow Stripe");

    // Two trained sessions after the award still leave the threshold unmet.
    const sessionIdA = await createPastSession(new Date(Date.UTC(2026, 8, 12)));
    const sessionIdB = await createPastSession(new Date(Date.UTC(2026, 8, 13)));
    await setSessionAttendance(
      sessionIdA,
      [{ studentId: studentId!, status: "PRESENT" }],
      null,
    );
    await setSessionAttendance(
      sessionIdB,
      [{ studentId: studentId!, status: "PRESENT" }],
      null,
    );
    const stillInsufficient = await checkPromotionEligibility(
      studentId!,
      yellowBeltId!,
    );
    expect(stillInsufficient?.status).toBe("insufficient");
    expect(stillInsufficient?.trainingsSince).toBe(2);

    // …and the third crosses it.
    const sessionIdC = await createPastSession(new Date(Date.UTC(2026, 9, 1)));
    await setSessionAttendance(
      sessionIdC,
      [{ studentId: studentId!, status: "PRESENT" }],
      null,
    );

    const afterThreshold = await checkPromotionEligibility(
      studentId!,
      yellowBeltId!,
    );
    expect(afterThreshold?.status).toBe("eligible");
  });
});
