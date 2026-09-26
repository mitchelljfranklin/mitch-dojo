// Client-safe constants and types for the email log. The data-access layer
// (lib/db/email-log.ts) imports from here; client components must too —
// importing the db module from a client component pulls Prisma into the
// browser bundle.

export const EMAIL_LOG_STATUSES = ["SENT", "FAILED"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

// Every template type the mailer writes (uppercased template names).
export const EMAIL_LOG_TYPES = [
  "INVITE",
  "REMINDER",
  "CLASSREMINDER",
  "PAYMENTREMINDER",
  "TRIALFOLLOWUP",
  "PORTALLINK",
  "BIRTHDAY",
  "BOOKING",
  "BOOKINGSTAFF",
  "RESET",
  "TEST",
] as const;
export type EmailLogType = (typeof EMAIL_LOG_TYPES)[number];

export const EMAIL_TYPE_LABELS: Record<EmailLogType, string> = {
  INVITE: "Invite",
  REMINDER: "Reminder",
  CLASSREMINDER: "Class reminder",
  PAYMENTREMINDER: "Payment reminder",
  TRIALFOLLOWUP: "Trial follow-up",
  PORTALLINK: "Portal link",
  BIRTHDAY: "Birthday",
  BOOKING: "Booking confirmation",
  BOOKINGSTAFF: "New-booking alert (staff)",
  RESET: "Password reset",
  TEST: "SMTP test",
};

export type EmailLogEntry = {
  id: string;
  type: string;
  sentTo: string;
  subject: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: Date;
  dedupKey: string | null;
  sentByName: string;
};
