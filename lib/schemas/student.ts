import { z } from "zod";

import { isValidCountryCode } from "../countries";

export const STUDENT_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "INACTIVE",
  "ALUMNI",
] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_STATUS_LABELS: Record<
  (typeof STUDENT_STATUSES)[number],
  string
> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ALUMNI: "Alumni",
};

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

const optionalEmail = z
  .union([z.literal(""), z.email("Enter a valid email address")])
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

const optionalDate = z
  .union([z.literal(""), z.string()])
  .optional()
  .default("")
  .transform((value) => {
    if (value.length === 0) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

export const studentSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: optionalEmail,
    phone: optionalString,
    dateOfBirth: optionalDate,
    emergencyContactName: optionalString,
    emergencyContactPhone: optionalString,
    guardianName: optionalString,
    guardianEmail: optionalEmail,
    guardianPhone: optionalString,
    addressLine: optionalString,
    city: optionalString,
    state: optionalString,
    postcode: optionalString,
    // Stored as an ISO 3166-1 alpha-2 code (validated); empty → null.
    country: z
      .string()
      .optional()
      .default("")
      .transform((value) => {
        const upper = value.trim().toUpperCase();
        return isValidCountryCode(upper) ? upper : null;
      }),
    status: z.enum(STUDENT_STATUSES).default("TRIAL"),
    notes: z
      .string()
      .optional()
      .default("")
      .transform((value) => (value.length > 0 ? value : null)),
    locationIds: z
      .array(z.string())
      .min(1, "Assign the student to at least one location"),
    primaryLocationId: z.string().min(1, "Choose a primary (home) dojo"),
    disciplineIds: z
      .array(z.string())
      .min(1, "Assign the student to at least one discipline"),
  })
  .refine((data) => data.locationIds.includes(data.primaryLocationId), {
    message: "The primary dojo must be one of the assigned locations",
    path: ["primaryLocationId"],
  });

export type StudentInput = z.infer<typeof studentSchema>;

export const studentCsvRowSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) =>
      value.length > 0 && z.email().safeParse(value).success ? value : "",
    ),
  phone: z.string().optional().default(""),
  dateOfBirth: z.string().optional().default(""),
  emergencyContactName: z.string().optional().default(""),
  emergencyContactPhone: z.string().optional().default(""),
  guardianName: z.string().optional().default(""),
  guardianEmail: z.string().optional().default(""),
  guardianPhone: z.string().optional().default(""),
  addressLine: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  postcode: z.string().optional().default(""),
  // Accepts the country name or alpha-2 code, case-insensitive.
  country: z.string().optional().default(""),
  status: z
    .string()
    .optional()
    .default("")
    .transform((value) => {
      const upper = value.toUpperCase();
      return STUDENT_STATUSES.includes(
        upper as (typeof STUDENT_STATUSES)[number],
      )
        ? upper
        : "TRIAL";
    }),
  notes: z.string().optional().default(""),
  // Semicolon-separated location names; must match existing locations.
  locations: z.string().optional().default(""),
  primaryLocation: z.string().optional().default(""),
});

export type StudentCsvRow = z.infer<typeof studentCsvRowSchema>;
