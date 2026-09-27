import { prisma } from "@/lib/prisma";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

// Reporting aggregates for the Reports page and its CSV exports. Computed in
// JS from a bounded set of queries — single-dojo volume, same approach as
// lib/db/analytics.ts.

function utcMidnightOf(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// --------------- attendance rates ---------------

export type AttendanceRateRow = {
  studentId: string;
  name: string;
  attended: number;
  eligible: number;
  // Percentage 0–100, or null when the student had no eligible sessions.
  ratePercent: number | null;
};

export type AttendanceRatesReport = {
  rows: AttendanceRateRow[];
  averageRatePercent: number | null;
  periodDays: number;
};

// A student is "eligible" for a held session when it is at one of their
// locations and for one of their disciplines (the same population the
// check-in roster uses). Rate = attended eligible sessions ÷ eligible
// sessions, over the trailing period, counting only sessions up to today.
export async function getAttendanceRates(
  days = 30,
  locationId?: string,
  now: Date = new Date(),
): Promise<AttendanceRatesReport> {
  const today = utcMidnightOf(now);
  const rangeEnd = addDays(today, 1);
  const rangeStart = addDays(rangeEnd, -(days + 1));

  const [sessions, students, attendanceRows] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        date: { gte: rangeStart, lt: rangeEnd },
        ...(locationId ? { locationId } : {}),
        attendance: { some: {} },
      },
      select: {
        id: true,
        locationId: true,
        course: { select: { disciplineId: true } },
      },
    }),
    prisma.student.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        ...(locationId ? { locations: { some: { locationId } } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        locations: { select: { locationId: true } },
        disciplines: { select: { disciplineId: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        status: { in: TRAINED_STATUSES as unknown as AttendanceStatusValue[] },
        session: {
          date: { gte: rangeStart, lt: rangeEnd },
          ...(locationId ? { locationId } : {}),
        },
      },
      select: { studentId: true, sessionId: true },
    }),
  ]);

  const attendedKeys = new Set(
    attendanceRows.map((row) => `${row.studentId}|${row.sessionId}`),
  );

  const rows: AttendanceRateRow[] = students.map((student) => {
    const locationIds = new Set(
      student.locations.map((link) => link.locationId),
    );
    const disciplineIds = new Set(
      student.disciplines.map((link) => link.disciplineId),
    );
    const eligibleSessions = sessions.filter(
      (session) =>
        locationIds.has(session.locationId) &&
        disciplineIds.has(session.course.disciplineId),
    );
    const attended = eligibleSessions.filter((session) =>
      attendedKeys.has(`${student.id}|${session.id}`),
    ).length;
    const eligible = eligibleSessions.length;
    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      attended,
      eligible,
      ratePercent:
        eligible > 0 ? Math.round((attended / eligible) * 100) : null,
    };
  });

  const rated = rows.filter((row) => row.ratePercent !== null);
  const averageRatePercent =
    rated.length > 0
      ? Math.round(
          rated.reduce((sum, row) => sum + (row.ratePercent ?? 0), 0) /
            rated.length,
        )
      : null;

  return {
    rows: rows.sort((a, b) => (b.ratePercent ?? -1) - (a.ratePercent ?? -1)),
    averageRatePercent,
    periodDays: days,
  };
}

// Single-student rate for the student record.
export async function getStudentAttendanceRate(
  studentId: string,
  days = 90,
  now: Date = new Date(),
): Promise<number | null> {
  const report = await getAttendanceRates(days, undefined, now);
  return (
    report.rows.find((row) => row.studentId === studentId)?.ratePercent ?? null
  );
}

// --------------- birthdays & anniversaries ---------------

export type CelebrationRow = {
  studentId: string;
  name: string;
  day: number;
  // Age turning (birthdays) or years celebrated (anniversaries).
  years: number;
};

export type CelebrationsReport = {
  birthdays: CelebrationRow[];
  anniversaries: CelebrationRow[];
};

// Students with a birthday or join anniversary in the current month, sorted
// by day. Returns the whole month regardless of whether the day has passed.
export async function getCelebrations(
  now: Date = new Date(),
): Promise<CelebrationsReport> {
  const month = now.getMonth();
  const year = now.getFullYear();

  const students = await prisma.student.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      joinedAt: true,
    },
  });

  const birthdays: CelebrationRow[] = [];
  const anniversaries: CelebrationRow[] = [];
  for (const student of students) {
    const name = `${student.firstName} ${student.lastName}`;
    if (student.dateOfBirth && student.dateOfBirth.getUTCMonth() === month) {
      birthdays.push({
        studentId: student.id,
        name,
        day: student.dateOfBirth.getUTCDate(),
        years: year - student.dateOfBirth.getUTCFullYear(),
      });
    }
    if (student.joinedAt.getUTCMonth() === month) {
      const years = year - student.joinedAt.getUTCFullYear();
      if (years >= 1) {
        anniversaries.push({
          studentId: student.id,
          name,
          day: student.joinedAt.getUTCDate(),
          years,
        });
      }
    }
  }

  return {
    birthdays: birthdays.sort((a, b) => a.day - b.day),
    anniversaries: anniversaries.sort((a, b) => a.day - b.day),
  };
}

