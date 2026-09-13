import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

export const trainerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Trainer name is required")
    .max(80, "Trainer name must be 80 characters or fewer"),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .optional()
    .default("")
    .transform((value) => (value.length > 0 ? value : null)),
  phone: optionalString,
  bio: optionalString,
  isActive: z.boolean().default(true),
  userId: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) => (value.length > 0 ? value : null)),
});

export type TrainerInput = z.infer<typeof trainerSchema>;
