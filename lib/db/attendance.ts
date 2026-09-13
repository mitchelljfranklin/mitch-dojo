import {
  type Prisma,
  type AttendanceStatus,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  TRAINED_STATUSES,
  type AttendanceEntryInput,
} from "@/lib/schemas/attendance";

// Replaces the full attendance sheet for one session in a transaction.
// source/markedBy describe who marked it; CHECKIN entries keep their origin
// when later overwritten by staff.
export async function setSessionAttendance(
  sessionId: string,
  entries: AttendanceEntryInput[],
  markedById: string | null,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      await tx.attendance.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: entry.studentId },
        },
        update: {
          status: entry.status,
          source: "MANUAL",
          markedById,
          markedAt: new Date(),
        },
        create: {
          sessionId,
          studentId: entry.studentId,
          status: entry.status,
          source: "MANUAL",
          markedById,
        },
      });
    }
  });
}

export type RosterEntry = {
  studentId: string;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  status: AttendanceStatus | null;
  source: string;
};

// Students eligible for a session's attendance sheet: everyone training at
// the session's location with status ACTIVE or TRIAL (trials attend classes
// too), plus their existing attendance record if any.
export async function getSessionRoster(sessionId: string): Promise<{
  session: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: string;
    courseName: string;
    courseId: string;
    locationName: string;
    locationId: string;
    trainerName: string | null;
  } | null;
  roster: RosterEntry[];
}> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        select: { id: true, name: true, trainer: { select: { name: true } } },
      },
      location: { select: { id: true, name: true } },
    },
  });
  if (!session) return { session: null, roster: [] };

  const rosterStudents = await prisma.student.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      locations: { some: { locationId: session.locationId } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, photoKey: true },
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: { sessionId },
  });
  const attendanceByStudent = new Map(
    attendanceRows.map((row) => [row.studentId, row]),
  );

  const roster: RosterEntry[] = rosterStudents.map((student) => ({
    studentId: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    photoKey: student.photoKey,
    status: attendanceByStudent.get(student.id)
      ?.status as AttendanceStatus | null,
    source: attendanceByStudent.get(student.id)?.source ?? "",
  }));

  return {
    session: {
      id: session.id,
      courseId: session.course.id,
      courseName: session.course.name,
      locationId: session.location.id,
      locationName: session.location.name,
      trainerName: session.course.trainer?.name ?? null,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
    },
    roster,
  };
}

export type StudentAttendanceRow = {
  sessionId: string;
  courseName: string;
  locationName: string;
  date: Date;
  startTime: string;
  status: AttendanceStatus;
};

export async function getStudentRecentAttendance(
  studentId: string,
  limit = 10,
): Promise<StudentAttendanceRow[]> {
  const rows = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: [{ session: { date: "desc" } }],
    take: limit,
    include: {
      session: {
        select: {
          id: true,
          date: true,
          startTime: true,
          course: { select: { name: true } },
          location: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    sessionId: row.session.id,
    courseName: row.session.course.name,
    locationName: row.session.location.name,
    date: row.session.date,
    startTime: row.session.startTime,
    status: row.status,
  }));
}

// Attendance counts for a batch of sessions (course detail page badges).
export async function getAttendanceCountsBySession(
  sessionIds: string[],
): Promise<Map<string, { total: number; trained: number }>> {
  if (sessionIds.length === 0) return new Map();

  const rows = await prisma.attendance.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { sessionId: true, status: true },
  });

  const counts = new Map<string, { total: number; trained: number }>();
  for (const sessionId of sessionIds) {
    counts.set(sessionId, { total: 0, trained: 0 });
  }
  for (const row of rows) {
    const entry = counts.get(row.sessionId);
    if (!entry) continue;
    entry.total += 1;
    if (TRAINED_STATUSES.includes(row.status as never)) {
      entry.trained += 1;
    }
  }
  return counts;
}
