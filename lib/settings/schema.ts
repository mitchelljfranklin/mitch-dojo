import { z } from "zod";

import { isValidCountryCode } from "../countries";

export const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required").default("My Dojo"),
  supportEmail: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .default(""),
  // Default country (ISO 3166-1 alpha-2) preselected on the student form's
  // address section. Empty = no preselection.
  defaultCountry: z
    .string()
    .refine(
      (value) => value.length === 0 || isValidCountryCode(value),
      "Use a valid ISO country code",
    )
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
  fromName: z.string().default("My Dojo"),
  smtpPassword: z.string().default(""),
  // SMTP authentication mode. "basic" = username/password; "oauth2" =
  // XOAUTH2 (refresh-token grant) for providers like Gmail and Microsoft 365
  // that deprecated basic-auth SMTP.
  smtpAuthType: z.enum(["basic", "oauth2"]).default("basic"),
  smtpOAuth2Provider: z.enum(["google", "microsoft"]).default("google"),
  smtpOAuth2ClientId: z.string().default(""),
  // Microsoft-only: tenant ID builds the token endpoint and the SMTP scope.
  smtpOAuth2Tenant: z.string().default(""),
  smtpOAuth2ClientSecret: z.string().default(""),
  smtpOAuth2RefreshToken: z.string().default(""),
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
  breakGlassPerMin: z.coerce.number().int().min(1).default(10),
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
  bookingSubject: z.string().default("Booking confirmed — {{appName}}"),
  bookingBody: z
    .string()
    .default(
      "Hi {{studentName}},\n\nYour trial class is booked: {{className}} on {{classTime}}. We look forward to meeting you!\n\nIf you need to change or cancel, just reply to this email.\n\n— {{appName}}",
    ),
  bookingStaffSubject: z.string().default("New trial booking — {{appName}}"),
  bookingStaffBody: z
    .string()
    .default(
      "A new trial booking has come in:\n\nName: {{studentName}}\nBooking for: {{bookingFor}}\nContact: {{contact}}\nPreferred class: {{className}} on {{classTime}}\n\nOpen the Trials page to follow up.\n\n— {{appName}}",
    ),
  trialFollowUpSubject: z
    .string()
    .default("How was your trial at {{appName}}?"),
  trialFollowUpBody: z
    .string()
    .default(
      "Hi {{studentName}},\n\nIt has been {{trialDays}} days since you started your trial with us. We would love to see you back on the mats — reply to this email or drop in for your next class!\n\n— {{appName}}",
    ),
  gradingInviteSubject: z
    .string()
    .default("Grading invitation — {{eventName}} — {{appName}}"),
  gradingInviteBody: z
    .string()
    .default(
      "Hi {{studentName}},\n\n{{eventName}} for {{disciplineName}} is on {{eventDate}}. We would love to see you there — please let your instructor know if you can't make it.\n\n— {{appName}}",
    ),
  portalLinkSubject: z.string().default("Your {{appName}} member portal link"),
  portalLinkBody: z
    .string()
    .default(
      "Hi {{studentName}},\n\nHere is your personal member portal link — view your classes, attendance, progress, and balance any time:\n\n{{portalUrl}}\n\nThe link works for {{expiryDays}} days. Ask us for a new one any time.\n\n— {{appName}}",
    ),
  agreementReminderSubject: z
    .string()
    .default("Action needed: {{documentTitle}} — {{appName}}"),
  agreementReminderBody: z
    .string()
    .default(
      "Hi {{studentName}},\n\nOur {{documentTitle}} still needs your signature. Please sign it in your member portal, or ask the front desk for a paper form.\n\n— {{appName}}",
    ),
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
  // Alternate logo for dark backgrounds (e.g. a white knockout badge).
  // Optional: when absent, the primary logo on its white plate is used
  // everywhere. Same quote-normalisation as logoKey.
  logoDarkKey: z
    .string()
    .default("")
    .transform((value) => value.replace(/^"+|"+$/g, "")),
  // Which logo emails use. "primary" = primary logo on the white plate;
  // "dark" = dark logo on a dark plate (falls back to the primary pair when
  // no dark logo is uploaded).
  emailLogoVariant: z.enum(["primary", "dark"]).default("primary"),
  borderRadius: z.coerce.number().min(0).max(16).default(10),
  pageWidth: z.enum(["constrained", "full"]).default("constrained"),
  // White-label copy for the public booking page (Phase 11).
  bookingHeadline: z
    .string()
    .max(120, "Keep the headline under 120 characters")
    .default("Book a free trial class"),
  bookingDescription: z
    .string()
    .max(300, "Keep the description under 300 characters")
    .default("Try a class — no experience needed, all ages welcome."),
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

