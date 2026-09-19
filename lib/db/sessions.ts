import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getAttendanceCountsBySession } from "@/lib/db/attendance";

// Sessions are generated this many days ahead so attendance/check-in always
// has concrete rows to attach to, even before anyone opens the schedule.
const SESSION_GENERATION_DAYS_AHEAD = 14;

export type WeeklySlot = {
  weekday: number;
  startTime: string;
  endTime: string;
};

function utcMidnightOf(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

// Generates ClassSession rows for all active courses covering
// [today, today + N days]. Idempotent: the (courseId, date, startTime)
// unique constraint plus skipDuplicates makes repeated calls safe.
export async function ensureUpcomingSessions(
  now: Date = new Date(),
): Promise<number> {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    include: { trainingTimes: true },
  });

  const rows: {
    courseId: string;
    locationId: string;
    date: Date;
    startTime: string;
    endTime: string;
  }[] = [];

  for (
    let dayOffset = 0;
    dayOffset <= SESSION_GENERATION_DAYS_AHEAD;
    dayOffset++
  ) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const weekday = day.getDay();
    const date = new Date(
      Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()),
    );

    for (const course of courses) {
      for (const slot of course.trainingTimes) {
        if (slot.weekday !== weekday) continue;
        rows.push({
          courseId: course.id,
          locationId: course.locationId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
  }

  if (rows.length === 0) return 0;

  const existing = await prisma.classSession.findMany({
    where: {
      OR: rows.map((row) => ({
        courseId: row.courseId,
        date: row.date,
        startTime: row.startTime,
      })),
    },
    select: { courseId: true, date: true, startTime: true },
  });
  const existingKeys = new Set(
    existing.map(
      (row) => `${row.courseId}|${row.date.toISOString()}|${row.startTime}`,
    ),
  );

  const fresh = rows.filter(
    (row) =>
      !existingKeys.has(
        `${row.courseId}|${row.date.toISOString()}|${row.startTime}`,
      ),
  );
  if (fresh.length === 0) return 0;

  const result = await prisma.classSession.createMany({
    data: fresh,
    skipDuplicates: true,
  });
  return result.count;
}

// Finds or creates a ClassSession for a course on a given LOCAL calendar
// date — used for historical backfill and imports, where no generated
// session may exist for the date. Slot: the course's weekday training time
// (earliest start when several), else a default 18:00–19:00 slot.
export async function ensureHistoricalSession(
  courseId: string,
  date: Date,
): Promise<string> {
  const day = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const existing = await prisma.classSession.findFirst({
    where: { courseId, date: day },
    orderBy: { startTime: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { trainingTimes: true },
  });
  if (!course) throw new Error("Course not found.");

  const weekday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getDay();
  const weekdaySlots = course.trainingTimes
    .filter((slot) => slot.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const slot = weekdaySlots[0] ?? null;

  const created = await prisma.classSession.create({
    data: {
      courseId,
      locationId: course.locationId,
      date: day,
      startTime: slot?.startTime ?? "18:00",
      endTime: slot?.endTime ?? "19:00",
    },
  });
  return created.id;
}

export type SessionFilters = {
  courseId?: string;
  locationId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
};

export type SessionListItem = {
  id: string;
  courseId: string;
  courseName: string;
  locationName: string;
  trainerName: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  marked: number;
  trained: number;
};

export async function listSessions(
  filters?: SessionFilters,
): Promise<{ sessions: SessionListItem[]; totalCount: number }> {
  const where: Prisma.ClassSessionWhereInput = {};

  if (filters?.courseId) where.courseId = filters.courseId;
  if (filters?.locationId) where.locationId = filters.locationId;
  if (filters?.fromDate || filters?.toDate) {
    where.date = {};
    if (filters.fromDate) {
      where.date.gte = filters.fromDate;
    }
    if (filters?.toDate) {
      const end = new Date(filters.toDate);
      end.setDate(end.getDate() + 1);
      where.date.lt = end;
    }
  }

  const [rows, counted] = await Promise.all([
    prisma.classSession.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: filters?.pageSize ?? 50,
      skip: filters?.page ? (filters.page - 1) * (filters.pageSize ?? 50) : 0,
      include: {
        course: { include: { trainer: { select: { name: true } } } },
        location: { select: { name: true } },
      },
    }),
    prisma.classSession.count({ where }),
  ]);

  // Marked/trained counts per listed row (existing shared aggregation).
  const counts = await getAttendanceCountsBySession(rows.map((row) => row.id));

  const items = rows.map((session) => ({
    id: session.id,
    courseId: session.course.id,
    courseName: session.course.name,
    locationName: session.location.name,
    trainerName: session.course.trainer?.name ?? null,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    marked: counts.get(session.id)?.total ?? 0,
    trained: counts.get(session.id)?.trained ?? 0,
  }));

  return { sessions: items, totalCount: counted };
}

export async function setSessionStatus(
  sessionId: string,
  status: "SCHEDULED" | "CANCELLED",
): Promise<void> {
  await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? new Date() : null,
    },
  });
}

export type WeeklyScheduleSlot = {
  weekday: number;
  startTime: string;
  endTime: string;
  courseId: string;
  courseName: string;
  locationId: string;
  locationName: string;
  trainerName: string | null;
  isActive: boolean;
};

// The full weekly timetable across all courses, for the schedule view.
export async function getWeeklySchedule(): Promise<WeeklyScheduleSlot[]> {
  const courses = await prisma.course.findMany({
    include: {
      location: { select: { id: true, name: true } },
      trainer: { select: { name: true } },
      trainingTimes: true,
    },
  });

  const slots: WeeklyScheduleSlot[] = [];
  for (const course of courses) {
    for (const slot of course.trainingTimes) {
      slots.push({
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        courseId: course.id,
        courseName: course.name,
        locationId: course.location.id,
        locationName: course.location.name,
        trainerName: course.trainer?.name ?? null,
        isActive: course.isActive,
      });
    }
  }
  return slots;
}
