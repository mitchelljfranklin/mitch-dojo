import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { listDocuments } from "@/lib/db/agreements";
import {
  getCommunicationsSettings,
  getEmailSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { formatDate, formatDateUtc } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

// Reminder jobs for the scheduler. Each job is idempotent via NotificationLog
// dedup keys stored in the assessmentId column: once a key has ANY log row
// (sent or failed), the reminder is never attempted again — "once per
// period", safe across scheduler restarts. Failed sends stay visible in the
// audit/email log for manual follow-up.

// Cap the number of sends (attempts) each reminder job performs per tick so a
// large dojo can't outrun the 5-minute scheduler interval. Unhandled
// candidates carry no dedup row, so the next tick picks them up.
const MAX_REMINDER_SENDS_PER_TICK = 50;

// Reminder emails follow the school default language (there is no per-recipient
// locale and cron has no request locale), so date tokens are formatted to match
// the email shell.
async function getReminderContext(): Promise<{
  appName: string;
  defaultLocale: string;
  atLabel: string;
}> {
  const { name: appName, defaultLocale } = await getOrganizationSettings();
  const translateEmail = await getTranslations({
    locale: defaultLocale,
    namespace: "Email",
  });
  return { appName, defaultLocale, atLabel: translateEmail("at") };
}

export type ReminderResults = {
  classRemindersSent: number;
  paymentRemindersSent: number;
  birthdayEmailsSent: number;
  trialFollowUpsSent: number;
  agreementRemindersSent: number;
  verificationRemindersSent: number;
};

function utcMidnightOf(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function startOfToday(now: Date): Date {
  return utcMidnightOf(now);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// True when the key has never been attempted (no log row). Keys are
// namespaced per reminder variant, so the type column (which always reflects
// the email template) is not part of the lookup.
async function notYetSent(dedupKey: string): Promise<boolean> {
  const existing = await prisma.notificationLog.findFirst({
    where: { assessmentId: dedupKey },
    select: { id: true },
  });
  return existing === null;
}

// Student email, falling back to the guardian; null when neither exists.
export function resolveRecipient(student: {
  email: string | null;
  guardianEmail: string | null;
}): string | null {
  return student.email?.trim() || student.guardianEmail?.trim() || null;
}

// --------------- class reminders ---------------

// "HH:MM" wall-clock start + UTC-midnight date → server-local Date at that
// time of day (the timetable is local by definition; see TrainingTime).
export function sessionStartDateTime(session: {
  date: Date;
  startTime: string;
}): Date {
  const [hours, minutes] = session.startTime.split(":").map(Number);
  return new Date(
    session.date.getUTCFullYear(),
    session.date.getUTCMonth(),
    session.date.getUTCDate(),
    hours ?? 0,
    minutes ?? 0,
  );
}

export async function sendClassReminders(
  now: Date = new Date(),
): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.classRemindersEnabled) return 0;

  const { appName, defaultLocale, atLabel } = await getReminderContext();
  const windowStart = now;
  const windowEnd = new Date(
    now.getTime() + settings.classReminderHoursBefore * 3_600_000,
  );

  // Sessions whose start falls inside the reminder window.
  const candidates = await prisma.classSession.findMany({
    where: { status: "SCHEDULED" },
    include: {
      course: { select: { name: true, disciplineId: true } },
    },
  });

  const dueSessions = candidates.filter((session) => {
    const start = sessionStartDateTime(session);
    return start > windowStart && start <= windowEnd;
  });
  if (dueSessions.length === 0) return 0;

  let sent = 0;
  let handled = 0;
  for (const session of dueSessions) {
    // Audience: ACTIVE/TRIAL students at the SESSION's location (denormalised
    // at generation, so a later course move doesn't reassign old sessions) who
    // train the course's discipline — the same population that can check in.
    const students = await prisma.student.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        locations: { some: { locationId: session.locationId } },
        disciplines: { some: { disciplineId: session.course.disciplineId } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        guardianEmail: true,
        emailOptOut: true,
      },
    });

    for (const student of students) {
      if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
      const dedupKey = `class-reminder:${session.id}:${student.id}`;
      if (!(await notYetSent(dedupKey))) continue;
      if (student.emailOptOut) continue;

      const recipient = resolveRecipient(student);
      if (!recipient) continue;

      handled++;
      const result = await sendEmail(
        recipient,
        "classReminder",
        {
          studentName: `${student.firstName} ${student.lastName}`,
          className: session.course.name,
          classTime: `${formatDate(session.date, defaultLocale)} ${atLabel} ${session.startTime}`,
          appName,
        },
        { assessmentId: dedupKey },
      );
      if (result.ok) sent++;
    }
    if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
  }
  return sent;
}

