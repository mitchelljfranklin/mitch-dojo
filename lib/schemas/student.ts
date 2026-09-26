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

// Guardian-relationship presets for the student form and the public booking
// page. Free text is not offered on the public form (keep it structured);
// the API/import paths accept any string.
export const GUARDIAN_RELATIONSHIPS = [
  "Mother",
  "Father",
  "Parent",
  "Step-parent",
  "Grandparent",
  "Sibling",
  "Aunt/Uncle",
  "Legal guardian",
  "Carer",
  "Other",
] as const;

export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
    message: "Enter a valid email address",
  })
  .transform((value) => (value.length > 0 ? value.toLowerCase() : null));

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
    guardianRelationship: optionalString,
    // PHI — free text per prompt. Visibility is permission-gated upstream.
    medicalMedications: optionalString,
    medicalConditions: optionalString,
    medicalInjuries: optionalString,
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

// Medical PHI is gated by students:medical. Without it the form renders no
// medical inputs, so writing the parsed (empty → null) values would erase
// stored PHI. This applies that gate on the WRITE side: editors without the
// permission get the existing values preserved (or null on create), and any
// crafted submission of PHI is ignored. Pure and unit-tested.
export function applyMedicalPermission(
  input: StudentInput,
  existing: {
    medicalMedications: string | null;
    medicalConditions: string | null;
    medicalInjuries: string | null;
  } | null,
  canEditMedical: boolean,
): StudentInput {
  if (canEditMedical) {
    return input;
  }
  return {
    ...input,
    medicalMedications: existing?.medicalMedications ?? null,
    medicalConditions: existing?.medicalConditions ?? null,
    medicalInjuries: existing?.medicalInjuries ?? null,
  };
}

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
  guardianRelationship: z.string().optional().default(""),
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
