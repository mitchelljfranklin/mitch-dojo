import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { setSessionAttendance } from "@/lib/db/attendance";
import {
  checkPromotionEligibility,
  createBeltRangeEntry,
  deleteBeltRangeEntry,
  getDisciplineProgress,
  recordPromotion,
  updateBeltRangeEntry,
} from "@/lib/db/belts";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let disciplineId: string;
let studentId: string;
let whiteBeltId: string;
let yellowBeltId: string;

beforeAll(async () => {
  const discipline = await createDiscipline(`Belt Test ${suffix}`);
  disciplineId = discipline.id;

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
    guardianRelationship: null,
    medicalMedications: null,
    medicalConditions: null,
    medicalInjuries: null,
    addressLine: null,
    city: null,
    state: null,
    postcode: null,
    country: null,
    status: "ACTIVE",
    notes: null,
    locationIds: [],
    primaryLocationId: "",
    disciplineIds: [discipline.id],
  });

  const white = await createBeltRangeEntry(disciplineId, {
    name: "White",
    colorHex: "#ffffff",
    order: 0,
    requiredTrainings: 0,
  });
  const yellow = await createBeltRangeEntry(disciplineId, {
    name: "Yellow",
    colorHex: "#FFD700",
    order: 1,
    requiredTrainings: 5,
  });
  whiteBeltId = white.id;
  yellowBeltId = yellow.id;
});

afterAll(async () => {
  await prisma.studentBelt.deleteMany({ where: { studentId } });
  await prisma.attendance.deleteMany({
    where: { session: { course: { disciplineId } } },
  });
  await prisma.classSession.deleteMany({
    where: { course: { disciplineId } },
  });
  await prisma.beltRangeEntry.deleteMany({ where: { disciplineId } });
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("belt ladder", () => {
  it("creates ordered belt levels for a discipline", async () => {
    const { belts, rows } = await getDisciplineProgress(disciplineId!);
    expect(belts.map((belt) => belt.name)).toEqual(["White", "Yellow"]);
    // The student appears because they are assigned to this discipline.
    const row = rows.find((entry) => entry.studentId === studentId);
    expect(row?.currentBeltName).toBeNull();
    expect(row?.trainingsTotal).toBe(0);
  });

  it("refuses to delete a belt that has been awarded", async () => {
    await recordPromotion({
      studentId: studentId!,
      beltRangeEntryId: whiteBeltId!,
      awardedAt: new Date("2026-01-15"),
      notes: null,
      awardedById: null,
    });

    const { rows } = await getDisciplineProgress(disciplineId!);
    const row = rows.find((entry) => entry.studentId === studentId);
    expect(row?.currentBeltName).toBe("White");

    await expect(deleteBeltRangeEntry(whiteBeltId!)).rejects.toThrow(
      /awarded/i,
    );
  });

  it("updates a belt definition", async () => {
    const updated = await updateBeltRangeEntry(yellowBeltId!, {
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
  it("counts ALL trained sessions across the discipline's courses", async () => {
    // Create a course and a session so attendance can be recorded.
    const course = await prisma.course.create({
      data: {
        name: `Eligibility Course ${suffix}`,
        disciplineId: disciplineId!,
        locationId: (await prisma.location.findFirst())?.id ?? "",
      },
    });

    const session = await prisma.classSession.create({
      data: {
        courseId: course.id,
        locationId: course.locationId,
        date: new Date(Date.UTC(2026, 7, 6)),
        startTime: "17:00",
        endTime: "18:00",
      },
    });

    await setSessionAttendance(
      session.id,
      [{ studentId: studentId!, status: "PRESENT" }],
      null,
    );

    const { rows } = await getDisciplineProgress(disciplineId!);
    const row = rows.find((entry) => entry.studentId === studentId);
    expect(row?.trainingsTotal).toBe(1);
    expect(row?.requiredTrainings).toBe(3);
    expect(row?.isEligible).toBe(false);
  });

  it("eligibility gate reports cumulative counts and thresholds", async () => {
    const eligibility = await checkPromotionEligibility(
      studentId!,
      yellowBeltId!,
    );
    expect(eligibility?.status).toBe("insufficient");
    expect(eligibility?.requiredTrainings).toBe(3);
    expect(eligibility?.currentBeltName).toBe("White");
    expect(eligibility?.targetBeltName).toBe("Yellow Stripe");

    // Award the promotion → now the student is at Yellow, next is beyond.
    await recordPromotion({
      studentId: studentId!,
      beltRangeEntryId: yellowBeltId!,
      awardedAt: new Date(2026, 8, 1),
      notes: null,
      awardedById: null,
    });

    const afterPromotion = await checkPromotionEligibility(
      studentId!,
      yellowBeltId!,
    );
    // After the promotion the student IS at Yellow Stripe — checking
    // eligibility against the same belt reports the current rank.
    expect(afterPromotion?.currentBeltName).toBe("Yellow Stripe");
    expect(afterPromotion?.trainingsTotal).toBe(1);
  });
});
