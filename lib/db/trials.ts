import { prisma } from "@/lib/prisma";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

// Trial pipeline (Phase 9). TRIAL students move NEW → CONTACTED →
// FIRST_CLASS → CONVERTED/LOST. Conversion flips the student to ACTIVE and
// stamps convertedAt; losing marks them INACTIVE and closes the pipeline.

export type TrialStageValue =
  "NEW" | "CONTACTED" | "FIRST_CLASS" | "CONVERTED" | "LOST";

export const TRIAL_STAGE_TRANSITIONS: Record<string, TrialStageValue[]> = {
  NEW: ["CONTACTED", "FIRST_CLASS", "LOST"],
  CONTACTED: ["FIRST_CLASS", "NEW", "LOST"],
  FIRST_CLASS: ["CONVERTED", "CONTACTED", "LOST"],
  CONVERTED: [],
  LOST: ["CONTACTED"],
};

export function canTransition(from: string, to: string): boolean {
  return (
    TRIAL_STAGE_TRANSITIONS[from]?.includes(to as TrialStageValue) ?? false
  );
}

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

// --------------- pipeline queries ---------------

export type TrialRow = {
  studentId: string;
  name: string;
  photoKey: string | null;
  stage: TrialStageValue;
  joinedAt: Date;
  daysInTrial: number;
  lastAttendedAt: Date | null;
  email: string | null;
  phone: string | null;
  guardianEmail: string | null;
  locationNames: string[];
};

export async function listTrials(now: Date = new Date()): Promise<{
  rows: TrialRow[];
  convertedThisMonth: number;
  lostCount: number;
}> {
  const today = utcMidnightOf(now);
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const trials = await prisma.student.findMany({
    where: { trialStage: { not: null } },
    include: {
      locations: { include: { location: { select: { name: true } } } },
    },
    orderBy: { joinedAt: "asc" },
  });

  // Last trained session date per trial in ONE bounded query (avoids N+1
  // lookups); trials are short-lived so a 120-day window is generous.
  const trialIds = trials.map((trial) => trial.id);
  const windowStart = addDays(today, -120);
  const attendanceRows = trialIds.length
    ? await prisma.attendance.findMany({
        where: {
          studentId: { in: trialIds },
          status: {
            in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
          },
          session: { date: { gte: windowStart } },
        },
        select: { studentId: true, session: { select: { date: true } } },
        orderBy: { session: { date: "desc" } },
      })
    : [];
  const lastAttendedByStudent = new Map<string, Date>();
  for (const row of attendanceRows) {
    if (!lastAttendedByStudent.has(row.studentId)) {
      lastAttendedByStudent.set(row.studentId, row.session.date);
    }
  }

  const rows: TrialRow[] = [];
  for (const trial of trials) {
    rows.push({
      studentId: trial.id,
      name: `${trial.firstName} ${trial.lastName}`,
      photoKey: trial.photoKey,
      stage: trial.trialStage as TrialStageValue,
      joinedAt: trial.joinedAt,
      daysInTrial: Math.floor(
        (today.getTime() - utcMidnightOf(trial.joinedAt).getTime()) /
          86_400_000,
      ),
      lastAttendedAt: lastAttendedByStudent.get(trial.id) ?? null,
      email: trial.email,
      phone: trial.phone,
      guardianEmail: trial.guardianEmail,
      locationNames: trial.locations.map((link) => link.location.name),
    });
  }

  const [convertedThisMonth, lostCount] = await Promise.all([
    prisma.student.count({
      where: { trialStage: "CONVERTED", convertedAt: { gte: monthStart } },
    }),
    prisma.student.count({ where: { trialStage: "LOST" } }),
  ]);

  return { rows, convertedThisMonth, lostCount };
}

// --------------- stage transitions ---------------

export async function setTrialStage(
  studentId: string,
  stage: TrialStageValue,
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true, trialStage: true, firstName: true },
  });
  if (!student || !student.trialStage) {
    throw new Error("That student is not a managed trial.");
  }
  if (!canTransition(student.trialStage, stage)) {
    throw new Error(
      `Cannot move a trial from ${student.trialStage} to ${stage}.`,
    );
  }

  if (stage === "CONVERTED") {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        status: "ACTIVE",
        trialStage: "CONVERTED",
        convertedAt: new Date(),
      },
    });
    return;
  }

  if (stage === "LOST") {
    await prisma.student.update({
      where: { id: studentId },
      data: { status: "INACTIVE", trialStage: "LOST" },
    });
    return;
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { status: "TRIAL", trialStage: stage, convertedAt: null },
  });
}

// --------------- public booking ---------------

export type BookingInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  locationId: string;
  disciplineId: string;
  sessionDate: string | null;
  sessionCourseName: string | null;
};

export type BookingResult =
  { outcome: "created"; studentId: string } | { outcome: "duplicate" };

// Creates a TRIAL student from a public website booking. The chosen class is
// recorded in the notes — the student joins the location + discipline rosters
// and appears on the session's sheet for marking on the day (no attendance
// row until they actually train).
export async function createTrialBooking(
  input: BookingInput,
): Promise<BookingResult> {
  const existing = input.email
    ? await prisma.student.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
        select: { id: true },
      })
    : null;
  if (existing) {
    return { outcome: "duplicate" };
  }

  const location = await prisma.location.findFirst({
    where: { id: input.locationId, isActive: true },
    select: { name: true },
  });
  const discipline = await prisma.discipline.findFirst({
    where: { id: input.disciplineId, isActive: true },
    select: { name: true },
  });
  if (!location || !discipline) {
    throw new Error("That class is no longer available.");
  }

  const classNote =
    input.sessionDate && input.sessionCourseName
      ? `Booked via website for ${input.sessionCourseName} on ${input.sessionDate} at ${location.name}.`
      : `Booked via website (${discipline.name} at ${location.name}).`;

  const student = await prisma.student.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      status: "TRIAL",
      trialStage: "NEW",
      notes: classNote,
      locations: {
        create: { locationId: input.locationId, isPrimary: true },
      },
      disciplines: {
        create: { disciplineId: input.disciplineId },
      },
    },
    select: { id: true },
  });

  return { outcome: "created", studentId: student.id };
}

// --------------- booking page data ---------------

export async function listBookableOptions() {
  const [locations, disciplines] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.discipline.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { locations, disciplines };
}

export type BookableSession = {
  id: string;
  courseName: string;
  date: string;
  startTime: string;
  locationId: string;
  disciplineId: string;
};

// Upcoming scheduled sessions across active courses — the slots a prospect
// can book. Bounded window keeps the public payload small.
export async function listBookableSessions(
  now: Date = new Date(),
): Promise<BookableSession[]> {
  const today = utcMidnightOf(now);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 14);

  const sessions = await prisma.classSession.findMany({
    where: {
      status: "SCHEDULED",
      date: { gte: today, lte: horizon },
      course: { isActive: true, location: { isActive: true } },
    },
    include: {
      course: { select: { name: true, locationId: true, disciplineId: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 200,
  });

  return sessions.map((session) => ({
    id: session.id,
    courseName: session.course.name,
    date: session.date.toISOString().slice(0, 10),
    startTime: session.startTime,
    locationId: session.course.locationId,
    disciplineId: session.course.disciplineId,
  }));
}
