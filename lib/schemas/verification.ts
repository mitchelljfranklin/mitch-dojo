import { z } from "zod";

import { isValidIsoDateString } from "@/lib/utils";

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value.length === 0 || isValidIsoDateString(value), {
    message: "Enter a valid date (YYYY-MM-DD)",
  })
  .transform((value) => (value.length > 0 ? value : null));

export const verificationTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Keep the name to 80 characters or fewer"),
  description: optionalString,
  required: z.boolean().default(false),
  requiresExpiry: z.boolean().default(false),
  defaultValidityMonths: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(120)])
    .optional()
    .default("")
    .transform((value) => (value === "" ? null : value)),
  isActive: z.boolean().default(true),
});

export type VerificationTypeInput = z.infer<typeof verificationTypeSchema>;

export const verificationRecordSchema = z.object({
  trainerId: z.string().min(1),
  typeId: z.string().min(1),
  referenceNumber: optionalString,
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  notes: optionalString,
});

export type VerificationRecordInput = z.infer<typeof verificationRecordSchema>;
