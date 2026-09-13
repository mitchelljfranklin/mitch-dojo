import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .default("mitch-dojo"),
  supportEmail: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .default(""),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const emailSettingsSchema = z.object({
  smtpHost: z.string().default(""),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().default(""),
  fromAddress: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .default(""),
  fromName: z.string().default("mitch-dojo"),
  smtpPassword: z.string().default(""),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const fileSettingsSchema = z.object({
  maxUploadMb: z.coerce.number().int().min(1).default(20),
  allowedExtensions: z
    .array(z.string())
    .default(["pdf", "png", "jpg", "jpeg", "docx", "xlsx"]),
});

export type FileSettings = z.infer<typeof fileSettingsSchema>;

export const operationsSettingsSchema = z.object({
  loginRateLimitPerMin: z.coerce.number().int().min(1).default(10),
  emailLogRetentionDays: z.coerce.number().int().min(0).default(14),
  sessionTimeoutMinutes: z.coerce.number().int().min(0).default(30),
  passwordResetPerMin: z.coerce.number().int().min(1).default(1),
});

export type OperationsSettings = z.infer<typeof operationsSettingsSchema>;

export const emailTemplateSchema = z.object({
  resetSubject: z.string().default("Password reset"),
  resetBody: z
    .string()
    .default(
      "A password reset was requested for your {{appName}} account.\n\nClick here to reset your password: {{resetUrl}}\n\nThis link expires in {{expiresIn}}.",
    ),
  // Placeholder templates for the communications phase; the mailer reads all
  // of them, so they ship with sensible defaults rather than being optional.
  inviteSubject: z.string().default("Welcome to {{appName}}"),
  inviteBody: z.string().default("Welcome to {{appName}}, {{studentName}}."),
  reminderSubject: z.string().default("Reminder from {{appName}}"),
  reminderBody: z.string().default("Hi {{studentName}}, this is a reminder."),
  classReminderSubject: z.string().default("Class reminder: {{className}}"),
  classReminderBody: z
    .string()
    .default(
      "Hi {{studentName}}, {{className}} starts at {{classTime}}. See you on the mats!",
    ),
  paymentReminderSubject: z
    .string()
    .default("Payment reminder from {{appName}}"),
  paymentReminderBody: z
    .string()
    .default(
      "Hi {{studentName}}, your membership payment is due on {{dueDate}}.",
    ),
  birthdaySubject: z.string().default("Happy birthday from {{appName}}!"),
  birthdayBody: z
    .string()
    .default("Happy birthday {{studentName}}! Have a great day."),
  testSubject: z.string().default("{{appName}} — SMTP test"),
  testBody: z.string().default("Your SMTP settings are working correctly."),
});

export type EmailTemplateSettings = z.infer<typeof emailTemplateSchema>;

export const appearanceSettingsSchema = z.object({
  primaryHex: z.string().default(""),
  secondaryHex: z.string().default(""),
  // Some older rows stored the key JSON-string-encoded (wrapped in literal
  // double quotes), which made the orphan sweep treat the real logo file as
  // unreferenced and delete it. Normalise on read.
  logoKey: z
    .string()
    .default("")
    .transform((value) => value.replace(/^"+|"+$/g, "")),
  borderRadius: z.coerce.number().min(0).max(16).default(10),
  pageWidth: z.enum(["constrained", "full"]).default("constrained"),
});

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;

export const storageSettingsSchema = z.object({
  provider: z.enum(["local", "s3", "azure"]).default("local"),
  s3Bucket: z.string().default(""),
  s3Region: z.string().default(""),
  s3AccessKeyId: z.string().default(""),
  s3SecretAccessKey: z.string().default(""),
  azureConnectionString: z.string().default(""),
  azureContainerName: z.string().default(""),
});

export type StorageSettings = z.infer<typeof storageSettingsSchema>;

export const cronSettingsSchema = z.object({
  internalSchedulerEnabled: z.boolean().default(true),
});

export type CronSettings = z.infer<typeof cronSettingsSchema>;
