import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/lib/db/students";
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
    status: "ACTIVE",
    notes: null,
    locationIds: [],
    primaryLocationId: "",
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
