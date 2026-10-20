"use server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getTranslations } from "next-intl/server";
import { recordStudentSignature } from "@/lib/db/agreements";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";

export type AgreementSignatureState =
  { ok: boolean; message: string } | undefined;

// Staff-record a paper signature (date + who signed). State-fed action —
// no revalidatePath; the client refreshes via useActionFeedback.
export async function recordAgreementSignatureAction(
  _previousState: AgreementSignatureState,
  formData: FormData,
): Promise<AgreementSignatureState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const t = await getTranslations("Students.signature");
  const studentId = String(formData.get("studentId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const signedByName = String(formData.get("signedByName") ?? "").trim();
  const signedAtRaw = String(formData.get("signedAt") ?? "");

  if (!studentId || !documentId) {
    return { ok: false, message: t("missing") };
  }
  if (!signedByName) {
    return { ok: false, message: t("whoRequired") };
  }
  const signedAt = new Date(`${signedAtRaw}T12:00:00`);
  if (Number.isNaN(signedAt.getTime())) {
    return { ok: false, message: t("invalidDate") };
  }

  await recordStudentSignature({
    studentId,
    documentId,
    signedAt,
    signedByName,
    recordedById: user.id,
  });
  await logAudit(
    user.id,
    AUDIT_ACTIONS.RECORD_AGREEMENT,
    "Student",
    studentId,
    { documentId, signedByName },
  );
  return { ok: true, message: t("recorded") };
}
