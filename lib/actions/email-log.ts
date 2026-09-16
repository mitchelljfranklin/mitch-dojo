"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getEmailLogById } from "@/lib/db/email-log";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { sendEmail, sendTestEmail } from "@/lib/email/mailer";
import { createPortalLink } from "@/lib/db/portal";
import { getOrganizationSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export type EmailRetryState =
  { error: string } | { ok: true; message: string } | undefined;

// Retries a FAILED email by re-running the send with the CURRENT templates
// and freshly regenerated tokens, reusing the same log row (updateLogId) so
// status flips in place. Feeds useActionState — no revalidatePath
// (AGENTS.md); the client refreshes via useActionFeedback.
export async function retryEmailSendAction(
  _previousState: EmailRetryState,
  formData: FormData,
): Promise<EmailRetryState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const logId = String(formData.get("logId") ?? "");

  const log = await getEmailLogById(logId);
  if (!log) {
    return { error: "That email log entry no longer exists." };
  }
  if (log.status !== "FAILED") {
    return { error: "Only failed emails can be retried." };
  }
  if (log.type === "RESET") {
    return {
      error:
        "Reset links are single-use and cannot be resent. Ask the user to request a new reset.",
    };
  }

  // SMTP test emails bypass templates entirely and reuse the log row.
  if (log.type === "TEST") {
    const result = await sendTestEmail(log.sentTo, user.id, logId);
    await logAudit(
      user.id,
      AUDIT_ACTIONS.RETRY_EMAIL_SEND,
      "NotificationLog",
      logId,
      { emailed: result.ok },
    );
    return result.ok
      ? { ok: true, message: "Test email retried." }
      : { error: "The retry failed — check the error detail." };
  }

  const { name: appName } = await getOrganizationSettings();
  const tokens = await regenerateTokens(log.type, log.dedupKey, appName);
  if (!tokens) {
    return {
      error:
        "The original recipient or related record no longer exists — this email cannot be retried.",
    };
  }

  const result = await sendEmail(
    log.sentTo,
    log.type.toLowerCase() as Parameters<typeof sendEmail>[1],
    tokens,
    {
      assessmentId: log.dedupKey ?? undefined,
      sentById: user.id,
      updateLogId: logId,
    },
  );

  await logAudit(
    user.id,
    AUDIT_ACTIONS.RETRY_EMAIL_SEND,
    "NotificationLog",
    logId,
    { emailed: result.ok },
  );

  return result.ok
    ? { ok: true, message: "Email retried successfully." }
    : { error: "The retry failed — check the error detail." };
}

// Rebuilds the token map for a retry from current data, using the dedup key
// recorded on the log row. Returns null when the underlying record is gone.
async function regenerateTokens(
  type: string,
  dedupKey: string | null,
  appName: string,
): Promise<Record<string, string> | null> {
  // Portal links contain a one-time raw token that is never stored — a
  // retry issues a FRESH portal link for the same member.
  if (type === "PORTALLINK") {
    if (!dedupKey) return null;
    const studentId = dedupKey.replace("portal-link:", "");
    const link = await createPortalLink(studentId, env.APP_URL);
    if (link.outcome !== "sent") return null;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true },
    });
    if (!student) return null;

    const expiryDays = Math.max(
      1,
      Math.ceil((link.expiresAt.getTime() - Date.now()) / 86_400_000),
    );
    return {
      studentName: `${student.firstName} ${student.lastName}`,
      portalUrl: link.url,
      expiryDays: String(expiryDays),
      appName,
    };
  }

  if (!dedupKey) return null;
  const parts = dedupKey.split(":");

  // class-reminder:{sessionId}:{studentId}
  if (type === "CLASSREMINDER" && parts[0] === "class-reminder") {
    const session = await prisma.classSession.findUnique({
      where: { id: parts[1] ?? "" },
      select: {
        startTime: true,
        date: true,
        course: { select: { name: true } },
      },
    });
    const student = await prisma.student.findUnique({
      where: { id: parts[2] ?? "" },
      select: { firstName: true, lastName: true },
    });
    if (!session || !student) return null;
    return {
      studentName: `${student.firstName} ${student.lastName}`,
      className: session.course.name,
      classTime: `${formatDate(session.date)} at ${session.startTime}`,
      appName,
    };
  }

  // payment-due:{invoiceId} | payment-overdue:{invoiceId}
  if (
    (type === "PAYMENTREMINDER" && parts[0] === "payment-due") ||
    (type === "PAYMENTREMINDER" && parts[0] === "payment-overdue")
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parts[1] ?? "" },
      select: {
        number: true,
        dueDate: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
    if (!invoice) return null;
    return {
      studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
      invoiceNumber: String(invoice.number),
      dueDate: formatDate(invoice.dueDate),
      appName,
    };
  }

  // birthday:{studentId}:{year}
  if (type === "BIRTHDAY" && parts[0] === "birthday") {
    const student = await prisma.student.findUnique({
      where: { id: parts[1] ?? "" },
      select: { firstName: true, lastName: true },
    });
    if (!student) return null;
    return {
      studentName: `${student.firstName} ${student.lastName}`,
      appName,
    };
  }

  // trial-followup:{studentId}
  if (type === "TRIALFOLLOWUP" && parts[0] === "trial-followup") {
    const student = await prisma.student.findUnique({
      where: { id: parts[1] ?? "" },
      select: { firstName: true, lastName: true, joinedAt: true },
    });
    if (!student) return null;
    const trialDays = Math.max(
      1,
      Math.floor((Date.now() - student.joinedAt.getTime()) / 86_400_000),
    );
    return {
      studentName: `${student.firstName} ${student.lastName}`,
      trialDays: String(trialDays),
      appName,
    };
  }

  // INVITE / REMINDER templates have no dojo tokens beyond appName — but
  // they are never sent by current flows, so treat unknown types as
  // non-retryable rather than sending unpersonalised mail.
  return null;
}
