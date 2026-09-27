import { z } from "zod";

export const BILLING_PERIODS = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CARD_TERMINAL",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD_TERMINAL: "Card terminal",
  OTHER: "Other",
};

// Price is entered in major units in the UI (e.g. "89.50") and stored as
// integer cents.
export const priceInputSchema = z
  .string()
  .trim()
  .min(1, "Price is required")
  .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a price like 89.50")
  .transform((value) => Math.round(Number(value) * 100))
  .refine((cents) => cents >= 0 && cents <= 99_999_999, {
    message: "Price is out of range",
  });

export const membershipPlanSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    description: z.string().trim().max(500).optional().default(""),
    planType: z.enum(["RECURRING", "ITEM"]),
    billingPeriod: z.enum(BILLING_PERIODS).optional(),
    price: priceInputSchema,
    // Recurring invoices generate only when the member trained since the
    // last invoice (unchecked = charge every cycle regardless).
    chargeOnlyWithAttendance: z.boolean().default(false),
  })
  .refine(
    (plan) => plan.planType === "ITEM" || plan.billingPeriod !== undefined,
    { message: "Choose a billing period", path: ["billingPeriod"] },
  );

export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;

export const enrollmentSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  planId: z.string().min(1, "Choose a plan"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid start date"),
});

export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

export const invoiceSchema = z.object({
  studentId: z.string().min(1, "Choose a student"),
  planId: z.string().min(1, "Choose a plan"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid due date"),
  notes: z.string().trim().max(500).optional().default(""),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const paymentSchema = z.object({
  amount: priceInputSchema.refine((cents) => cents > 0, {
    message: "Amount must be greater than zero",
  }),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date"),
  reference: z.string().trim().max(120).optional().default(""),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// CSV row for the enrollment import. The student is matched by email (or
// first + last name) and the plan by exact name; the start date defaults to
// today when left blank.
export const enrollmentCsvRowSchema = z.object({
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((value) => value.toLowerCase()),
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  plan: z.string().trim().min(1, "Plan is required"),
  startDate: z.string().trim().optional().default(""),
});

export type EnrollmentCsvRow = z.infer<typeof enrollmentCsvRowSchema>;
