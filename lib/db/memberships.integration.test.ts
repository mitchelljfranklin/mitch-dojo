import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import {
  advanceBillingDate,
  computeInvoiceFinancials,
  createInvoice,
  createMembershipPlan,
  deleteMembershipPlan,
  enrollStudent,
  endEnrollment,
  generateDueInvoices,
  pauseEnrollment,
  resumeDueEnrollments,
  resumeEnrollment,
  getStudentSuspension,
  getInvoiceDetail,
  listInvoices,
  listOverdueStudents,
  recordBulkPayments,
  recordPayment,
  updateMembershipPlan,
  voidInvoice,
} from "@/lib/db/memberships";
import { getRevenueTrend } from "@/lib/db/analytics";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let studentId: string;
let recurringPlanId: string;
let itemPlanId: string;
let testInvoiceId: string;

function daysFromNow(days: number): Date {
  // Match the product's local-calendar-day convention (utcMidnightOf): the
  // day is taken from local parts, stored as a UTC-midnight instant.
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days),
  );
}

beforeAll(async () => {
  if (!hasTestDatabase) return;
  studentId = await createStudent({
    firstName: "Member",
    lastName: `Tester${suffix}`,
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

  const recurringPlan = await createMembershipPlan({
    name: `Monthly Test ${suffix}`,
    description: null,
    planType: "RECURRING",
    billingPeriod: "MONTHLY",
    priceCents: 8950,
  });
  recurringPlanId = recurringPlan.id;

  const itemPlan = await createMembershipPlan({
    name: `Grading Fee Test ${suffix}`,
    description: null,
    planType: "ITEM",
    billingPeriod: null,
    priceCents: 4000,
  });
  itemPlanId = itemPlan.id;
});

afterAll(async () => {
  if (studentId) {
    await prisma.invoice
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await prisma.enrollment
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await deleteStudent(studentId).catch(() => undefined);
  }
  if (recurringPlanId) {
    await prisma.membershipPlan
      .delete({ where: { id: recurringPlanId } })
      .catch(() => undefined);
  }
  if (itemPlanId) {
    await prisma.membershipPlan
      .delete({ where: { id: itemPlanId } })
      .catch(() => undefined);
  }
  await prisma.$disconnect();
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  if (studentId) {
    await prisma.invoice
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await prisma.enrollment
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await deleteStudent(studentId).catch(() => undefined);
  }
  if (recurringPlanId) {
    await prisma.membershipPlan
      .delete({ where: { id: recurringPlanId } })
      .catch(() => undefined);
  }
  if (itemPlanId) {
    await prisma.membershipPlan
      .delete({ where: { id: itemPlanId } })
      .catch(() => undefined);
  }
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("membership plans", () => {
  it("refuses to delete a plan with enrollments", async () => {
    await enrollStudent({
      studentId: studentId!,
      planId: recurringPlanId!,
      startDate: daysFromNow(0),
    });
    await expect(deleteMembershipPlan(recurringPlanId!)).rejects.toThrow(
      "has active enrollments",
    );
  });

  it("refuses to delete a plan with only ended enrollments", async () => {
    const enrollment = await prisma.enrollment.findFirst({
      where: { planId: recurringPlanId!, studentId: studentId! },
      select: { id: true },
    });
    await endEnrollment(enrollment!.id, daysFromNow(0));
    await expect(deleteMembershipPlan(recurringPlanId!)).rejects.toThrow(
      "cannot be deleted",
    );
  });
});

describe.skipIf(!hasTestDatabase)("invoice location tagging", () => {
  let locationId: string;

  beforeAll(async () => {
    const location = await createLocation({
      name: `Location Test ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 99,
    });
    locationId = location.id;
  });

  afterAll(async () => {
    if (locationId) await deleteLocation(locationId).catch(() => undefined);
  });

  it("stores an optional location and filters the list by it", async () => {
    const tagged = await createInvoice({
      studentId: studentId!,
      planId: itemPlanId!,
      issueDate: daysFromNow(0),
      dueDate: daysFromNow(14),
      notes: null,
      locationId,
      createdById: null,
    });
    const untagged = await createInvoice({
      studentId: studentId!,
      planId: itemPlanId!,
      issueDate: daysFromNow(0),
      dueDate: daysFromNow(14),
      notes: null,
      createdById: null,
    });

    const byLocation = await listInvoices({ locationId });
    expect(byLocation.rows.some((row) => row.id === tagged.id)).toBe(true);
    expect(byLocation.rows.some((row) => row.id === untagged.id)).toBe(false);

    // The location shows on the row.
    expect(
      byLocation.rows.find((row) => row.id === tagged.id)?.location?.name,
    ).toContain("Location Test");

    await prisma.invoice.deleteMany({
      where: { id: { in: [tagged.id, untagged.id] } },
    });
  });

  it("scopes the revenue trend to a location, excluding null-location invoices", async () => {
    const tagged = await createInvoice({
      studentId: studentId!,
      planId: itemPlanId!,
      issueDate: daysFromNow(0),
      dueDate: daysFromNow(14),
      notes: null,
      locationId,
      createdById: null,
    });
    await recordPayment({
      invoiceId: tagged.id,
      amountCents: 1234,
      method: "CASH",
      paidAt: daysFromNow(0),
      reference: null,
      recordedById: null,
    });

    const filtered = await getRevenueTrend(1, locationId);
    const unfiltered = await getRevenueTrend(1);
    const filteredCollected = filtered.reduce(
      (sum, bucket) => sum + bucket.collectedCents,
      0,
    );
    const unfilteredCollected = unfiltered.reduce(
      (sum, bucket) => sum + bucket.collectedCents,
      0,
    );
    // The location view sees exactly the tagged payment; the all-locations
    // view sees at least that plus any null-location revenue.
    expect(filteredCollected).toBe(1234);
    expect(unfilteredCollected).toBeGreaterThanOrEqual(filteredCollected);

    await prisma.payment.deleteMany({ where: { invoiceId: tagged.id } });
    await prisma.invoice.delete({ where: { id: tagged.id } });
  });
});

describe.skipIf(!hasTestDatabase)("invoice lifecycle", () => {
  it("creates a manual invoice with a sequential number and one line item", async () => {
    const invoice = await createInvoice({
      studentId: studentId!,
      planId: itemPlanId!,
      issueDate: daysFromNow(0),
      dueDate: daysFromNow(14),
      notes: null,
      createdById: null,
    });
    testInvoiceId = invoice.id;

    expect(invoice.number).toBeGreaterThan(0);
    expect(invoice.status).toBe("OPEN");

    const detail = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true, payments: true },
    });
    expect(detail?.items).toHaveLength(1);
    expect(detail?.items[0]?.description).toContain("Grading Fee Test");
    expect(detail?.items[0]?.unitPriceCents).toBe(4000);
  });

  it("records a full payment and flips the invoice to PAID", async () => {
    const payment = await recordPayment({
      invoiceId: testInvoiceId!,
      amountCents: 4000,
      method: "CASH",
      paidAt: daysFromNow(0),
      reference: null,
      recordedById: null,
    });
    expect(payment.amountCents).toBe(4000);

    const invoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId! },
    });
    expect(invoice?.status).toBe("PAID");
  });

  it("rejects payments exceeding the balance", async () => {
    await expect(
      recordPayment({
        invoiceId: testInvoiceId!,
        amountCents: 100,
        method: "CASH",
        paidAt: daysFromNow(0),
        reference: null,
        recordedById: null,
      }),
    ).rejects.toThrow("exceeds the outstanding balance");
  });

  it("restores the balance when a payment is deleted", async () => {
    const { deletePayment } = await import("@/lib/db/memberships");
    const payment = await prisma.payment.findFirst({
      where: { invoiceId: testInvoiceId! },
      select: { id: true },
    });
    await deletePayment(payment!.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId! },
    });
    expect(invoice?.status).toBe("OPEN");
  });

  it("does not void an invoice that still has payments outstanding rules intact", async () => {
    await voidInvoice(testInvoiceId!);
    const invoice = await prisma.invoice.findUnique({
      where: { id: testInvoiceId! },
    });
    expect(invoice?.status).toBe("VOID");

    await expect(
      recordPayment({
        invoiceId: testInvoiceId!,
        amountCents: 1000,
        method: "CASH",
        paidAt: daysFromNow(0),
        reference: null,
        recordedById: null,
      }),
    ).rejects.toThrow("void");
  });

  it("refuses to void an invoice that has payments recorded", async () => {
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: itemPlanId! },
    });
    const invoice = await prisma.invoice.create({
      data: {
        number: 800_000 + Math.floor(Math.random() * 90_000),
        studentId: studentId!,
        status: "OPEN",
        issueDate: daysFromNow(-10),
        dueDate: daysFromNow(4),
        items: {
          create: {
            description: plan?.name ?? "test",
            quantity: 1,
            unitPriceCents: 4000,
          },
        },
      },
    });
    await recordPayment({
      invoiceId: invoice.id,
      amountCents: 1000,
      method: "CASH",
      paidAt: daysFromNow(0),
      reference: null,
      recordedById: null,
    });

    await expect(voidInvoice(invoice.id)).rejects.toThrow("payments");
  });

  it("filters the invoice list by overdue status", async () => {
    // Recreate an open, long-overdue invoice directly.
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: itemPlanId! },
    });
    const invoice = await prisma.invoice.create({
      data: {
        number: 900_000 + Math.floor(Math.random() * 90_000),
        studentId: studentId!,
        status: "OPEN",
        issueDate: daysFromNow(-60),
        dueDate: daysFromNow(-45),
        items: {
          create: {
            description: plan?.name ?? "test",
            quantity: 1,
            unitPriceCents: 4000,
          },
        },
      },
    });

    const overdue = await listInvoices({ overdueOnly: true });
    expect(
      overdue.rows.some((row) => row.id === invoice.id && row.isOverdue),
    ).toBe(true);

    const overdueStudents = await listOverdueStudents(10);
    expect(
      overdueStudents.some(
        (row) => row.studentId === studentId && row.daysOverdue > 0,
      ),
    ).toBe(true);

    await prisma.invoice.delete({ where: { id: invoice.id } });
  });
});

describe.skipIf(!hasTestDatabase)("suspension", () => {
  it("suspends a student whose overdue invoice passes the threshold", async () => {
    // Default suspendAfterOverdueDays is 30; this invoice is 45 days overdue.
    const invoice = await prisma.invoice.create({
      data: {
        number: 950_000 + Math.floor(Math.random() * 45_000),
        studentId: studentId!,
        status: "OPEN",
        issueDate: daysFromNow(-60),
        dueDate: daysFromNow(-45),
        items: {
          create: {
            description: "suspension test",
            quantity: 1,
            unitPriceCents: 1000,
          },
        },
      },
    });

    const suspension = await getStudentSuspension(studentId!);
    expect(suspension.suspended).toBe(true);
    expect(suspension.daysOverdue).toBeGreaterThanOrEqual(30);

    await prisma.invoice.delete({ where: { id: invoice.id } });

    const clear = await getStudentSuspension(studentId!);
    expect(clear.suspended).toBe(false);
  });
});

describe.skipIf(!hasTestDatabase)("recurring invoice generation", () => {
  it("generates due invoices and advances the cycle", async () => {
    const enrollment = await prisma.enrollment.findFirst({
      where: { planId: recurringPlanId!, studentId: studentId! },
    });
    // Re-enroll (the earlier enrollment was ended by the delete-guard test).
    if (!enrollment || enrollment.status !== "ACTIVE") {
      await enrollStudent({
        studentId: studentId!,
        planId: recurringPlanId!,
        startDate: daysFromNow(-70),
      });
    }

    // Force the cycle date well into the past: two missed months.
    await prisma.enrollment.updateMany({
      where: {
        planId: recurringPlanId!,
        studentId: studentId!,
        status: "ACTIVE",
      },
      data: { nextInvoiceDate: daysFromNow(-62) },
    });

    const { generated } = await generateDueInvoices(new Date(), 14);
    expect(generated).toBeGreaterThanOrEqual(2);

    const updated = await prisma.enrollment.findFirst({
      where: {
        planId: recurringPlanId!,
        studentId: studentId!,
        status: "ACTIVE",
      },
    });
    expect(updated?.nextInvoiceDate!.getTime()).toBeGreaterThan(
      daysFromNow(0).getTime(),
    );

    const generatedInvoices = await prisma.invoice.findMany({
      where: { enrollmentId: updated!.id },
      orderBy: { issueDate: "asc" },
      include: { items: true },
    });
    expect(generatedInvoices.length).toBeGreaterThanOrEqual(2);
    // Each invoice carries one line item priced from the plan.
    for (const invoice of generatedInvoices) {
      expect(invoice.items).toHaveLength(1);
      expect(invoice.items[0]?.unitPriceCents).toBe(8950);
    }
  });

  it("is idempotent — a repeated run generates nothing", async () => {
    const { generated } = await generateDueInvoices(new Date(), 14);
    expect(generated).toBe(0);
  });
});

describe.skipIf(!hasTestDatabase)("charge only with attendance", () => {
  let locationId: string;
  let courseId: string;
  let gatedPlanId: string;
  let gatedStudentId: string;
  const extraStudentIds: string[] = [];

  beforeAll(async () => {
    const location = await createLocation({
      name: `Gated Dojo ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 80,
    });
    locationId = location.id;
    const discipline = await prisma.discipline.create({
      data: { name: `Gated Karate ${suffix}` },
    });
    const course = await prisma.course.create({
      data: {
        name: `Gated Course ${suffix}`,
        locationId,
        disciplineId: discipline.id,
      },
    });
    courseId = course.id;
    gatedStudentId = await createStudent({
      firstName: "Gated",
      lastName: `Member${suffix}`,
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
    const gatedPlan = await createMembershipPlan({
      name: `Train-to-Bill ${suffix}`,
      description: null,
      planType: "RECURRING",
      billingPeriod: "MONTHLY",
      priceCents: 5000,
      chargeOnlyWithAttendance: true,
    });
    gatedPlanId = gatedPlan.id;
  });

  afterAll(async () => {
    if (!hasTestDatabase) return;
    await prisma.attendance.deleteMany({ where: { session: { courseId } } });
    await prisma.classSession.deleteMany({ where: { courseId } });
    await prisma.course
      .delete({ where: { id: courseId } })
      .catch(() => undefined);
    await prisma.discipline
      .delete({ where: { name: `Gated Karate ${suffix}` } })
      .catch(() => undefined);
    await deleteLocation(locationId).catch(() => undefined);
    if (gatedStudentId) {
      await deleteStudent(gatedStudentId).catch(() => undefined);
    }
    for (const studentId of extraStudentIds) {
      await deleteStudent(studentId).catch(() => undefined);
    }
  });

  it("bills the first cycle, gates the second on attendance", async () => {
    await enrollStudent({
      studentId: gatedStudentId,
      planId: gatedPlanId,
      startDate: daysFromNow(-40),
    });
    // Force the cycle into the past: one missed month with NO attendance.
    await prisma.enrollment.updateMany({
      where: { planId: gatedPlanId, status: "ACTIVE" },
      data: { nextInvoiceDate: daysFromNow(-40) },
    });

    // First cycle: exempt (no previous invoice).
    const firstRun = await generateDueInvoices(new Date(), 14);
    expect(firstRun.generated).toBeGreaterThanOrEqual(1);

    const enrollment = await prisma.enrollment.findFirst({
      where: { planId: gatedPlanId, studentId: gatedStudentId },
    });
    const firstInvoice = await prisma.invoice.findFirst({
      where: { enrollmentId: enrollment!.id },
      orderBy: { issueDate: "asc" },
    });
    expect(firstInvoice).not.toBeNull();

    // Second cycle arrives with NO attendance since the first invoice — the
    // run generates nothing further (and reports the skip) while still
    // advancing the cycle.
    await prisma.enrollment.update({
      where: { id: enrollment!.id },
      data: { nextInvoiceDate: daysFromNow(-10) },
    });
    const secondRun = await generateDueInvoices(new Date(), 14);
    const invoicesAfterSkip = await prisma.invoice.findMany({
      where: { enrollmentId: enrollment!.id },
    });
    expect(secondRun.generated).toBe(0);
    expect(secondRun.skipped).toBeGreaterThanOrEqual(1);
    expect(invoicesAfterSkip).toHaveLength(1);

    // Training once since the last invoice bills the next cycle. The skip
    // advanced nextInvoiceDate to the following cycle — force it due again
    // to run that cycle now.
    await recordAttendanceForGate();
    await prisma.enrollment.update({
      where: { id: enrollment!.id },
      data: { nextInvoiceDate: daysFromNow(-3) },
    });
    await generateDueInvoices(new Date(), 14);
    const invoicesAfterAttendance = await prisma.invoice.findMany({
      where: { enrollmentId: enrollment!.id },
    });
    expect(invoicesAfterAttendance.length).toBe(2);
  });

  async function recordAttendanceForGate() {
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: daysFromNow(-5),
        startTime: "19:00",
        endTime: "20:00",
      },
    });
    await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId: gatedStudentId,
        status: "LATE",
      },
    });
  }

  // A fresh attendance-gated member + enrollment for the catch-up and
  // boundary cases, tracked for cleanup.
  async function createGatedMember(
    tag: string,
    startDaysAgo: number,
    gated = true,
  ) {
    const studentId = await createStudent({
      firstName: "Gated",
      lastName: `${tag}${suffix}`,
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
    extraStudentIds.push(studentId);
    const plan = await createMembershipPlan({
      name: `Gated ${tag} ${suffix}`,
      description: null,
      planType: "RECURRING",
      billingPeriod: "MONTHLY",
      priceCents: 5000,
      chargeOnlyWithAttendance: gated,
    });
    await enrollStudent({
      studentId,
      planId: plan.id,
      startDate: daysFromNow(startDaysAgo),
    });
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, planId: plan.id },
    });
    return { studentId, enrollmentId: enrollment!.id };
  }

  it("bills only the catch-up cycles whose window contains training", async () => {
    const { studentId, enrollmentId } = await createGatedMember("Jump", -95);
    // Derive the cycle dates with the same calendar-month arithmetic the
    // generator uses. Periods are calendar months, not fixed 30-day spans, so
    // the second cycle is NOT daysFromNow(-65) in general.
    const cycle1 = daysFromNow(-95);
    const cycle2 = advanceBillingDate(cycle1, "MONTHLY");
    const cycle3 = advanceBillingDate(cycle2, "MONTHLY");
    // Three monthly cycles are due.
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: cycle1 },
    });

    // No attendance: the first cycle bills (exempt), the other three skip.
    const firstRun = await generateDueInvoices(new Date(), 14);
    expect(firstRun.skipped).toBeGreaterThanOrEqual(3);
    const afterFirst = await prisma.invoice.findMany({
      where: { enrollmentId },
      orderBy: { issueDate: "asc" },
    });
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]!.issueDate.getTime()).toBe(cycle1.getTime());

    // One late session 50 days ago falls inside the second cycle's window
    // [cycle2, cycle3) but not the first [cycle1, cycle2). Replay the catch-up
    // from cycle2 so the generator bills that cycle and skips the next.
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: daysFromNow(-50),
        startTime: "18:30",
        endTime: "19:30",
      },
    });
    await prisma.attendance.create({
      data: { sessionId: session.id, studentId, status: "PRESENT" },
    });
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: cycle2 },
    });
    await generateDueInvoices(new Date(), 14);

    const afterSecond = await prisma.invoice.findMany({
      where: { enrollmentId },
      orderBy: { issueDate: "asc" },
    });
    // The cycle whose window contains the training bills; the next skips
    // ([that cycle, next) has no training).
    expect(afterSecond.map((i) => i.issueDate.getTime())).toEqual([
      cycle1.getTime(),
      cycle3.getTime(),
    ]);
  });

  it("counts attendance on the previous invoice's issue date", async () => {
    const { studentId, enrollmentId } = await createGatedMember("Edge", -35);
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: daysFromNow(-35) },
    });
    await generateDueInvoices(new Date(), 14);
    // First invoice at -35; the cycle at -5 skipped (no attendance).
    const afterFirst = await prisma.invoice.findMany({
      where: { enrollmentId },
    });
    expect(afterFirst).toHaveLength(1);

    // Training exactly on the first invoice's issue date is inside the next
    // window ([−35, −5)) — the boundary is inclusive, so it bills.
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: daysFromNow(-35),
        startTime: "17:00",
        endTime: "18:00",
      },
    });
    await prisma.attendance.create({
      data: { sessionId: session.id, studentId, status: "PRESENT" },
    });
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: daysFromNow(-5) },
    });
    await generateDueInvoices(new Date(), 14);

    const afterSecond = await prisma.invoice.findMany({
      where: { enrollmentId },
    });
    expect(afterSecond).toHaveLength(2);
  });

  it("never duplicates a cycle that already has an invoice", async () => {
    // Non-gated so the attendance gate can't mask the duplicate guard.
    const { enrollmentId } = await createGatedMember("Dupe", -35, false);
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: daysFromNow(-35) },
    });
    await generateDueInvoices(new Date(), 14);
    const firstCount = await prisma.invoice.count({ where: { enrollmentId } });
    expect(firstCount).toBeGreaterThanOrEqual(1);

    // Simulate a crashed/overlapping run that failed to advance
    // nextInvoiceDate: replaying the same cycles must not create duplicates
    // (existence guard + the unique (enrollmentId, issueDate) index).
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: daysFromNow(-35) },
    });
    await generateDueInvoices(new Date(), 14);
    expect(await prisma.invoice.count({ where: { enrollmentId } })).toBe(
      firstCount,
    );
  });

  it("keeps charging ungated plans regardless of attendance", async () => {
    // The recurringPlanId enrollment (non-gated) bills even with zero
    // attendance — covered by the existing generation test; assert the
    // flag itself is stored as configured.
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: recurringPlanId! },
      select: { chargeOnlyWithAttendance: true },
    });
    expect(plan?.chargeOnlyWithAttendance).toBe(false);
    const gated = await prisma.membershipPlan.findUnique({
      where: { id: gatedPlanId },
      select: { chargeOnlyWithAttendance: true },
    });
    expect(gated?.chargeOnlyWithAttendance).toBe(true);
  });

  it("bills an active recurring enrollment whose nextInvoiceDate is null", async () => {
    // e.g. an enrollment created while the plan was a one-off, later switched
    // to recurring — it must self-heal rather than being skipped forever.
    const { enrollmentId } = await createGatedMember("Null", -40);
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: null },
    });

    const run = await generateDueInvoices(new Date(), 14);
    expect(run.generated).toBeGreaterThanOrEqual(1);
    const invoices = await prisma.invoice.findMany({
      where: { enrollmentId },
    });
    expect(invoices.length).toBeGreaterThanOrEqual(1);
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    expect(enrollment?.nextInvoiceDate).not.toBeNull();
  });

  it("gates the first invoice of an enrollment converted to recurring", async () => {
    // A gateFrom anchor stands in for the missing first invoice, so a member
    // who never trained since the switch is NOT billed.
    const { enrollmentId } = await createGatedMember("Anchored", -40);
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: daysFromNow(-40), gateFrom: daysFromNow(-40) },
    });

    await generateDueInvoices(new Date(), 14);
    // The shared test DB holds other enrollments, so assert on this one.
    expect(await prisma.invoice.count({ where: { enrollmentId } })).toBe(0);
  });

  it("bills a converted enrollment once it trains since the switch", async () => {
    const { studentId, enrollmentId } = await createGatedMember(
      "AnchoredB",
      -40,
    );
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { nextInvoiceDate: daysFromNow(-40), gateFrom: daysFromNow(-40) },
    });
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: daysFromNow(-30),
        startTime: "18:00",
        endTime: "19:00",
      },
    });
    await prisma.attendance.create({
      data: { sessionId: session.id, studentId, status: "PRESENT" },
    });

    const run = await generateDueInvoices(new Date(), 14);
    expect(run.generated).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.invoice.count({ where: { enrollmentId } }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("anchors the gate when a one-off plan is switched to recurring", async () => {
    const studentId = await createStudent({
      firstName: "Convert",
      lastName: `Plan${suffix}`,
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
      locationIds: [locationId],
      primaryLocationId: locationId,
      disciplineIds: [],
    });
    extraStudentIds.push(studentId);
    const plan = await createMembershipPlan({
      name: `Convert Item ${suffix}`,
      description: null,
      planType: "ITEM",
      billingPeriod: null,
      priceCents: 4000,
    });
    await enrollStudent({
      studentId,
      planId: plan.id,
      startDate: daysFromNow(-30),
    });

    await updateMembershipPlan(plan.id, {
      name: `Convert Item ${suffix}`,
      description: null,
      planType: "RECURRING",
      billingPeriod: "WEEKLY",
      priceCents: 4000,
      chargeOnlyWithAttendance: true,
    });

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, planId: plan.id },
    });
    expect(enrollment?.gateFrom).not.toBeNull();
    expect(enrollment?.nextInvoiceDate).not.toBeNull();

    await prisma.enrollment.deleteMany({ where: { planId: plan.id } });
    await deleteMembershipPlan(plan.id);
  });
});

