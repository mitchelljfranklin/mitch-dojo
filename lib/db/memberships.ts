import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getMembershipsSettings } from "@/lib/settings";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

type PlanTypeValue = "RECURRING" | "ITEM";
type BillingPeriodValue = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type PaymentMethodValue = "CASH" | "BANK_TRANSFER" | "CARD_TERMINAL" | "OTHER";

// ---- date helpers -------------------------------------------------------

function utcMidnightOf(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

export function startOfToday(now: Date = new Date()): Date {
  return utcMidnightOf(now);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// Advances a billing date by one period. Calendar-month arithmetic is used
// for MONTHLY/QUARTERLY/YEARLY with end-of-month clamping (Jan 31 + 1 month
// = Feb 28) so billing lands on the same day-of-month instead of drifting.
export function advanceBillingDate(
  date: Date,
  period: BillingPeriodValue,
): Date {
  const next = new Date(date);
  switch (period) {
    case "WEEKLY":
      return addDays(next, 7);
    case "MONTHLY":
    case "QUARTERLY": {
      const months = period === "MONTHLY" ? 1 : 3;
      const originalDay = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + months);
      const daysInTargetMonth = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(originalDay, daysInTargetMonth));
      return next;
    }
    case "YEARLY": {
      const originalDay = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      // Feb 29 birthdays land on Feb 28 in non-leap years.
      if (originalDay === 29 && next.getUTCMonth() === 1) {
        const daysInFebruary = new Date(
          Date.UTC(next.getUTCFullYear(), 2, 0),
        ).getUTCDate();
        next.setUTCDate(Math.min(originalDay, daysInFebruary));
      } else {
        next.setUTCDate(originalDay);
      }
      return next;
    }
    default:
      return next;
  }
}

// ---- plans --------------------------------------------------------------

export type MembershipPlanWithCounts = Prisma.MembershipPlanGetPayload<{
  include: { _count: { select: { enrollments: true } } };
}>;

export async function listMembershipPlans(): Promise<
  MembershipPlanWithCounts[]
> {
  return prisma.membershipPlan.findMany({
    include: {
      _count: {
        select: {
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function listActivePlansForSelection() {
  return prisma.membershipPlan.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      planType: true,
      billingPeriod: true,
      priceCents: true,
      chargeOnlyWithAttendance: true,
    },
    orderBy: [{ planType: "asc" }, { name: "asc" }],
  });
}

export async function createMembershipPlan(input: {
  name: string;
  description: string | null;
  planType: PlanTypeValue;
  billingPeriod: BillingPeriodValue | null;
  priceCents: number;
  chargeOnlyWithAttendance?: boolean;
}) {
  return prisma.membershipPlan.create({
    data: {
      name: input.name,
      description: input.description,
      planType: input.planType,
      billingPeriod: input.billingPeriod,
      priceCents: input.priceCents,
      // Only meaningful for recurring plans; keep the flag off for items so
      // editing a one-off plan can never leave a stray value behind.
      chargeOnlyWithAttendance:
        input.planType === "RECURRING"
          ? (input.chargeOnlyWithAttendance ?? false)
          : false,
    },
  });
}

export async function updateMembershipPlan(
  planId: string,
  input: {
    name: string;
    description: string | null;
    planType: PlanTypeValue;
    billingPeriod: BillingPeriodValue | null;
    priceCents: number;
    chargeOnlyWithAttendance?: boolean;
  },
) {
  return prisma.membershipPlan.update({
    where: { id: planId },
    data: {
      name: input.name,
      description: input.description,
      planType: input.planType,
      billingPeriod: input.billingPeriod,
      priceCents: input.priceCents,
      chargeOnlyWithAttendance:
        input.planType === "RECURRING"
          ? (input.chargeOnlyWithAttendance ?? false)
          : false,
    },
  });
}

export async function setMembershipPlanActive(
  planId: string,
  isActive: boolean,
) {
  return prisma.membershipPlan.update({
    where: { id: planId },
    data: { isActive },
  });
}

export async function deleteMembershipPlan(planId: string): Promise<void> {
  const activeEnrollments = await prisma.enrollment.count({
    where: { planId, status: "ACTIVE" },
  });
  if (activeEnrollments > 0) {
    throw new Error(
      "This plan has active enrollments — end them or deactivate the plan instead.",
    );
  }
  const anyEnrollments = await prisma.enrollment.count({ where: { planId } });
  if (anyEnrollments > 0) {
    throw new Error(
      "This plan has historical enrollments and cannot be deleted — deactivate it instead.",
    );
  }
  await prisma.membershipPlan.delete({ where: { id: planId } });
}

// ---- enrollments --------------------------------------------------------

export async function enrollStudent(input: {
  studentId: string;
  planId: string;
  startDate: Date;
}): Promise<{ outcome: "created" | "already_enrolled" }> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.planId },
  });
  if (!plan || !plan.isActive) {
    throw new Error("That plan no longer exists or is inactive.");
  }

  const existing = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, planId: plan.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return { outcome: "already_enrolled" };
  }

  await prisma.enrollment.create({
    data: {
      studentId: input.studentId,
      planId: plan.id,
      startDate: input.startDate,
      nextInvoiceDate:
        plan.planType === "RECURRING" ? startOfToday(input.startDate) : null,
    },
  });
  return { outcome: "created" };
}

