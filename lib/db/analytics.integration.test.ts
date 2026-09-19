import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createMembershipPlan } from "@/lib/db/memberships";
import {
  getAnalyticsOverview,
  getAttendanceTrend,
  getAtRiskStudents,
  getMembersPerLocation,
  getRevenueTrend,
} from "@/lib/db/analytics";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let otherLocationId: string;
let disciplineId: string;
let courseId: string;
let eagerId: string;
let absentId: string;

function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

beforeAll(async () => {
  const location = await createLocation({
    name: `Analytics Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
  locationId = location.id;
  const other = await createLocation({
    name: `Analytics Other ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 1,
  });
  otherLocationId = other.id;
  const discipline = await createDiscipline(`Analytics Karate ${suffix}`);
  disciplineId = discipline.id;

  const course = await prisma.course.create({
    data: { name: `Analytics Course ${suffix}`, locationId, disciplineId },
  });
  courseId = course.id;

  eagerId = await createStudent({
    firstName: "Eager",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
    guardianPhone: null,
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
  absentId = await createStudent({
    firstName: "Absent",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
    guardianPhone: null,
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

  // The eager kid trained 3 days ago (recent, not at risk) and 30 days ago.
  // The absent kid has never trained but joined today — grace period keeps
  // them out of the at-risk list; the eager kid's 30-day gap is in a bucket.
  const recentSession = await prisma.classSession.create({
    data: {
      courseId,
      locationId,
      date: daysAgo(3),
      startTime: "18:00",
      endTime: "19:00",
    },
  });
  const oldSession = await prisma.classSession.create({
    data: {
      courseId,
      locationId,
      date: daysAgo(30),
      startTime: "18:00",
      endTime: "19:00",
    },
  });
  await prisma.attendance.createMany({
    data: [
      { sessionId: recentSession.id, studentId: eagerId, status: "PRESENT" },
      { sessionId: oldSession.id, studentId: eagerId, status: "LATE" },
    ],
  });
});

afterAll(async () => {
  await prisma.attendance.deleteMany({
    where: { session: { courseId } },
  });
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.course
    .delete({ where: { id: courseId } })
    .catch(() => undefined);
  await prisma.invoice
    .deleteMany({ where: { student: { lastName: { contains: suffix } } } })
    .catch(() => undefined);
  await prisma.membershipPlan
    .deleteMany({ where: { name: { contains: suffix } } })
    .catch(() => undefined);
  if (eagerId) await deleteStudent(eagerId).catch(() => undefined);
  if (absentId) await deleteStudent(absentId).catch(() => undefined);
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await deleteLocation(otherLocationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("analytics overview", () => {
  it("counts active and trial students", async () => {
    const overview = await getAnalyticsOverview();
    expect(overview.activeStudents).toBeGreaterThanOrEqual(2);
  });
});

describe.skipIf(!hasTestDatabase)("attendance trend", () => {
  it("buckets trained sessions into the correct week", async () => {
    const trend = await getAttendanceTrend(12, undefined);
    const totalAttendances = trend.reduce(
      (sum, bucket) => sum + bucket.attendances,
      0,
    );
    // The eager kid has two attendances within the last 12 weeks.
    expect(totalAttendances).toBeGreaterThanOrEqual(2);

    const lastBucket = trend[trend.length - 1]!;
    // The recent session (3 days ago) is in the final (partial) bucket.
    expect(lastBucket.attendances).toBeGreaterThanOrEqual(1);
  });

  it("narrows to one location with the filter", async () => {
    const filtered = await getAttendanceTrend(12, locationId);
    const total = filtered.reduce((sum, bucket) => sum + bucket.attendances, 0);
    expect(total).toBeGreaterThanOrEqual(2);

    const empty = await getAttendanceTrend(12, otherLocationId);
    expect(empty.reduce((sum, b) => sum + b.attendances, 0)).toBe(0);
  });

  it("includes today's session in the final bucket", async () => {
    // Regression: the last bucket's exclusive end used to equal today, so a
    // session dated today was fetched but never counted.
    const todaySession = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: utcMidnight(new Date()),
        startTime: "06:00",
        endTime: "07:00",
      },
    });
    await prisma.attendance.create({
      data: {
        sessionId: todaySession.id,
        studentId: eagerId,
        status: "PRESENT",
      },
    });

    const trend = await getAttendanceTrend(12, locationId);
    const lastBucket = trend[trend.length - 1]!;
    // Today's session + the 3-days-ago session both land here.
    expect(lastBucket.attendances).toBeGreaterThanOrEqual(2);
    expect(lastBucket.sessionsHeld).toBeGreaterThanOrEqual(2);

    // Clean up so later suites see the seeded two-attendance state.
    await prisma.attendance.deleteMany({
      where: { sessionId: todaySession.id },
    });
    await prisma.classSession.delete({ where: { id: todaySession.id } });
  });
});

describe.skipIf(!hasTestDatabase)("revenue trend", () => {
  it("sums recorded payments per month", async () => {
    const plan = await createMembershipPlan({
      name: `Analytics Plan ${suffix}`,
      description: null,
      planType: "ITEM",
      billingPeriod: null,
      priceCents: 2500,
    });
    const invoice = await prisma.invoice.create({
      data: {
        number: 700_000 + Math.floor(Math.random() * 99_000),
        studentId: eagerId,
        status: "PAID",
        issueDate: utcMidnight(new Date()),
        dueDate: utcMidnight(new Date()),
        items: {
          create: { description: plan.name, quantity: 1, unitPriceCents: 2500 },
        },
      },
    });
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: 2500,
        method: "CASH",
        paidAt: new Date(),
      },
    });

    const trend = await getRevenueTrend(6);
    const currentMonth = trend[trend.length - 1]!;
    expect(currentMonth.collectedCents).toBeGreaterThanOrEqual(2500);
    expect(currentMonth.payments).toBeGreaterThanOrEqual(1);

    await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.membershipPlan.delete({ where: { id: plan.id } });
  });
});

describe.skipIf(!hasTestDatabase)("retention", () => {
  it("flags students with no recent attendance and spares fresh joiners", async () => {
    const atRisk = await getAtRiskStudents(14, 50);
    const byId = new Map(atRisk.map((row) => [row.studentId, row]));

    // The eager kid last trained 3 days ago — inside the window, not at risk.
    expect(byId.has(eagerId)).toBe(false);

    // Someone whose last attendance is 30+ days back appears. The absent kid
    // joined today, so the grace period spares them.
    const eagerWithOnlyOldGap = await prisma.attendance.findMany({
      where: { studentId: eagerId },
    });
    expect(eagerWithOnlyOldGap.length).toBe(2);
    expect(byId.has(absentId)).toBe(false);
  });

  it("counts members per location", async () => {
    const rows = await getMembersPerLocation();
    const thisDojo = rows.find((row) => row.locationId === locationId);
    expect(thisDojo?.members).toBeGreaterThanOrEqual(2);
    const other = rows.find((row) => row.locationId === otherLocationId);
    expect(other?.members).toBe(0);
  });
});
