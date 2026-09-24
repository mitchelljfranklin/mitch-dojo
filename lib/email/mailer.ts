import { render } from "@react-email/components";
import { type Prisma } from "../../prisma/generated/prisma/client";
import { marked } from "marked";
import nodemailer from "nodemailer";

import { DynamicEmail } from "@/emails/dynamic";
import {
  getEmailSecret,
  getEmailSettings,
  getEmailTemplateSettings,
  getAppearanceSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

// Exported for tests: builds the SMTP transport from the current settings.
export async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const settings = await getEmailSettings();
  if (!settings.smtpHost) {
    return null;
  }

  const user = settings.smtpUser || undefined;
  let auth: Record<string, unknown> | undefined;
  if (settings.smtpAuthType === "oauth2") {
    auth = await buildOAuth2Auth(user);
  } else {
    const password = await getEmailSecret();
    auth = user || password ? { user, pass: password } : undefined;
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth,
  });
}

// XOAUTH2 auth for the refresh-token grant. Microsoft needs a tenant-scoped
// token endpoint and the SMTP scope passed as a custom param; Google works
// with Nodemailer's default access URL. Missing OAuth2 credentials fall back
// to the basic-auth block so the failure lands in the email log with the
// provider's auth error instead of silently disabling sending.
async function buildOAuth2Auth(
  user: string | undefined,
): Promise<Record<string, unknown> | undefined> {
  const settings = await getEmailSettings();
  const clientId = settings.smtpOAuth2ClientId;
  const [clientSecret, refreshToken] = await Promise.all([
    getEmailSecret("smtpOAuth2ClientSecret"),
    getEmailSecret("smtpOAuth2RefreshToken"),
  ]);

  if (!user || !clientId || !clientSecret || !refreshToken) {
    console.error(
      "[email] SMTP auth type is oauth2 but credentials are incomplete — falling back to basic auth. Set client ID, client secret, and refresh token (encrypted at rest) in Admin → Email.",
    );
    const password = await getEmailSecret();
    return user || password ? { user, pass: password } : undefined;
  }

  if (settings.smtpOAuth2Provider === "microsoft") {
    const tenant = settings.smtpOAuth2Tenant || "common";
    return {
      type: "OAUTH2",
      user,
      clientId,
      clientSecret,
      refreshToken,
      accessUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      // SMTP.Send is the delegated scope Exchange Online's SMTP AUTH
      // endpoints accept for XOAUTH2.
      customParams: { scope: "https://outlook.office365.com/SMTP.Send" },
    };
  }

  // Google: Nodemailer's default access URL is Google's token endpoint.
  return {
    type: "OAUTH2",
    user,
    clientId,
    clientSecret,
    refreshToken,
  };
}

function replaceTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => tokens[key] ?? `{{${key}}}`,
  );
}

type TemplateType =
  | "invite"
  | "reminder"
  | "classReminder"
  | "paymentReminder"
  | "birthday"
  | "booking"
  | "bookingStaff"
  | "trialFollowUp"
  | "portalLink"
  | "reset";

export type SendEmailResult = {
  ok: boolean;
  subject: string;
  notificationLogId: string;
};

export type SendEmailOptions = {
  assessmentId?: string;
  sentById?: string;
  updateLogId?: string;
};

async function createNotificationLog(
  data: Prisma.NotificationLogCreateInput,
): Promise<string> {
  try {
    const created = await prisma.notificationLog.create({ data });
    return created.id;
  } catch (logError: unknown) {
    console.error(
      "Failed to create notification log:",
      logError instanceof Error ? logError.message : String(logError),
    );
    return "";
  }
}

async function updateNotificationLogStatus(
  notificationLogId: string,
  status: string,
  errorMessageValue: string | null,
): Promise<void> {
  if (!notificationLogId) return;
  await prisma.notificationLog
    .update({
      where: { id: notificationLogId },
      data: { status, errorMessage: errorMessageValue },
    })
    .catch((updateError: unknown) => {
      console.warn(
        "Failed to update notification log status:",
        updateError instanceof Error
          ? updateError.message
          : String(updateError),
      );
    });
}