export async function endEnrollment(enrollmentId: string, endDate: Date) {
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: "ENDED", endDate, nextInvoiceDate: null },
  });
}

export async function listStudentEnrollments(studentId: string) {
  return prisma.enrollment.findMany({
    where: { studentId },
    include: { plan: true },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
}

// ---- invoices -----------------------------------------------------------

async function nextInvoiceNumber(): Promise<number> {
  const aggregate = await prisma.invoice.aggregate({
    _max: { number: true },
  });
  return (aggregate._max.number ?? 0) + 1;
}

export type InvoiceFinancials = {
  totalCents: number;
  paidCents: number;
  balanceCents: number;
};

export function computeInvoiceFinancials(invoice: {
  items: { quantity: number; unitPriceCents: number }[];
  payments: { amountCents: number }[];
}): InvoiceFinancials {
  const totalCents = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  const paidCents = invoice.payments.reduce(
    (sum, payment) => sum + payment.amountCents,
    0,
  );
  return { totalCents, paidCents, balanceCents: totalCents - paidCents };
}

export type CreateInvoiceInput = {
  studentId: string;
  planId: string;
  issueDate: Date;
  dueDate: Date;
  notes: string | null;
  locationId?: string | null;
  enrollmentId?: string | null;
  createdById?: string | null;
};

export async function createInvoice(input: CreateInvoiceInput) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.planId },
  });
  if (!plan) {
    throw new Error("That plan no longer exists.");
  }

  const number = await nextInvoiceNumber();
  return prisma.invoice.create({
    data: {
      number,
      studentId: input.studentId,
      enrollmentId: input.enrollmentId ?? null,
      locationId: input.locationId ?? null,
      status: "OPEN",
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      notes: input.notes,
      createdById: input.createdById ?? null,
      items: {
        create: {
          description: plan.name,
          quantity: 1,
          unitPriceCents: plan.priceCents,
        },
      },
    },
  });
}

export type InvoiceListRow = Prisma.InvoiceGetPayload<{
  include: {
    student: { select: { id: true; firstName: true; lastName: true } };
    location: { select: { id: true; name: true } };
    items: { select: { quantity: true; unitPriceCents: true } };
    payments: { select: { amountCents: true } };
  };
}> & { financials: InvoiceFinancials; isOverdue: boolean };

export type InvoiceListFilters = {
  status?: "OPEN" | "PAID" | "VOID";
  overdueOnly?: boolean;
  studentId?: string;
  studentName?: string;
  locationId?: string;
};

export async function listInvoices(
  filters: InvoiceListFilters,
  page = 1,
  pageSize = 25,
): Promise<{ rows: InvoiceListRow[]; total: number }> {
  const where: Prisma.InvoiceWhereInput = {};
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.status) where.status = filters.status;
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.overdueOnly) {
    where.status = "OPEN";
    where.dueDate = { lt: startOfToday() };
  }
  if (filters.studentName && filters.studentName.trim().length > 0) {
    const nameQuery = filters.studentName.trim();
    where.student = {
      OR: [
        { firstName: { contains: nameQuery, mode: "insensitive" } },
        { lastName: { contains: nameQuery, mode: "insensitive" } },
      ],
    };
  }

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        location: { select: { id: true, name: true } },
        items: { select: { quantity: true, unitPriceCents: true } },
        payments: { select: { amountCents: true } },
      },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  const today = startOfToday();
  return {
    rows: rows.map((invoice) => ({
      ...invoice,
      financials: computeInvoiceFinancials(invoice),
      isOverdue: invoice.status === "OPEN" && invoice.dueDate < today,
    })),
    total,
  };
}