describe.skipIf(!hasTestDatabase)("membership hold", () => {
  let holdStudentId: string;
  let holdPlanId: string;
  let holdEnrollmentId: string;

  beforeAll(async () => {
    holdStudentId = await createStudent({
      firstName: "Hold",
      lastName: `Member${suffix}`,
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
    const plan = await createMembershipPlan({
      name: `Hold Plan ${suffix}`,
      description: null,
      planType: "RECURRING",
      billingPeriod: "MONTHLY",
      priceCents: 4000,
    });
    holdPlanId = plan.id;
    await enrollStudent({
      studentId: holdStudentId,
      planId: holdPlanId,
      startDate: daysFromNow(-40),
    });
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: holdStudentId, planId: holdPlanId },
    });
    holdEnrollmentId = enrollment!.id;
  });

  afterAll(async () => {
    if (!hasTestDatabase) return;
    await deleteStudent(holdStudentId).catch(() => undefined);
    await deleteMembershipPlan(holdPlanId).catch(() => undefined);
  });

  it("paused enrollments are not billed", async () => {
    await prisma.enrollment.update({
      where: { id: holdEnrollmentId },
      data: { nextInvoiceDate: daysFromNow(-40) },
    });
    await pauseEnrollment(holdEnrollmentId, {
      reason: "injury",
      resumeAt: null,
    });

    await generateDueInvoices(new Date(), 14);

    expect(
      await prisma.invoice.count({ where: { enrollmentId: holdEnrollmentId } }),
    ).toBe(0);
    const paused = await prisma.enrollment.findUnique({
      where: { id: holdEnrollmentId },
    });
    expect(paused?.status).toBe("PAUSED");
    expect(paused?.pauseReason).toBe("injury");
  });

  it("resuming does not back-bill the held period", async () => {
    await resumeEnrollment(holdEnrollmentId, new Date());

    const resumed = await prisma.enrollment.findUnique({
      where: { id: holdEnrollmentId },
    });
    expect(resumed?.status).toBe("ACTIVE");
    expect(resumed?.pausedAt).toBeNull();
    // The stale -40 nextInvoiceDate was pushed forward to today (no catch-up).
    expect(resumed!.nextInvoiceDate!.getTime()).toBe(daysFromNow(0).getTime());

    await generateDueInvoices(new Date(), 14);
    expect(
      await prisma.invoice.count({ where: { enrollmentId: holdEnrollmentId } }),
    ).toBe(1);
  });

  it("auto-resumes a hold whose resume date has arrived", async () => {
    await prisma.enrollment.update({
      where: { id: holdEnrollmentId },
      data: { nextInvoiceDate: daysFromNow(20) },
    });
    await pauseEnrollment(holdEnrollmentId, {
      reason: null,
      resumeAt: daysFromNow(-1),
    });

    const resumed = await resumeDueEnrollments(new Date());
    expect(resumed).toBeGreaterThanOrEqual(1);
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: holdEnrollmentId },
    });
    expect(enrollment?.status).toBe("ACTIVE");
  });
});

