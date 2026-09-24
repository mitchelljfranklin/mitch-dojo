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
    // eligibility against the same belt reports the current rank. The
    // recorded count (1) sat below the belt's requirement (3), so the
    // promotion reconciled the credit and the counter now covers the rank.
    expect(afterPromotion?.currentBeltName).toBe("Yellow Stripe");
    expect(afterPromotion?.trainingsTotal).toBe(3);
  });
});

describe.skipIf(!hasTestDatabase)("first-belt trainings credit", () => {
  it("credits prior trainings on the first belt and counts them everywhere", async () => {
    // A second student with no belts yet — a transferring green belt.
    const transferId = await createStudent({
      firstName: "Transfer",
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
      disciplineIds: [disciplineId!],
    });

    try {
      // First belt with a credit of 10 — the counter continues from there.
      await recordPromotion({
        studentId: transferId,
        beltRangeEntryId: whiteBeltId!,
        awardedAt: new Date("2026-02-01"),
        notes: "Transferred from another dojo",
        awardedById: null,
        trainingsCredit: 10,
      });

      const stored = await prisma.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId: transferId,
            disciplineId: disciplineId!,
          },
        },
        select: { trainingsCredit: true },
      });
      expect(stored?.trainingsCredit).toBe(10);

      // Progress table: credit + the 0 local sessions of this student.
      const { rows } = await getDisciplineProgress(disciplineId!);
      const row = rows.find((entry) => entry.studentId === transferId);
      expect(row?.trainingsTotal).toBe(10);

      // Eligibility gate counts the credit too (10 + 1 local for the first
      // student is separate — this student has no local attendance).
      const eligibility = await checkPromotionEligibility(
        transferId,
        yellowBeltId!,
      );
      expect(eligibility?.trainingsTotal).toBe(10);
      expect(eligibility?.status).toBe("eligible");

      // A later promotion above the count never shrinks the credit: award
      // Yellow Stripe (requires 3) with a count of 10 — no shortfall, so
      // the stored credit stays 10.
      await recordPromotion({
        studentId: transferId,
        beltRangeEntryId: yellowBeltId!,
        awardedAt: new Date(2026, 8, 1),
        notes: null,
        awardedById: null,
      });
      const storedAfterSecond = await prisma.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId: transferId,
            disciplineId: disciplineId!,
          },
        },
        select: { trainingsCredit: true },
      });
      expect(storedAfterSecond?.trainingsCredit).toBe(10);
    } finally {
      await prisma.studentBelt.deleteMany({ where: { studentId: transferId } });
      await deleteStudent(transferId).catch(() => undefined);
    }
  });

  it("first-belt credit covers the awarded belt's own threshold", async () => {
    // A fresh student promoted straight to Yellow (requires 3 locally, they
    // have 0): the credit entered with the first belt must satisfy the
    // belt's own requirement — this mirrors the action gate counting the
    // just-entered credit, so no override is needed.
    const directId = await createStudent({
      firstName: "Direct",
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
      disciplineIds: [disciplineId!],
    });

    try {
      const before = await checkPromotionEligibility(directId, yellowBeltId!);
      expect(before?.status).toBe("insufficient");
      expect(before?.trainingsTotal).toBe(0);

      // The action computes trainings + entered credit for a first belt
      // (currentBeltName null) — with the prefilled credit of 3 the gate
      // passes without an override. Replicate that arithmetic and record.
      const enteredCredit = 3;
      const effective =
        (before?.trainingsTotal ?? 0) +
        (before?.currentBeltName === null ? enteredCredit : 0);
      expect(effective).toBeGreaterThanOrEqual(before?.requiredTrainings ?? 0);

      await recordPromotion({
        studentId: directId,
        beltRangeEntryId: yellowBeltId!,
        awardedAt: new Date("2026-03-01"),
        notes: "Transferred at Yellow",
        awardedById: null,
        trainingsCredit: enteredCredit,
      });

      const stored = await prisma.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId: directId,
            disciplineId: disciplineId!,
          },
        },
        select: { trainingsCredit: true },
      });
      expect(stored?.trainingsCredit).toBe(3);
      const after = await checkPromotionEligibility(directId, yellowBeltId!);
      expect(after?.trainingsTotal).toBe(3);
    } finally {
      await prisma.studentBelt.deleteMany({ where: { studentId: directId } });
      await deleteStudent(directId).catch(() => undefined);
    }
  });

  it("aligns the counter when a promotion jumps ahead of the count", async () => {
    // A student graded two levels in one go: the awarded belt's requirement
    // exceeds their count, so the credit tops up and the NEXT grading's
    // count starts aligned with the new rank.
    const jumpId = await createStudent({
      firstName: "Jumper",
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
      disciplineIds: [disciplineId!],
    });

    try {
      const green = await createBeltRangeEntry(disciplineId!, {
        name: "Green",
        colorHex: "#00AA00",
        order: 2,
        requiredTrainings: 10,
      });

      // First belt: White (requires 0) — no credit needed.
      await recordPromotion({
        studentId: jumpId,
        beltRangeEntryId: whiteBeltId!,
        awardedAt: new Date("2026-01-05"),
        notes: null,
        awardedById: null,
      });

      // Double grading straight to Green (requires 10) with 0 local
      // sessions — the counter aligns to the new rank.
      await recordPromotion({
        studentId: jumpId,
        beltRangeEntryId: green.id,
        awardedAt: new Date("2026-06-01"),
        notes: "Double grading",
        awardedById: null,
      });

      const stored = await prisma.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId: jumpId,
            disciplineId: disciplineId!,
          },
        },
        select: { trainingsCredit: true },
      });
      expect(stored?.trainingsCredit).toBe(10);

      const eligibility = await checkPromotionEligibility(jumpId, green.id);
      expect(eligibility?.trainingsTotal).toBe(10);
    } finally {
      await prisma.studentBelt.deleteMany({ where: { studentId: jumpId } });
      await deleteStudent(jumpId).catch(() => undefined);
    }
  });

  it("floors a first-belt credit at the awarded belt's requirement", async () => {
    // Entering less than the belt's requirement cannot leave the rank
    // unsupported — the save tops the credit up to cover it.
    const floorId = await createStudent({
      firstName: "Floored",
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
      disciplineIds: [disciplineId!],
    });

    try {
      await recordPromotion({
        studentId: floorId,
        beltRangeEntryId: yellowBeltId!,
        awardedAt: new Date("2026-02-02"),
        notes: null,
        awardedById: null,
        trainingsCredit: 1,
      });

      const stored = await prisma.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId: floorId,
            disciplineId: disciplineId!,
          },
        },
        select: { trainingsCredit: true },
      });
      expect(stored?.trainingsCredit).toBe(3);
    } finally {
      await prisma.studentBelt.deleteMany({ where: { studentId: floorId } });
      await deleteStudent(floorId).catch(() => undefined);
    }
  });
});
