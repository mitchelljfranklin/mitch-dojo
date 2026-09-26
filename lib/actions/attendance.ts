"use server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  setSessionAttendance,
  recordBackfillAttendance,
} from "@/lib/db/attendance";
import { ensureHistoricalSession } from "@/lib/db/sessions";
import { findStudentForImport } from "@/lib/db/students";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import {
  attendanceBulkSchema,
  attendanceCsvRowSchema,
  pastAttendanceSchema,
  ATTENDANCE_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

export type AttendanceActionState =
  { ok: boolean; message: string } | undefined;

// Feeds useActionState — must not revalidatePath (see AGENTS.md); the client
// refreshes via useActionFeedback.
export async function saveAttendanceAction(
  _previousState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_MARK);
  const sessionId = getField(formData, "sessionId");

  const studentIds = getField(formData, "studentIds")
    .split(",")
    .filter(Boolean);

  const entries = studentIds
    .map((studentId) => ({
      studentId,
      status: String(formData.get(`s_${studentId}`) ?? ""),
    }))
    .filter((entry) =>
      (ATTENDANCE_STATUSES as readonly string[]).includes(entry.status),
    );

  const parsed = attendanceBulkSchema.safeParse({ entries });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid attendance data.",
    };
  }

  await setSessionAttendance(sessionId, parsed.data.entries, user.id);

  await logAudit(
    user.id,
    AUDIT_ACTIONS.UPDATE_ATTENDANCE,
    "ClassSession",
    sessionId,
    { entries: parsed.data.entries.length },
  );
  return { ok: true, message: "Attendance saved." };
}

export type PastAttendanceState =
  { error: string } | { ok: true; message: string } | undefined;

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function addPastAttendanceAction(
  previousState: PastAttendanceState,
  formData: FormData,
): Promise<PastAttendanceState> {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_MARK);
  const studentId = getField(formData, "studentId");

  const parsed = pastAttendanceSchema.safeParse({
    courseId: getField(formData, "courseId"),
    date: getField(formData, "date"),
    status: getField(formData, "status") || "PRESENT",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Historical entries only — future sessions are generated, not backfilled.
  const date = new Date(`${parsed.data.date}T00:00:00`);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date > endOfToday) {
    return { error: "Pick a date from today or earlier." };
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { locationId: true },
  });
  if (!course) {
    return { error: "That course no longer exists." };
  }

  const membership = await prisma.studentLocation.findUnique({
    where: {
      studentId_locationId: {
        studentId,
        locationId: course.locationId,
      },
    },
  });
  if (!membership) {
    return {
      error: "The student is not assigned to this course's location.",
    };
  }

  const result = await recordBackfillAttendance({
    studentId,
    courseId: parsed.data.courseId,
    date,
    status: parsed.data.status,
    markedById: user.id,
  });
  if (result.outcome === "already_recorded") {
    return {
      error: `Already marked (${result.existingStatus.toLowerCase()}) for that date.`,
    };
  }

  await logAudit(
    user.id,
    AUDIT_ACTIONS.UPDATE_ATTENDANCE,
    "ClassSession",
    result.sessionId,
    { studentId, source: "backfill" },
  );
  return { ok: true, message: "Past attendance added." };
}

export type AttendanceImportState =
  { ok: true; message: string } | { ok: false; error: string } | undefined;

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function importAttendanceAction(
  previousState: AttendanceImportState,
  formData: FormData,
): Promise<AttendanceImportState> {
  const actor = await requirePermission(PERMISSIONS.ATTENDANCE_MARK);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > 1_000_000) {
    return { ok: false, error: "File is too large (max 1 MB)." };
  }

  const text = await file.text();
  const rows = parseCsvWithHeaders(text);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No rows found in CSV. The first row must be a header.",
    };
  }

  const courses = await prisma.course.findMany({
    select: { id: true, name: true, locationId: true },
  });
  const courseByName = new Map(
    courses.map((course) => [course.name.toLowerCase(), course]),
  );

  const studentCache = new Map<
    string,
    Awaited<ReturnType<typeof findStudentForImport>>
  >();
  async function resolveStudent(
    email: string,
    firstName: string,
    lastName: string,
    locationId: string,
  ) {
    const key = `${email}|${firstName}|${lastName}|${locationId}`;
    const cached = studentCache.get(key);
    if (cached) return cached;
    const match = await findStudentForImport(
      { email, firstName, lastName },
      locationId,
    );
    studentCache.set(key, match);
    return match;
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const rowErrors: string[] = [];
  const validRows: {
    courseId: string;
    date: Date;
    status: AttendanceStatusValue;
    studentId: string;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const parsed = attendanceCsvRowSchema.safeParse({
      date: raw.date ?? "",
      course: raw.course ?? "",
      email: raw.email ?? raw.studentemail ?? "",
      firstName: raw.firstname ?? raw.firstName ?? "",
      lastName: raw.lastname ?? raw.lastName ?? "",
      status: raw.status ?? "",
    });
    if (!parsed.success) {
      rowErrors.push(
        `Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      );
      continue;
    }

    const row = parsed.data;
    const course = courseByName.get(row.course.toLowerCase());
    if (!course) {
      rowErrors.push(`Row ${i + 2}: unknown course "${row.course}".`);
      continue;
    }

    const date = new Date(`${row.date}T00:00:00`);
    if (date > endOfToday) {
      rowErrors.push(
        `Row ${i + 2}: future dates cannot be imported (${row.date}).`,
      );
      continue;
    }

    if (
      row.status.length > 0 &&
      !(ATTENDANCE_STATUSES as readonly string[]).includes(row.status)
    ) {
      rowErrors.push(
        `Row ${i + 2}: unknown status "${row.status}" (use Present, Late, Excused, or Absent).`,
      );
      continue;
    }
    const status = (
      row.status.length > 0 ? row.status : "PRESENT"
    ) as AttendanceStatusValue;

    const match = await resolveStudent(
      row.email,
      row.firstName,
      row.lastName,
      course.locationId,
    );
    if (match.status !== "found") {
      const reason =
        match.status === "not_found"
          ? "student not found"
          : match.status === "ambiguous"
            ? "student name matches several students"
            : "student is not at this course's location";
      rowErrors.push(`Row ${i + 2}: ${reason}.`);
      continue;
    }

    validRows.push({
      courseId: course.id,
      date,
      status,
      studentId: match.studentId,
    });
  }

  let imported = 0;
  let skipped = 0;
  for (const row of validRows) {
    const result = await recordBackfillAttendance({
      studentId: row.studentId,
      courseId: row.courseId,
      date: row.date,
      status: row.status,
      markedById: actor.id,
    });
    if (result.outcome === "created") imported++;
    else skipped++;
  }

  await logAudit(
    actor.id,
    AUDIT_ACTIONS.IMPORT_ATTENDANCE,
    "Course",
    undefined,
    { imported, skipped },
  );

  if (imported > 0 || skipped > 0) {
    return {
      ok: true,
      message: `Imported ${imported} training${imported === 1 ? "" : "s"} (${skipped} already recorded).`,
    };
  }
  return {
    ok: false,
    error: `No attendance imported. First error: ${rowErrors[0] ?? "unknown"}`,
  };
}
