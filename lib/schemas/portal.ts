import { z } from "zod";

import { isValidCountryCode } from "../countries";

// Fields a member may edit for themselves from the portal. Identity fields
// (name, date of birth, status, photo, notes, medical) are deliberately not
// editable here — staff manage those.

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

export const portalContactSchema = z.object({
  email: optionalEmail,
  phone: optionalString,
  addressLine: optionalString,
  city: optionalString,
  state: optionalString,
  postcode: optionalString,
  country: z
    .string()
    .optional()
    .default("")
    .transform((value) => {
      const upper = value.trim().toUpperCase();
      return isValidCountryCode(upper) ? upper : null;
    }),
  emergencyContactName: optionalString,
  emergencyContactPhone: optionalString,
  guardianName: optionalString,
  guardianEmail: optionalEmail,
  guardianPhone: optionalString,
  guardianRelationship: optionalString,
});

export type PortalContactInput = z.infer<typeof portalContactSchema>;

export const portalPreferencesSchema = z.object({
  // Unchecked boxes are absent from FormData — absent means opted in.
  emailOptOut: z.boolean().default(false),
});

export type PortalPreferencesInput = z.infer<typeof portalPreferencesSchema>;
