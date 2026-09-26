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
  getStudentSuspension,
  listInvoices,
  listOverdueStudents,
  recordPayment,
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
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
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

    const generated = await generateDueInvoices(new Date(), 14);
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
    const generated = await generateDueInvoices(new Date(), 14);
    expect(generated).toBe(0);
  });
});

describe.skipIf(!hasTestDatabase)("charge only with attendance", () => {
  let locationId: string;
  let courseId: string;
  let gatedPlanId: string;
  let gatedStudentId: string;

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
    let generated = await generateDueInvoices(new Date(), 14);
    expect(generated).toBeGreaterThanOrEqual(1);

    const enrollment = await prisma.enrollment.findFirst({
      where: { planId: gatedPlanId, studentId: gatedStudentId },
    });
    const firstInvoice = await prisma.invoice.findFirst({
      where: { enrollmentId: enrollment!.id },
      orderBy: { issueDate: "asc" },
    });
    expect(firstInvoice).not.toBeNull();

    // Second cycle arrives with NO attendance since the first invoice —
    // the run must generate nothing further and still advance the cycle.
    await prisma.enrollment.update({
      where: { id: enrollment!.id },
      data: { nextInvoiceDate: daysFromNow(-10) },
    });
    generated = await generateDueInvoices(new Date(), 14);
    const invoicesAfterSkip = await prisma.invoice.findMany({
      where: { enrollmentId: enrollment!.id },
    });
    expect(generated).toBe(0);
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
});
