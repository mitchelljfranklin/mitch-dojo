import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { listDocuments } from "@/lib/db/agreements";
import {
  getCommunicationsSettings,
  getEmailSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { formatDate } from "@/lib/utils";

// Reminder jobs for the scheduler. Each job is idempotent via NotificationLog
// dedup keys stored in the assessmentId column: once a key has ANY log row
// (sent or failed), the reminder is never attempted again — "once per
// period", safe across scheduler restarts. Failed sends stay visible in the
// audit/email log for manual follow-up.

export type ReminderResults = {
  classRemindersSent: number;
  paymentRemindersSent: number;
  birthdayEmailsSent: number;
  trialFollowUpsSent: number;
  agreementRemindersSent: number;
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

  const { name: appName } = await getOrganizationSettings();
  const windowStart = now;
  const windowEnd = new Date(
    now.getTime() + settings.classReminderHoursBefore * 3_600_000,
  );

  // Sessions whose start falls inside the reminder window.
  const candidates = await prisma.classSession.findMany({
    where: { status: "SCHEDULED" },
    include: {
      course: {
        select: { name: true, locationId: true, disciplineId: true },
      },
    },
  });

  const dueSessions = candidates.filter((session) => {
    const start = sessionStartDateTime(session);
    return start > windowStart && start <= windowEnd;
  });
  if (dueSessions.length === 0) return 0;

  let sent = 0;
  for (const session of dueSessions) {
    // Audience: ACTIVE/TRIAL students at the session's location who train
    // the course's discipline — the same population that can check in.
    const students = await prisma.student.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        locations: { some: { locationId: session.course.locationId } },
        disciplines: { some: { disciplineId: session.course.disciplineId } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        guardianEmail: true,
      },
    });

    for (const student of students) {
      const dedupKey = `class-reminder:${session.id}:${student.id}`;
      if (!(await notYetSent(dedupKey))) continue;

      const recipient = resolveRecipient(student);
      if (!recipient) continue;

      const result = await sendEmail(
        recipient,
        "classReminder",
        {
          studentName: `${student.firstName} ${student.lastName}`,
          className: session.course.name,
          classTime: `${formatDate(session.date)} at ${session.startTime}`,
          appName,
        },
        { assessmentId: dedupKey },
      );
      if (result.ok) sent++;
    }
  }
  return sent;
}

// --------------- payment reminders ---------------

export async function sendPaymentReminders(
  now: Date = new Date(),
): Promise<number> {
  const settings = await getCommunicationsSettings();
  if (!settings.paymentRemindersEnabled) return 0;

  const { name: appName } = await getOrganizationSettings();
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
  for (const invoice of invoices) {
    const dueSoon =
      invoice.dueDate >= today && invoice.dueDate <= dueSoonCutoff;
    const overdue = invoice.dueDate < overdueCutoff;
    if (!dueSoon && !overdue) continue;

    const variant = overdue ? "payment-overdue" : "payment-due";
    const dedupKey = `${variant}:${invoice.id}`;
    if (!(await notYetSent(dedupKey))) continue;

    const recipient = resolveRecipient(invoice.student);
    if (!recipient) continue;

    const result = await sendEmail(
      recipient,
      "paymentReminder",
      {
        studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
        invoiceNumber: String(invoice.number),
        dueDate: formatDate(invoice.dueDate),
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

  const { name: appName } = await getOrganizationSettings();
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
    },
  });

  let sent = 0;
  for (const student of birthdays) {
    const dob = student.dateOfBirth!;
    if (dob.getUTCMonth() !== month || dob.getUTCDate() !== day) continue;

    const dedupKey = `birthday:${student.id}:${year}`;
    if (!(await notYetSent(dedupKey))) continue;

    const recipient = resolveRecipient(student);
    if (!recipient) continue;

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

  const { name: appName } = await getOrganizationSettings();
  const today = startOfToday(now);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - settings.trialFollowUpDaysAfterJoin);

  // Open trials that have sat in the pipeline past the follow-up window.
  const trials = await prisma.student.findMany({
    where: {
      status: "TRIAL",
      trialStage: { in: ["NEW", "CONTACTED", "FIRST_CLASS"] },
      joinedAt: { lte: cutoff },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      joinedAt: true,
      email: true,
      guardianEmail: true,
    },
  });

  let sent = 0;
  for (const trial of trials) {
    const dedupKey = `trial-followup:${trial.id}`;
    if (!(await notYetSent(dedupKey))) continue;

    const recipient = resolveRecipient(trial);
    if (!recipient) continue;

    const trialDays = Math.max(
      1,
      Math.floor(
        (today.getTime() - utcMidnightOf(trial.joinedAt).getTime()) /
          86_400_000,
      ),
    );
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

  const { name: appName } = await getOrganizationSettings();
  const students = await prisma.student.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      guardianEmail: true,
      agreements: { select: { documentId: true, version: true } },
    },
  });

  let sent = 0;
  for (const student of students) {
    for (const document of documents) {
      const signature = student.agreements.find(
        (row) => row.documentId === document.id,
      );
      if (signature && signature.version === document.version) continue;

      const dedupKey = `agreement-reminder:${student.id}:${document.id}:${document.version}`;
      if (!(await notYetSent(dedupKey))) continue;

      const recipient = resolveRecipient(student);
      if (!recipient) continue;

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
  } catch (error: unknown) {
    console.error(
      "[cron] reminder jobs failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return results;
}
