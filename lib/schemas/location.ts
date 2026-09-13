import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

export const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Location name is required")
    .max(80, "Location name must be 80 characters or fewer"),
  address: optionalString,
  phone: optionalString,
  email: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .optional()
    .default("")
    .transform((value) => (value.length > 0 ? value : null)),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export type LocationInput = z.infer<typeof locationSchema>;