// --------------- payment reminders ---------------

export async function sendPaymentReminders(
  now: Date = new Date(),
): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.paymentRemindersEnabled) return 0;

  const { appName, defaultLocale } = await getReminderContext();
  const today = startOfToday(now);
  const dueSoonCutoff = addDays(today, settings.paymentReminderDaysBeforeDue);
  const overdueCutoff = addDays(today, -settings.paymentReminderOverdueDays);

  const invoices = await prisma.invoice.findMany({
    where: { status: "OPEN" },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          guardianEmail: true,
        },
      },
    },
  });

  let sent = 0;
  let handled = 0;
  for (const invoice of invoices) {
    if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
    const dueSoon =
      invoice.dueDate >= today && invoice.dueDate <= dueSoonCutoff;
    const overdue = invoice.dueDate < overdueCutoff;
    if (!dueSoon && !overdue) continue;

    const variant = overdue ? "payment-overdue" : "payment-due";
    const dedupKey = `${variant}:${invoice.id}`;
    if (!(await notYetSent(dedupKey))) continue;

    const recipient = resolveRecipient(invoice.student);
    if (!recipient) continue;

    handled++;
    const result = await sendEmail(
      recipient,
      "paymentReminder",
      {
        studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
        invoiceNumber: String(invoice.number),
        dueDate: formatDate(invoice.dueDate, defaultLocale),
        appName,
      },
      { assessmentId: dedupKey },
    );
    if (result.ok) sent++;
  }
  return sent;
}

// --------------- birthday emails ---------------

export async function sendBirthdayEmails(
  now: Date = new Date(),
): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.birthdayEmailsEnabled) return 0;

  const { appName } = await getReminderContext();
  const today = startOfToday(now);
  const month = today.getUTCMonth();
  const day = today.getUTCDate();
  const year = today.getUTCFullYear();

  // Feb 29 birthdays only receive emails in leap years (exact match).
  const birthdays = await prisma.student.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      guardianEmail: true,
      emailOptOut: true,
    },
  });

  let sent = 0;
  let handled = 0;
  for (const student of birthdays) {
    if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
    const dob = student.dateOfBirth!;
    if (dob.getUTCMonth() !== month || dob.getUTCDate() !== day) continue;
    if (student.emailOptOut) continue;

    const dedupKey = `birthday:${student.id}:${year}`;
    if (!(await notYetSent(dedupKey))) continue;

    const recipient = resolveRecipient(student);
    if (!recipient) continue;

    handled++;
    const result = await sendEmail(
      recipient,
      "birthday",
      {
        studentName: `${student.firstName} ${student.lastName}`,
        appName,
      },
      { assessmentId: dedupKey },
    );
    if (result.ok) sent++;
  }
  return sent;
}

// --------------- trial follow-ups ---------------

export async function sendTrialFollowUps(
  now: Date = new Date(),
): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.trialFollowUpsEnabled) return 0;

  const { appName } = await getReminderContext();
  const today = startOfToday(now);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - settings.trialFollowUpDaysAfterJoin);

  // Open trials whose follow-up anchor has passed the window. The anchor is
  // the class the prospect booked (public booking page); walk-ins and
  // manually created trials fall back to when they joined the pipeline.
  const trials = await prisma.student.findMany({
    where: {
      status: "TRIAL",
      trialStage: { in: ["NEW", "CONTACTED", "FIRST_CLASS"] },
      OR: [
        { trialBookedFor: { lte: cutoff } },
        { trialBookedFor: null, joinedAt: { lte: cutoff } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      joinedAt: true,
      trialBookedFor: true,
      email: true,
      guardianEmail: true,
      emailOptOut: true,
    },
  });

  let sent = 0;
  let handled = 0;
  for (const trial of trials) {
    if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
    const dedupKey = `trial-followup:${trial.id}`;
    if (!(await notYetSent(dedupKey))) continue;
    if (trial.emailOptOut) continue;

    const recipient = resolveRecipient(trial);
    if (!recipient) continue;

    const anchor = trial.trialBookedFor ?? trial.joinedAt;
    const trialDays = Math.max(
      1,
      Math.floor(
        (today.getTime() - utcMidnightOf(anchor).getTime()) / 86_400_000,
      ),
    );
    handled++;
    const result = await sendEmail(
      recipient,
      "trialFollowUp",
      {
        studentName: `${trial.firstName} ${trial.lastName}`,
        trialDays: String(trialDays),
        appName,
      },
      { assessmentId: dedupKey },
    );
    if (result.ok) sent++;
  }
  return sent;
}

// --------------- agreement reminders ---------------

// One reminder per student per outstanding enabled document. "Outstanding"
// means unsigned, or signed against an older version (re-sign required), so
// bumping a document's version re-arms the reminder for everyone. Version
// based only — no time-based expiry.
export async function sendAgreementReminders(): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.agreementRemindersEnabled) return 0;

  const documents = await listDocuments(true);
  if (documents.length === 0) return 0;

  const { appName } = await getReminderContext();
  const students = await prisma.student.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      guardianEmail: true,
      emailOptOut: true,
      agreements: { select: { documentId: true, version: true } },
    },
  });

  let sent = 0;
  let handled = 0;
  for (const student of students) {
    if (student.emailOptOut) continue;
    for (const document of documents) {
      if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
      const signature = student.agreements.find(
        (row) => row.documentId === document.id,
      );
      if (signature && signature.version === document.version) continue;

      const dedupKey = `agreement-reminder:${student.id}:${document.id}:${document.version}`;
      if (!(await notYetSent(dedupKey))) continue;

      const recipient = resolveRecipient(student);
      if (!recipient) continue;

      handled++;
      const result = await sendEmail(
        recipient,
        "agreementReminder",
        {
          studentName: `${student.firstName} ${student.lastName}`,
          documentTitle: document.title,
          appName,
        },
        { assessmentId: dedupKey },
      );
      if (result.ok) sent++;
    }
    if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
  }
  return sent;
}