export async function sendEmail(
  to: string,
  templateType: TemplateType,
  tokens: Record<string, string>,
  options?: SendEmailOptions,
): Promise<SendEmailResult> {
  const [emailSettings, templates, appearance] = await Promise.all([
    getEmailSettings(),
    getEmailTemplateSettings(),
    getAppearanceSettings(),
  ]);

  // Absolute logo URL — email clients have no base URL, so the logo must be
  // publicly reachable at the deployed app origin. The email variant chooses
  // which logo to use; "dark" falls back to the primary pair when no dark
  // logo is uploaded.
  const useDarkLogo =
    appearance.emailLogoVariant === "dark" && Boolean(appearance.logoDarkKey);
  const logoUrl = appearance.logoKey
    ? useDarkLogo
      ? `${env.APP_URL}/api/brand/logo?variant=dark&v=${encodeURIComponent(appearance.logoDarkKey)}`
      : `${env.APP_URL}/api/brand/logo?v=${encodeURIComponent(appearance.logoKey)}`
    : undefined;
  const logoVariant: "primary" | "dark" = useDarkLogo ? "dark" : "primary";

  const subjectByType: Record<TemplateType, string> = {
    invite: templates.inviteSubject,
    reminder: templates.reminderSubject,
    classReminder: templates.classReminderSubject,
    paymentReminder: templates.paymentReminderSubject,
    birthday: templates.birthdaySubject,
    booking: templates.bookingSubject,
    bookingStaff: templates.bookingStaffSubject,
    trialFollowUp: templates.trialFollowUpSubject,
    portalLink: templates.portalLinkSubject,
    reset: templates.resetSubject,
  };
  const bodyByType: Record<TemplateType, string> = {
    invite: templates.inviteBody,
    reminder: templates.reminderBody,
    classReminder: templates.classReminderBody,
    paymentReminder: templates.paymentReminderBody,
    birthday: templates.birthdayBody,
    booking: templates.bookingBody,
    bookingStaff: templates.bookingStaffBody,
    trialFollowUp: templates.trialFollowUpBody,
    portalLink: templates.portalLinkBody,
    reset: templates.resetBody,
  };

  const subject = subjectByType[templateType];
  const body = bodyByType[templateType];

  const resolvedSubject = replaceTokens(subject, tokens);
  const resolvedBody = replaceTokens(body, tokens);

  const htmlBody = await marked.parse(resolvedBody);

  const notificationLogId = options?.updateLogId
    ? options.updateLogId
    : await createNotificationLog({
        assessmentId: options?.assessmentId,
        type: templateType.toUpperCase(),
        sentTo: to,
        subject: resolvedSubject,
        status: "FAILED",
        sentBy: options?.sentById
          ? { connect: { id: options.sentById } }
          : undefined,
      });

  const transport = await getTransporter();
  if (!transport) {
    await updateNotificationLogStatus(
      notificationLogId,
      "FAILED",
      "SMTP is not configured.",
    );
    return { ok: false, subject: resolvedSubject, notificationLogId };
  }

  const emailFrom =
    emailSettings.fromAddress ||
    emailSettings.smtpUser ||
    "noreply@mitch-dojo.local";

  try {
    const html = await render(
      DynamicEmail({
        heading: resolvedSubject,
        body: resolvedBody,
        htmlBody,
        logoUrl,
        logoVariant,
      }),
    );
    await transport.sendMail({
      from: `${emailSettings.fromName} <${emailFrom}>`,
      to,
      subject: resolvedSubject,
      html,
    });

    await updateNotificationLogStatus(notificationLogId, "SENT", null);
    return { ok: true, subject: resolvedSubject, notificationLogId };
  } catch (sendError: unknown) {
    const errorMessage =
      sendError instanceof Error ? sendError.message : "unknown error";
    console.error("Failed to send email:", errorMessage);
    await updateNotificationLogStatus(
      notificationLogId,
      "FAILED",
      errorMessage,
    );
    return { ok: false, subject: resolvedSubject, notificationLogId };
  }
}

export async function sendTestEmail(
  to: string,
  sentById?: string,
  updateLogId?: string,
): Promise<{ ok: boolean; message: string }> {
  const [settings, { name: orgName }] = await Promise.all([
    getEmailSettings(),
    getOrganizationSettings(),
  ]);
  if (!settings.smtpHost) {
    return { ok: false, message: "SMTP is not configured." };
  }

  const transport = await getTransporter();
  if (!transport) {
    return { ok: false, message: "Failed to create transporter." };
  }

  const subject = `${orgName} — SMTP test`;

  const notificationLogId = updateLogId
    ? updateLogId
    : await createNotificationLog({
        type: "TEST",
        sentTo: to,
        subject,
        status: "FAILED",
        sentBy: sentById ? { connect: { id: sentById } } : undefined,
      });

  try {
    await transport.sendMail({
      from: `${settings.fromName} <${settings.fromAddress || settings.smtpUser}>`,
      to,
      subject,
      text: "Your SMTP settings are working correctly.",
    });

    await updateNotificationLogStatus(notificationLogId, "SENT", null);
    return { ok: true, message: "Test email sent." };
  } catch (sendError: unknown) {
    const errorMessage = `Failed: ${sendError instanceof Error ? sendError.message : "unknown error"}`;
    await updateNotificationLogStatus(
      notificationLogId,
      "FAILED",
      errorMessage,
    );
    return { ok: false, message: errorMessage };
  }
}
