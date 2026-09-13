"use server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { setSessionAttendance } from "@/lib/db/attendance";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import {
  attendanceBulkSchema,
  ATTENDANCE_STATUSES,
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
    return { ok: false, message: "Invalid attendance data." };
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
