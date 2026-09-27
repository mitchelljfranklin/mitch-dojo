import { z } from "zod";

import { isValidIsoDateString } from "@/lib/utils";

export const INCIDENT_SEVERITIES = ["MINOR", "MODERATE", "SERIOUS"] as const;

export const INCIDENT_SEVERITY_LABELS: Record<
  (typeof INCIDENT_SEVERITIES)[number],
  string
> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SERIOUS: "Serious",
};

export const INCIDENT_STATUSES = ["OPEN", "CLOSED"] as const;

// Sentinel used by the create/edit selects for "no student/location" (Radix
// Select cannot use an empty string value).
export const INCIDENT_NONE = "none";

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

const optionalId = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

export const incidentFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the report a short title")
    .max(120, "Keep the title to 120 characters or fewer"),
  occurredAt: z
    .string()
    .trim()
    .min(1, "The date is required")
    .refine(isValidIsoDateString, {
      message: "Enter a valid date (YYYY-MM-DD)",
    }),
  studentId: optionalId,
  locationId: optionalId,
  severity: z.enum(INCIDENT_SEVERITIES).default("MINOR"),
  description: z
    .string()
    .trim()
    .min(1, "Describe what happened")
    .max(4000, "Keep the description to 4000 characters or fewer"),
  injuryDescription: optionalString,
  treatmentGiven: optionalString,
  medicalAttentionRequired: z.boolean().default(false),
  actionsTaken: optionalString,
});

export type IncidentFormInput = z.infer<typeof incidentFormSchema>;