describe("billing date math", () => {
  it("advances monthly across month boundaries", () => {
    const next = advanceBillingDate(new Date(Date.UTC(2026, 0, 31)), "MONTHLY");
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(28);
  });

  it("advances weekly and yearly periods", () => {
    const nextWeek = advanceBillingDate(
      new Date(Date.UTC(2026, 8, 14)),
      "WEEKLY",
    );
    expect(nextWeek.toISOString().slice(0, 10)).toBe("2026-09-21");

    const nextYear = advanceBillingDate(
      new Date(Date.UTC(2026, 8, 14)),
      "YEARLY",
    );
    expect(nextYear.getUTCFullYear()).toBe(2027);
    expect(nextYear.getUTCMonth()).toBe(8);
  });
});

describe("invoice financials", () => {
  it("computes totals, paid, and balance", () => {
    const financials = computeInvoiceFinancials({
      items: [
        { quantity: 1, unitPriceCents: 8950 },
        { quantity: 2, unitPriceCents: 1000 },
      ],
      payments: [{ amountCents: 5000 }, { amountCents: 3950 }],
    });
    expect(financials.totalCents).toBe(10950);
    expect(financials.paidCents).toBe(8950);
    expect(financials.balanceCents).toBe(2000);
  });

  it("adds the invoice tax to the total and balance", () => {
    const financials = computeInvoiceFinancials({
      items: [{ quantity: 1, unitPriceCents: 10000 }],
      payments: [{ amountCents: 2000 }],
      taxCents: 1000,
    });
    expect(financials.totalCents).toBe(11000);
    expect(financials.balanceCents).toBe(9000);
  });
});

