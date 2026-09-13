import { z } from "zod";

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "LATE",
  "EXCUSED",
  "ABSENT",
] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatusValue, string> = {
  PRESENT: "Present",
  LATE: "Late",
  EXCUSED: "Excused",
  ABSENT: "Absent",
};

// Which statuses count towards "trained" for reporting and, later, belt
// eligibility. Late arrivals did train; excused absences did not.
export const TRAINED_STATUSES: readonly AttendanceStatusValue[] = [
  "PRESENT",
  "LATE",
];

export const attendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
});

export const attendanceBulkSchema = z.object({
  entries: z
    .array(attendanceEntrySchema)
    .max(200, "Too many attendance entries in one save"),
});

export type AttendanceEntryInput = z.infer<typeof attendanceEntrySchema>;
