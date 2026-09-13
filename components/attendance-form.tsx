"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  saveAttendanceAction,
  type AttendanceActionState,
} from "@/lib/actions/attendance";
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

export type AttendanceStudent = {
  studentId: string;
  name: string;
  photoKey: string | null;
  status: AttendanceStatusValue | null;
  source: string;
};

type AttendanceFormProps = {
  sessionId: string;
  canMark: boolean;
  students: AttendanceStudent[];
};

function statusClass(status: AttendanceStatusValue | null): string {
  switch (status) {
    case "PRESENT":
      return "bg-success/15 text-success border-success/30";
    case "LATE":
      return "bg-warning/15 text-warning border-warning/30";
    case "EXCUSED":
    case "ABSENT":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "";
  }
}

export function AttendanceForm({
  sessionId,
  canMark,
  students,
}: AttendanceFormProps) {
  const [state, formAction, isPending] = useActionState<
    AttendanceActionState,
    FormData
  >(saveAttendanceAction, undefined);
  useActionFeedback(state);

  function markAllPresent() {
    const form = document.getElementById(
      "attendance-form",
    ) as HTMLFormElement | null;
    if (!form) return;
    for (const student of students) {
      const select = form.elements.namedItem(
        `s_${student.studentId}`,
      ) as HTMLSelectElement | null;
      if (select) select.value = "PRESENT";
    }
  }

  return (
    <form
      id="attendance-form"
      action={formAction}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input
        type="hidden"
        name="studentIds"
        value={students.map((student) => student.studentId).join(",")}
      />

      {canMark ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={markAllPresent}
          >
            Mark all present
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save attendance"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col divide-y rounded-lg border">
        {students.map((student) => (
          <div
            key={student.studentId}
            className="flex flex-wrap items-center justify-between gap-2 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {student.photoKey ? (
                <img
                  src={`/api/students/${student.studentId}/photo?v=${student.photoKey}`}
                  alt=""
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="bg-muted text-muted-foreground size-8 shrink-0 rounded-full text-center text-xs leading-8">
                  {student.name.charAt(0)}
                </span>
              )}
              <span className="truncate text-sm font-medium">
                {student.name}
              </span>
              {student.source === "CHECKIN" ? (
                <Badge variant="secondary" className="text-[10px]">
                  QR check-in
                </Badge>
              ) : null}
            </div>
            {canMark ? (
              <select
                key={`${student.studentId}-${student.status ?? "none"}`}
                aria-label={`Attendance for ${student.name}`}
                name={`s_${student.studentId}`}
                defaultValue={student.status ?? "ABSENT"}
                className={`border-input bg-background h-9 rounded-md border px-3 text-sm ${statusClass(student.status)}`}
              >
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ATTENDANCE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            ) : (
              <Badge
                variant={student.status ? "secondary" : "outline"}
                className={statusClass(student.status)}
              >
                {student.status
                  ? ATTENDANCE_STATUS_LABELS[student.status]
                  : "Not marked"}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {state && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