// --------------- revenue by plan + recurring estimate ---------------

export type RevenueByPlanRow = {
  // null plan = one-off invoices not tied to an enrollment plan.
  planId: string | null;
  planName: string;
  collectedCents: number;
  payments: number;
};

export type RecurringRevenueRow = {
  planId: string;
  planName: string;
  billingPeriod: string | null;
  activeEnrollments: number;
  monthlyCents: number;
};

export type RevenueReport = {
  months: number;
  byPlan: RevenueByPlanRow[];
  totalCollectedCents: number;
  recurring: {
    monthlyCents: number;
    activeEnrollments: number;
    byPlan: RecurringRevenueRow[];
  };
};

// Normalise a plan price to a monthly figure (WEEKLY × 52/12, YEARLY ÷ 12).
function monthlyCents(
  priceCents: number,
  billingPeriod: string | null,
): number {
  switch (billingPeriod) {
    case "WEEKLY":
      return Math.round((priceCents * 52) / 12);
    case "QUARTERLY":
      return Math.round(priceCents / 3);
    case "YEARLY":
      return Math.round(priceCents / 12);
    case "MONTHLY":
    default:
      return priceCents;
  }
}

export async function getRevenueReport(
  months = 6,
  now: Date = new Date(),
): Promise<RevenueReport> {
  const rangeStart = new Date(
    Date.UTC(now.getFullYear(), now.getMonth() - (months - 1), 1),
  );
  const rangeEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  const queryStart = new Date(rangeStart.getTime() - 86_400_000);
  const queryEnd = new Date(rangeEnd.getTime() + 86_400_000);

  const [payments, activeEnrollments] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: queryStart, lt: queryEnd } },
      select: {
        amountCents: true,
        invoice: {
          select: {
            enrollment: {
              select: { planId: true, plan: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { status: "ACTIVE", plan: { planType: "RECURRING" } },
      select: {
        planId: true,
        plan: {
          select: {
            name: true,
            priceCents: true,
            billingPeriod: true,
          },
        },
      },
    }),
  ]);

  const byPlanMap = new Map<string, RevenueByPlanRow>();
  let totalCollectedCents = 0;
  for (const payment of payments) {
    const plan = payment.invoice.enrollment?.plan ?? null;
    const planId = payment.invoice.enrollment?.planId ?? null;
    const key = planId ?? "__other__";
    const existing = byPlanMap.get(key) ?? {
      planId,
      planName: plan?.name ?? "One-off / other",
      collectedCents: 0,
      payments: 0,
    };
    existing.collectedCents += payment.amountCents;
    existing.payments += 1;
    byPlanMap.set(key, existing);
    totalCollectedCents += payment.amountCents;
  }

  const recurringMap = new Map<string, RecurringRevenueRow>();
  for (const enrollment of activeEnrollments) {
    const existing = recurringMap.get(enrollment.planId) ?? {
      planId: enrollment.planId,
      planName: enrollment.plan.name,
      billingPeriod: enrollment.plan.billingPeriod,
      activeEnrollments: 0,
      monthlyCents: 0,
    };
    existing.activeEnrollments += 1;
    existing.monthlyCents += monthlyCents(
      enrollment.plan.priceCents,
      enrollment.plan.billingPeriod,
    );
    recurringMap.set(enrollment.planId, existing);
  }

  const recurringRows = [...recurringMap.values()].sort(
    (a, b) => b.monthlyCents - a.monthlyCents,
  );

  return {
    months,
    byPlan: [...byPlanMap.values()].sort(
      (a, b) => b.collectedCents - a.collectedCents,
    ),
    totalCollectedCents,
    recurring: {
      monthlyCents: recurringRows.reduce(
        (sum, row) => sum + row.monthlyCents,
        0,
      ),
      activeEnrollments: recurringRows.reduce(
        (sum, row) => sum + row.activeEnrollments,
        0,
      ),
      byPlan: recurringRows,
    },
  };
}
