"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { createPortalLink, createHouseholdPortalLink } from "@/lib/db/portal";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { sendEmail } from "@/lib/email/mailer";
import { getEmailSettings, getOrganizationSettings } from "@/lib/settings";
import { env } from "@/lib/env";

export type PortalLinkState =
  { error: string } | { ok: true; message: string } | undefined;

// Staff-triggered magic link. Sends the portal email to the student (or
// guardian fallback). Feeds useActionState — no revalidatePath (AGENTS.md);
// the caller stays on the page with a toast.
export async function sendPortalLinkAction(
  _previousState: PortalLinkState,
  formData: FormData,
): Promise<PortalLinkState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const translate = await getTranslations("Students.portalLink");
  const formatter = await getFormatter();
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) {
    return { error: translate("missingStudent") };
  }

  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) {
    return {
      error: translate("smtp"),
    };
  }

  const link = await createPortalLink(studentId, env.APP_URL);
  if (link.outcome === "no_recipient") {
    return {
      error: translate("noRecipient"),
    };
  }

  const [student, { name: appName }] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true },
    }),
    getOrganizationSettings(),
  ]);
  const expiryDays = Math.max(
    1,
    Math.ceil((link.expiresAt.getTime() - Date.now()) / 86_400_000),
  );

  const result = await sendEmail(
    link.recipient,
    "portalLink",
    {
      studentName: student
        ? `${student.firstName} ${student.lastName}`
        : "member",
      portalUrl: link.url,
      expiryDays: String(expiryDays),
      appName,
    },
    { sentById: user.id, assessmentId: `portal-link:${studentId}` },
  );

  await logAudit(
    user.id,
    AUDIT_ACTIONS.SEND_PORTAL_LINK,
    "Student",
    studentId,
    { recipient: link.recipient, emailed: result.ok },
  );

  return result.ok
    ? {
        ok: true,
        message: translate("sent", {
          email: link.recipient,
          date: formatter.dateTime(link.expiresAt, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        }),
      }
    : { error: translate("failed") };
}

// Household magic link: one login shows every child in the family.
export async function sendHouseholdPortalLinkAction(
  _previousState: PortalLinkState,
  formData: FormData,
): Promise<PortalLinkState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const translate = await getTranslations("Students.portalLink");
  const formatter = await getFormatter();
  const householdId = String(formData.get("householdId") ?? "");
  if (!householdId) {
    return { error: translate("missingHousehold") };
  }

  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) {
    return {
      error: translate("smtp"),
    };
  }

  const link = await createHouseholdPortalLink(householdId, env.APP_URL);
  if (link.outcome === "no_recipient") {
    return {
      error: translate("householdNoRecipient"),
    };
  }

  const [household, { name: appName }] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: { name: true },
    }),
    getOrganizationSettings(),
  ]);
  const expiryDays = Math.max(
    1,
    Math.ceil((link.expiresAt.getTime() - Date.now()) / 86_400_000),
  );

  const result = await sendEmail(
    link.recipient,
    "portalLink",
    {
      studentName: household?.name ?? "family",
      portalUrl: link.url,
      expiryDays: String(expiryDays),
      appName,
    },
    { sentById: user.id, assessmentId: `portal-link:household:${householdId}` },
  );

  await logAudit(
    user.id,
    AUDIT_ACTIONS.SEND_PORTAL_LINK,
    "Household",
    householdId,
    { recipient: link.recipient, emailed: result.ok },
  );

  return result.ok
    ? {
        ok: true,
        message: translate("householdSent", {
          email: link.recipient,
          date: formatter.dateTime(link.expiresAt, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        }),
      }
    : { error: translate("failed") };
}
