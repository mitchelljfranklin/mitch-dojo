import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createCourse } from "@/lib/db/courses";
import { createMembershipPlan, enrollStudent } from "@/lib/db/memberships";
import {
  getAttendanceRates,
  getCelebrations,
  getRevenueReport,
  getStudentAttendanceRate,
} from "@/lib/db/reports";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let studentId: string;
let student2Id: string;
let courseId: string;
let planId: string;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

beforeAll(async () => {
  if (!hasTestDatabase) return;
  const location = await createLocation({
    name: `Reports Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 76,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Reports Karate ${suffix}`);
  disciplineId = discipline.id;
  studentId = await createStudent({
    firstName: "Report",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: new Date(
      Date.UTC(new Date().getUTCFullYear() - 12, new Date().getUTCMonth(), 15),
    ),
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
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [disciplineId],
  });
  // A join anniversary this month last year.
  const joined = new Date();
  joined.setUTCFullYear(joined.getUTCFullYear() - 2);
  await prisma.student.update({
    where: { id: studentId },
    data: { joinedAt: joined },
  });

  student2Id = await createStudent({
    firstName: "Report",
    lastName: `Pal${suffix}`,
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
    disciplineIds: [],
  });

  courseId = await createCourse({
    name: `Reports Course ${suffix}`,
    description: null,
    locationId,
    disciplineId,
    trainerId: null,
    isActive: true,
    trainingTimes: [],
  });

  // Two held sessions (each with at least one attendance); the tracked
  // student attended only the first, so their rate is 1 of 2.
  const attendedSession = await prisma.classSession.create({
    data: {
      courseId,
      locationId,
      date: daysAgo(1),
      startTime: "18:00",
      endTime: "19:00",
    },
  });
  const heldSession = await prisma.classSession.create({
    data: {
      courseId,
      locationId,
      date: daysAgo(2),
      startTime: "18:00",
      endTime: "19:00",
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: attendedSession.id,
      studentId,
      status: "PRESENT",
      source: "STAFF",
    },
  });
  // A second training student keeps the missed session "held".
  await prisma.attendance.create({
    data: {
      sessionId: heldSession.id,
      studentId: student2Id,
      status: "PRESENT",
      source: "STAFF",
    },
  });

  planId = (
    await createMembershipPlan({
      name: `Reports Plan ${suffix}`,
      description: null,
      planType: "RECURRING",
      billingPeriod: "MONTHLY",
      priceCents: 10000,
    })
  ).id;
  await enrollStudent({ studentId, planId, startDate: daysAgo(10) });

  await prisma.invoice.create({
    data: {
      number: 900_000 + Math.floor(Math.random() * 90_000),
      studentId,
      enrollmentId: (
        await prisma.enrollment.findFirstOrThrow({
          where: { studentId, planId },
          select: { id: true },
        })
      ).id,
      status: "PAID",
      issueDate: daysAgo(5),
      dueDate: daysAgo(1),
      payments: {
        create: { amountCents: 5000, method: "CASH", paidAt: daysAgo(4) },
      },
    },
  });
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  if (studentId) {
    await prisma.payment
      .deleteMany({ where: { invoice: { studentId } } })
      .catch(() => undefined);
    await prisma.invoice
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await prisma.enrollment
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await deleteStudent(studentId).catch(() => undefined);
  }
  if (student2Id) await deleteStudent(student2Id).catch(() => undefined);
  await prisma.classSession
    .deleteMany({ where: { courseId } })
    .catch(() => undefined);
  await prisma.course
    .delete({ where: { id: courseId } })
    .catch(() => undefined);
  if (planId) {
    await prisma.membershipPlan
      .delete({ where: { id: planId } })
      .catch(() => undefined);
  }
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("reports", () => {
  it("computes a per-student attendance rate from eligible sessions", async () => {
    const report = await getAttendanceRates(30);
    const row = report.rows.find((entry) => entry.studentId === studentId);
    expect(row).toBeDefined();
    expect(row!.eligible).toBe(2);
    expect(row!.attended).toBe(1);
    expect(row!.ratePercent).toBe(50);
    expect(await getStudentAttendanceRate(studentId, 30)).toBe(50);
  });

  it("lists this month's birthdays and anniversaries", async () => {
    const celebrations = await getCelebrations();
    expect(celebrations.birthdays.some((r) => r.studentId === studentId)).toBe(
      true,
    );
    const anniversary = celebrations.anniversaries.find(
      (r) => r.studentId === studentId,
    );
    expect(anniversary).toBeDefined();
    expect(anniversary!.years).toBeGreaterThanOrEqual(1);
  });

  it("breaks revenue down by plan and estimates recurring revenue", async () => {
    const report = await getRevenueReport(6);
    const collected = report.byPlan.find((r) => r.planId === planId);
    expect(collected).toBeDefined();
    expect(collected!.collectedCents).toBe(5000);

    const recurring = report.recurring.byPlan.find((r) => r.planId === planId);
    expect(recurring).toBeDefined();
    expect(recurring!.monthlyCents).toBe(10000);
    expect(recurring!.activeEnrollments).toBeGreaterThanOrEqual(1);
  });
});