export async function getInvoiceDetail(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      location: { select: { id: true, name: true } },
      enrollment: { include: { plan: true } },
      items: true,
      payments: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
      },
    },
  });
  if (!invoice) return null;

  const financials = computeInvoiceFinancials(invoice);
  return {
    ...invoice,
    financials,
    isOverdue: invoice.status === "OPEN" && invoice.dueDate < startOfToday(),
  };
}

export async function recordPayment(input: {
  invoiceId: string;
  amountCents: number;
  method: PaymentMethodValue;
  paidAt: Date;
  reference: string | null;
  recordedById: string | null;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    include: {
      items: { select: { quantity: true, unitPriceCents: true } },
      payments: { select: { amountCents: true } },
    },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "VOID") {
    throw new Error("This invoice is void — payments cannot be recorded.");
  }

  const financials = computeInvoiceFinancials(invoice);
  if (input.amountCents > financials.balanceCents) {
    throw new Error(
      "The payment exceeds the outstanding balance on this invoice.",
    );
  }

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: input.invoiceId,
        amountCents: input.amountCents,
        method: input.method,
        paidAt: input.paidAt,
        reference: input.reference,
        recordedById: input.recordedById,
      },
    }),
    prisma.invoice.update({
      where: { id: input.invoiceId },
      data: {
        status: input.amountCents === financials.balanceCents ? "PAID" : "OPEN",
      },
    }),
  ]);
  return payment;
}

export async function deletePayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          items: { select: { quantity: true, unitPriceCents: true } },
          payments: { select: { id: true, amountCents: true } },
        },
      },
    },
  });
  if (!payment) throw new Error("Payment not found.");
  if (payment.invoice.status === "VOID") {
    throw new Error("This invoice is void — its payments cannot be changed.");
  }

  const remainingCents = payment.invoice.payments
    .filter((row) => row.id !== paymentId)
    .reduce((sum, row) => sum + row.amountCents, 0);
  const totalCents = computeInvoiceFinancials(payment.invoice).totalCents;

  await prisma.$transaction([
    prisma.payment.delete({ where: { id: paymentId } }),
    prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: remainingCents >= totalCents ? "PAID" : "OPEN" },
    }),
  ]);
}

export async function voidInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "PAID") {
    throw new Error(
      "A paid invoice cannot be voided — delete its payments first.",
    );
  }
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID" },
  });
}

// ---- scheduled invoice generation ---------------------------------------

// Safety cap so a corrupt nextInvoiceDate (years in the past) cannot create
// thousands of invoices in one tick.
const MAX_CATCH_UP_INVOICES = 24;

export type GenerateInvoicesResult = {
  generated: number;
  // Cycles skipped because an attendance-gated plan's member had no trained
  // session since the previous invoice. Surfaced to the caller so the
  // scheduler result and the manual "Generate now" report can say so.
  skipped: number;
};

