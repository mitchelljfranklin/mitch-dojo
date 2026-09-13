import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

// JS getDay convention: 0 = Sunday … 6 = Saturday.
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Monday-first display order for calendars and pickers.
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const trainingTimeSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z
    .string()
    .regex(TIME_PATTERN, "Start time must be HH:MM (24-hour)"),
  endTime: z.string().regex(TIME_PATTERN, "End time must be HH:MM (24-hour)"),
});

export type TrainingTimeInput = z.infer<typeof trainingTimeSchema>;

export const courseFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Course name is required")
      .max(80, "Course name must be 80 characters or fewer"),
    description: optionalString,
    locationId: z.string().min(1, "Choose a location for this course"),
    disciplineId: z.string().min(1, "Choose a discipline for this course"),
    trainerId: z
      .string()
      .trim()
      .optional()
      .default("")
      .transform((value) => (value.length > 0 ? value : null)),
    isActive: z.boolean().default(true),
    trainingTimes: z
      .array(trainingTimeSchema)
      .max(30, "A course can have at most 30 weekly slots"),
  })
  .refine(
    (data) => data.trainingTimes.every((slot) => slot.startTime < slot.endTime),
    {
      message: "End time must be after start time",
      path: ["trainingTimes"],
    },
  );

export type CourseFormInput = z.infer<typeof courseFormSchema>;