// Memberships & payments configuration. currency is an ISO 4217 code used
// for display formatting; money itself is stored as integer cents.
// suspendAfterOverdueDays = 0 disables check-in suspension entirely.
export const membershipsSettingsSchema = z.object({
  currency: z
    .string()
    .length(3, "Use a 3-letter ISO currency code")
    .default("USD")
    .transform((value) => value.toUpperCase()),
  invoiceDueDays: z.coerce.number().int().min(0).max(90).default(14),
  suspendAfterOverdueDays: z.coerce.number().int().min(0).max(365).default(30),
  autoGenerateInvoices: z.boolean().default(true),
  // Tax/GST applied to new invoices (0 = no tax). Captured onto each invoice
  // at issue time so later rate changes never rewrite history.
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  taxLabel: z.string().trim().max(20).default("Tax"),
  // Optional front-door gate: when on, QR check-in is refused while any
  // enabled agreement is unsigned or signed against an older version. Staff
  // attendance marking is never gated.
  blockCheckinOnOutstandingAgreements: z.boolean().default(false),
});

export type MembershipsSettings = z.infer<typeof membershipsSettingsSchema>;

// Reminder scheduling. Each type has its own toggle and trigger window.
// Payment reminders fire once per invoice when it enters the due-soon
// window, and once more when it has been overdue for the given days.
export const communicationsSettingsSchema = z.object({
  classRemindersEnabled: z.boolean().default(true),
  classReminderHoursBefore: z.coerce.number().int().min(1).max(48).default(24),
  paymentRemindersEnabled: z.boolean().default(true),
  paymentReminderDaysBeforeDue: z.coerce
    .number()
    .int()
    .min(0)
    .max(30)
    .default(3),
  paymentReminderOverdueDays: z.coerce.number().int().min(1).max(90).default(7),
  birthdayEmailsEnabled: z.boolean().default(true),
  // Trial follow-up: one email per open trial once it has sat in the
  // pipeline this many days without converting.
  trialFollowUpsEnabled: z.boolean().default(true),
  trialFollowUpDaysAfterJoin: z.coerce.number().int().min(1).max(60).default(3),
  // Booking confirmation: one email to the prospect the moment their public
  // /book submission creates a trial. Deduped per booking.
  bookingConfirmationsEnabled: z.boolean().default(true),
  // Agreement reminders: one email per student per outstanding document
  // version (unsigned or re-sign required). Deduped per document version.
  agreementRemindersEnabled: z.boolean().default(true),
  // New-booking alert: one email per listed staff recipient when a public
  // booking lands. Recipients start empty — alerts begin once at least one
  // address is entered.
  bookingStaffAlertsEnabled: z.boolean().default(true),
  bookingStaffAlertRecipients: z
    .array(z.string().trim().pipe(z.email("Enter a valid email address")))
    .max(20, "Keep the recipient list to 20 addresses or fewer")
    .default([]),
});

export type CommunicationsSettings = z.infer<
  typeof communicationsSettingsSchema
>;

// SSO provider configuration. Client secrets are never part of this schema —
// they live in their own AppSetting rows (sso.<provider>ClientSecret),
// encrypted at rest, surfaced to the UI only as "configured" booleans.
export const ssoSettingsSchema = z.object({
  entraIdEnabled: z.boolean().default(false),
  entraIdClientId: z.string().default(""),
  googleEnabled: z.boolean().default(false),
  googleClientId: z.string().default(""),
  oidcEnabled: z.boolean().default(false),
  oidcName: z.string().default(""),
  oidcIssuer: z.string().default(""),
  oidcClientId: z.string().default(""),
  // Role assigned to users created by just-in-time provisioning. Empty means
  // "not chosen" — provisioning fails closed until an admin picks one.
  autoProvisionRoleId: z.string().default(""),
  // When set, only email addresses at this domain may sign in via SSO.
  // Normalised (trim, no leading @, lowercase) so matching is consistent.
  allowedDomain: z
    .string()
    .default("")
    .transform((value) => value.trim().replace(/^@/, "").toLowerCase()),
  // Hide the local email/password form on the login page. Anti-lock-out
  // applies: ignored while zero SSO providers are enabled, and a valid
  // break-glass token always restores the form (see lib/break-glass.ts).
  disableLocalAuth: z.boolean().default(false),
});

export type SsoSettings = z.infer<typeof ssoSettingsSchema>;