export async function generateDueInvoices(
  now: Date = new Date(),
  issueDueDays: number = 14,
): Promise<GenerateInvoicesResult> {
  const today = startOfToday(now);
  const dueEnrollments = await prisma.enrollment.findMany({
    where: {
      status: "ACTIVE",
      nextInvoiceDate: { lte: today },
      plan: { planType: "RECURRING", isActive: true },
    },
    include: { plan: true },
  });

  let generated = 0;
  let skipped = 0;
  for (const enrollment of dueEnrollments) {
    const period = enrollment.plan.billingPeriod ?? "MONTHLY";
    let cycleDate = startOfToday(enrollment.nextInvoiceDate ?? today);
    let iterations = 0;

    // Attendance-gated plans bill only when the member trained since the
    // last invoice. The window is [previous invoice issueDate, cycleDate):
    // in-advance billing means each invoice covers the cycle it opens, so
    // the observable check is "did they train during the period just
    // billed?". The enrollment's FIRST invoice is exempt — there is no
    // previous period, and the dojo chose to enroll the member.
    const gated = enrollment.plan.chargeOnlyWithAttendance;
    const lastInvoice = await prisma.invoice.findFirst({
      where: { enrollmentId: enrollment.id },
      orderBy: { issueDate: "desc" },
      select: { issueDate: true },
    });
    let previousIssueDate = lastInvoice?.issueDate ?? null;

    while (cycleDate <= today && iterations < MAX_CATCH_UP_INVOICES) {
      if (gated && previousIssueDate !== null) {
        const attended = await prisma.attendance.count({
          where: {
            studentId: enrollment.studentId,
            status: {
              in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
            },
            session: { date: { gte: previousIssueDate, lt: cycleDate } },
          },
        });
        if (attended === 0) {
          // No attendance since the last invoice — skip the charge, but
          // keep the cycle moving so a later training still bills.
          skipped++;
          cycleDate = advanceBillingDate(cycleDate, period);
          iterations++;
          continue;
        }
      }

      const number = await nextInvoiceNumber();
      await prisma.invoice.create({
        data: {
          number,
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          status: "OPEN",
          issueDate: cycleDate,
          dueDate: addDays(cycleDate, issueDueDays),
          notes: null,
          items: {
            create: {
              description: enrollment.plan.name,
              quantity: 1,
              unitPriceCents: enrollment.plan.priceCents,
            },
          },
        },
      });
      generated++;
      previousIssueDate = cycleDate;
      cycleDate = advanceBillingDate(cycleDate, period);
      iterations++;
    }

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { nextInvoiceDate: cycleDate },
    });
  }

  return { generated, skipped };
}

// ---- overdue & suspension -----------------------------------------------

export type OverdueStudentRow = {
  studentId: string;
  studentName: string;
  invoiceId: string;
  invoiceNumber: number;
  dueDate: Date;
  daysOverdue: number;
  balanceCents: number;
};

export async function listOverdueStudents(
  limit = 10,
  now: Date = new Date(),
): Promise<OverdueStudentRow[]> {
  const today = startOfToday(now);
  const invoices = await prisma.invoice.findMany({
    where: { status: "OPEN", dueDate: { lt: today } },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      items: { select: { quantity: true, unitPriceCents: true } },
      payments: { select: { amountCents: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return invoices
    .map((invoice) => {
      const daysOverdue = Math.floor(
        (today.getTime() - invoice.dueDate.getTime()) / 86_400_000,
      );
      return {
        studentId: invoice.student.id,
        studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        dueDate: invoice.dueDate,
        daysOverdue,
        balanceCents: computeInvoiceFinancials(invoice).balanceCents,
      };
    })
    .filter((row) => row.balanceCents > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit);
}

export type StudentSuspension = {
  suspended: boolean;
  daysOverdue: number;
  suspendAfterDays: number;
};

// A student is suspended when any OPEN invoice is more than
// suspendAfterOverdueDays past due (0 disables suspension).
export async function getStudentSuspension(
  studentId: string,
  now: Date = new Date(),
): Promise<StudentSuspension> {
  const { suspendAfterOverdueDays } = await getMembershipsSettings();
  const today = startOfToday(now);

  const invoice = await prisma.invoice.findFirst({
    where: { studentId, status: "OPEN", dueDate: { lt: today } },
    include: {
      items: { select: { quantity: true, unitPriceCents: true } },
      payments: { select: { amountCents: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  if (!invoice) {
    return {
      suspended: false,
      daysOverdue: 0,
      suspendAfterDays: suspendAfterOverdueDays,
    };
  }

  const daysOverdue = Math.floor(
    (today.getTime() - invoice.dueDate.getTime()) / 86_400_000,
  );
  const hasBalance = computeInvoiceFinancials(invoice).balanceCents > 0;

  return {
    suspended:
      hasBalance &&
      suspendAfterOverdueDays > 0 &&
      daysOverdue >= suspendAfterOverdueDays,
    daysOverdue,
    suspendAfterDays: suspendAfterOverdueDays,
  };
}
