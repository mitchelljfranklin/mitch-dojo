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

const isoDate = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date (YYYY-MM-DD)",
  });

// One manual historical attendance entry (sheet on the student record).
export const pastAttendanceSchema = z.object({
  courseId: z.string().min(1, "Choose a course"),
  date: isoDate,
  status: z.enum(ATTENDANCE_STATUSES).default("PRESENT"),
});

export type PastAttendanceInput = z.infer<typeof pastAttendanceSchema>;

// CSV row for the historical attendance import. Status is uppercased here
// and validated against ATTENDANCE_STATUSES by the action so a bad value
// becomes a row-level error naming the row instead of silently defaulting.
export const attendanceCsvRowSchema = z.object({
  date: isoDate,
  course: z.string().trim().min(1, "Course is required"),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) => value.toLowerCase()),
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  status: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) => value.toUpperCase()),
});

export type AttendanceCsvRow = z.infer<typeof attendanceCsvRowSchema>;