// --------------- verification reminders ---------------

// One reminder per trainer per expiring/expired credential, repeated weekly
// until the record is renewed (a new expiry re-arms the window). A trainer
// with no email falls back to the configured staff recipients.
export async function sendVerificationReminders(
  now: Date = new Date(),
): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.verificationRemindersEnabled) return 0;

  const { appName, defaultLocale } = await getReminderContext();
  const windowEnd = addDays(
    startOfToday(now),
    settings.verificationReminderDaysBefore,
  );
  // Weekly bucket keeps a reminder from repeating within the same week.
  const weekBucket = Math.floor(now.getTime() / (7 * 86_400_000));

  const records = await prisma.trainerVerification.findMany({
    where: {
      expiresAt: { not: null, lte: windowEnd },
      trainer: { isActive: true },
    },
    include: {
      type: { select: { name: true } },
      trainer: { select: { name: true, email: true } },
    },
  });

  let sent = 0;
  let handled = 0;
  for (const record of records) {
    if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
    if (!record.expiresAt) continue;

    const trainerEmail = record.trainer.email?.trim();
    const recipients = trainerEmail
      ? [trainerEmail]
      : settings.verificationReminderRecipients;
    const expiry = record.expiresAt.toISOString().slice(0, 10);

    for (const recipient of recipients) {
      if (handled >= MAX_REMINDER_SENDS_PER_TICK) break;
      const dedupKey = `verification-reminder:${record.id}:${expiry}:${weekBucket}:${recipient}`;
      if (!(await notYetSent(dedupKey))) continue;

      handled++;
      const result = await sendEmail(
        recipient,
        "verificationReminder",
        {
          trainerName: record.trainer.name,
          verificationName: record.type.name,
          expiryDate: formatDateUtc(record.expiresAt, defaultLocale),
          appName,
        },
        { assessmentId: dedupKey },
      );
      if (result.ok) sent++;
    }
  }
  return sent;
}

// --------------- scheduler entry point ---------------

// SMTP not configured → skip silently (each job would otherwise create
// FAILED notification rows every tick).
export async function runReminderJobs(
  now: Date = new Date(),
): Promise<ReminderResults> {
  const results: ReminderResults = {
    classRemindersSent: 0,
    paymentRemindersSent: 0,
    birthdayEmailsSent: 0,
    trialFollowUpsSent: 0,
    agreementRemindersSent: 0,
    verificationRemindersSent: 0,
  };
  // Without SMTP there is nothing to do — and bailing here keeps failed-send
  // log rows (which carry the dedup keys) from being created on every tick.
  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) return results;
  try {
    results.classRemindersSent = await sendClassReminders(now);
    results.paymentRemindersSent = await sendPaymentReminders(now);
    results.birthdayEmailsSent = await sendBirthdayEmails(now);
    results.trialFollowUpsSent = await sendTrialFollowUps(now);
    results.agreementRemindersSent = await sendAgreementReminders();
    results.verificationRemindersSent = await sendVerificationReminders(now);
  } catch (error: unknown) {
    console.error(
      "[cron] reminder jobs failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return results;
}