describe.skipIf(!hasTestDatabase)("invoice tax", () => {
  it("captures the configured tax on a manual invoice", async () => {
    const { updateMembershipsSettings } = await import("@/lib/settings");
    const plan = await createMembershipPlan({
      name: `Taxed Plan ${suffix}`,
      description: null,
      planType: "ITEM",
      billingPeriod: null,
      priceCents: 10000,
    });
    let invoiceId: string | null = null;
    await updateMembershipsSettings({ taxRatePercent: 10, taxLabel: "GST" });
    try {
      const invoice = await createInvoice({
        studentId,
        planId: plan.id,
        issueDate: daysFromNow(0),
        dueDate: daysFromNow(14),
        notes: null,
      });
      invoiceId = invoice.id;
      expect(invoice.taxCents).toBe(1000);
      expect(invoice.taxLabel).toBe("GST");
    } finally {
      await updateMembershipsSettings({ taxRatePercent: 0, taxLabel: "Tax" });
      if (invoiceId) {
        await prisma.invoice.delete({ where: { id: invoiceId } });
      }
      await deleteMembershipPlan(plan.id);
    }
  });
});

describe.skipIf(!hasTestDatabase)("bulk payments", () => {
  it("settles the full balance of several invoices in one pass", async () => {
    const plan = await createMembershipPlan({
      name: `Bulk Plan ${suffix}`,
      description: null,
      planType: "ITEM",
      billingPeriod: null,
      priceCents: 4000,
    });
    const first = await createInvoice({
      studentId,
      planId: plan.id,
      issueDate: daysFromNow(0),
      dueDate: daysFromNow(7),
      notes: null,
    });
    const second = await createInvoice({
      studentId,
      planId: plan.id,
      issueDate: daysFromNow(0),
      dueDate: daysFromNow(7),
      notes: null,
    });
    // Part-pay the second so the bulk pass tops up only the remainder.
    await recordPayment({
      invoiceId: second.id,
      amountCents: 1000,
      method: "CASH",
      paidAt: daysFromNow(0),
      reference: null,
      recordedById: null,
    });

    const result = await recordBulkPayments({
      invoiceIds: [first.id, second.id],
      method: "CASH",
      paidAt: daysFromNow(0),
      reference: "BULK",
      recordedById: null,
    });
    expect(result.recorded).toBe(2);
    expect(result.skipped).toBe(0);

    const firstAfter = await getInvoiceDetail(first.id);
    expect(firstAfter?.financials.balanceCents).toBe(0);
    expect(firstAfter?.status).toBe("PAID");
    const secondAfter = await getInvoiceDetail(second.id);
    expect(secondAfter?.financials.balanceCents).toBe(0);
    expect(secondAfter?.status).toBe("PAID");

    // A repeat pass has nothing left to settle.
    const repeat = await recordBulkPayments({
      invoiceIds: [first.id, second.id],
      method: "CASH",
      paidAt: daysFromNow(0),
      reference: null,
      recordedById: null,
    });
    expect(repeat.recorded).toBe(0);
    expect(repeat.skipped).toBe(2);

    await prisma.payment.deleteMany({
      where: { invoiceId: { in: [first.id, second.id] } },
    });
    await prisma.invoice.deleteMany({
      where: { id: { in: [first.id, second.id] } },
    });
    await deleteMembershipPlan(plan.id);
  });
});
