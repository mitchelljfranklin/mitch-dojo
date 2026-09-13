import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((value) => (value.length > 0 ? value : null));

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const beltLevelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Belt name is required")
    .max(40, "Belt name must be 40 characters or fewer"),
  colorHex: z
    .string()
    .trim()
    .regex(HEX_PATTERN, "Colour must be a hex value like #FFFFFF")
    .transform((value) => value.toUpperCase()),
  order: z.coerce.number().int().min(0).max(99),
  requiredTrainings: z.coerce.number().int().min(0).max(9999).default(0),
});

export type BeltLevelInput = z.infer<typeof beltLevelSchema>;

export const promotionSchema = z.object({
  beltLevelId: z.string().min(1, "Choose the belt being awarded"),
  awardedAt: z
    .string()
    .min(1, "Award date is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Enter a valid date",
    }),
  notes: optionalString,
});

export type PromotionInput = z.infer<typeof promotionSchema>;
