import { z } from "zod";

const isoBeltDate = z
  .string()
  .trim()
  .min(1, "Award date is required")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date (YYYY-MM-DD)",
  });

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
  beltRangeEntryId: z.string().min(1, "Choose the belt being awarded"),
  awardedAt: isoBeltDate,
  notes: optionalString,
  // Prior trainings credited when this is the student's FIRST belt in the
  // discipline (transferring students whose history lives outside the
  // system). 0 = start counting from local attendance only. The action
  // applies it only on first-belt promotions and defaults it to the belt's
  // requirement when the field is left blank.
  trainingsCredit: z.coerce.number().int().min(0).max(9999).default(0),
});

export type PromotionInput = z.infer<typeof promotionSchema>;

// CSV row for the belt-history import. The discipline is chosen on the
// import page (not per row); belts must already exist in that discipline's
// ladder.
export const beltHistoryCsvRowSchema = z.object({
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) => value.toLowerCase()),
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  belt: z.string().trim().min(1, "Belt is required"),
  awardedAt: isoBeltDate,
  notes: z.string().trim().optional().default(""),
});

export type BeltHistoryCsvRow = z.infer<typeof beltHistoryCsvRowSchema>;
