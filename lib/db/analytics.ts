import { prisma } from "@/lib/prisma";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

// Read-only aggregates for the analytics page. Everything is computed from
// existing rows in JS after one bounded query per concern — the volume of a
// single dojo makes SQL group-bys unnecessary and keeps the buckets testable.

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

// --------------- overview counters ---------------

export type AnalyticsOverview = {
  activeStudents: number;
  trialStudents: number;
  activeEnrollments: number;
  revenueThisMonthCents: number;
  paymentsThisMonth: number;
};

export async function getAnalyticsOverview(
  now: Date = new Date(),
): Promise<AnalyticsOverview> {
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

  const [activeStudents, trialStudents, activeEnrollments, paymentAggregate] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.student.count({ where: { status: "TRIAL" } }),
      prisma.enrollment.count({
        where: {
          status: "ACTIVE",
          student: { status: { in: ["ACTIVE", "TRIAL"] } },
        },
      }),
      prisma.payment.aggregate({
        where: { paidAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

  return {
    activeStudents,
    trialStudents,
    activeEnrollments,
    revenueThisMonthCents: paymentAggregate._sum.amountCents ?? 0,
    paymentsThisMonth: paymentAggregate._count,
  };
}

// --------------- attendance trend (weekly) ---------------

export type AttendanceTrendBucket = {
  // ISO date (UTC midnight) of the bucket's first day.
  weekStart: string;
  attendances: number;
  uniqueAttendees: number;
  sessionsHeld: number;
};

export async function getAttendanceTrend(
  weeks = 12,
  locationId?: string,
  now: Date = new Date(),
): Promise<AttendanceTrendBucket[]> {
  const today = utcMidnightOf(now);
  // Buckets are 7-day windows ending today, so the last bucket is partial —
  // labelled by its start date either way.
  const rangeStart = addDays(today, -(weeks * 7 - 1));

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      status: { in: TRAINED_STATUSES as unknown as AttendanceStatusValue[] },
      session: {
        date: { gte: rangeStart, lte: today },
        ...(locationId ? { locationId } : {}),
      },
    },
    select: { studentId: true, session: { select: { date: true } } },
  });

  const heldSessions = await prisma.classSession.findMany({
    where: {
      date: { gte: rangeStart, lte: today },
      ...(locationId ? { locationId } : {}),
      attendance: { some: {} },
    },
    select: { date: true },
  });

  const buckets: AttendanceTrendBucket[] = [];
  for (let index = weeks - 1; index >= 0; index--) {
    const bucketStart = addDays(today, -(index * 7 + 6));
    const bucketEnd = addDays(today, -index * 7);
    const inBucket = attendanceRows.filter((row) => {
      const date = row.session.date.getTime();
      return date >= bucketStart.getTime() && date < bucketEnd.getTime();
    });

    buckets.push({
      weekStart: bucketStart.toISOString().slice(0, 10),
      attendances: inBucket.length,
      uniqueAttendees: new Set(inBucket.map((row) => row.studentId)).size,
      sessionsHeld: heldSessions.filter(
        (session) =>
          session.date.getTime() >= bucketStart.getTime() &&
          session.date.getTime() < bucketEnd.getTime(),
      ).length,
    });
  }

  return buckets;
}

// --------------- revenue trend (monthly) ---------------

export type RevenueTrendBucket = {
  // "YYYY-MM"
  month: string;
  collectedCents: number;
  payments: number;
};

export async function getRevenueTrend(
  months = 6,
  locationId?: string,
  now: Date = new Date(),
): Promise<RevenueTrendBucket[]> {
  const rangeStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );

  const payments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: rangeStart },
      invoice: {
        // Null-location invoices (school-wide memberships) only count
        // towards "All locations" — a filter excludes them by design.
        ...(locationId ? { locationId } : {}),
      },
    },
    select: { amountCents: true, paidAt: true },
  });

  const buckets: RevenueTrendBucket[] = [];
  for (let index = months - 1; index >= 0; index--) {
    const bucketStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    );
    const bucketEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index + 1, 1),
    );
    const monthPayments = payments.filter(
      (payment) =>
        payment.paidAt.getTime() >= bucketStart.getTime() &&
        payment.paidAt.getTime() < bucketEnd.getTime(),
    );

    buckets.push({
      month: bucketStart.toISOString().slice(0, 7),
      collectedCents: monthPayments.reduce(
        (sum, payment) => sum + payment.amountCents,
        0,
      ),
      payments: monthPayments.length,
    });
  }

  return buckets;
}

// --------------- retention signals ---------------

export type AtRiskStudent = {
  studentId: string;
  name: string;
  photoKey: string | null;
  lastAttendedAt: Date | null;
  daysSince: number;
};

// ACTIVE students with no trained session in the last `days` days. For
// students who never trained, daysSince falls back to days since joining —
// a natural grace period that spares fresh joiners. Ordered worst first.
export async function getAtRiskStudents(
  days = 14,
  limit = 10,
  now: Date = new Date(),
): Promise<AtRiskStudent[]> {
  const today = utcMidnightOf(now);

  const activeStudents = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoKey: true,
      joinedAt: true,
      attendance: {
        where: {
          status: {
            in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
          },
        },
        select: { session: { select: { date: true } } },
        orderBy: { session: { date: "desc" } },
        take: 1,
      },
    },
  });

  return activeStudents
    .map((student) => {
      const lastDate = student.attendance[0]?.session.date ?? null;
      return {
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        photoKey: student.photoKey,
        lastAttendedAt: lastDate,
        daysSince: lastDate
          ? Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000)
          : Math.floor(
              (today.getTime() - utcMidnightOf(student.joinedAt).getTime()) /
                86_400_000,
            ),
      };
    })
    .filter((row) => row.daysSince >= days)
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, limit);
}

// --------------- members per location ---------------

export type LocationMembership = {
  locationId: string;
  locationName: string;
  members: number;
};

export async function getMembersPerLocation(): Promise<LocationMembership[]> {
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          studentLocations: {
            where: { student: { status: { in: ["ACTIVE", "TRIAL"] } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return locations.map((location) => ({
    locationId: location.id,
    locationName: location.name,
    members: location._count.studentLocations,
  }));
}
