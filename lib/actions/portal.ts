"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createPortalLink } from "@/lib/db/portal";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { sendEmail } from "@/lib/email/mailer";
import { getEmailSettings, getOrganizationSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";

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
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) {
    return { error: "Missing student." };
  }

  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) {
    return {
      error: "SMTP is not configured — set it up under Settings → Email first.",
    };
  }

  const link = await createPortalLink(studentId, env.APP_URL);
  if (link.outcome === "no_recipient") {
    return {
      error:
        "This student has no email address on file (and no guardian email).",
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
        message: `Portal link emailed to ${link.recipient} (expires ${formatDate(link.expiresAt)}).`,
      }
    : { error: "The email failed to send — check the email log." };
}
