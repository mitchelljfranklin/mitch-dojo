"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createVerificationType,
  deleteTrainerVerification,
  deleteVerificationType,
  saveTrainerVerification,
  setVerificationTypeActive,
  updateVerificationType,
} from "@/lib/db/verifications";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { storage } from "@/lib/storage";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
  validateMagicBytes,
} from "@/lib/upload-validation";
import { getField } from "@/lib/utils";
import {
  verificationTypeSchema,
  verificationRecordSchema,
} from "@/lib/schemas/verification";
import { Prisma } from "../../prisma/generated/prisma/client";

export type VerificationActionState =
  { error: string } | { ok: true; message: string } | undefined;

function isUniqueNameError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseTypeInput(formData: FormData) {
  return verificationTypeSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
    required: getField(formData, "required") === "on",
    requiresExpiry: getField(formData, "requiresExpiry") === "on",
    defaultValidityMonths: getField(formData, "defaultValidityMonths"),
    isActive: getField(formData, "isActive") === "on",
  });
}

// --------------- verification types (admin) ---------------

export async function createVerificationTypeAction(
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const actor = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.verifications.errors");
  const parsed = parseTypeInput(formData);
  if (!parsed.success) {
    return { error: translate("invalid") };
  }
  try {
    const { id } = await createVerificationType(parsed.data);
    await logAudit(
      actor.id,
      AUDIT_ACTIONS.CREATE_VERIFICATION_TYPE,
      "VerificationType",
      id,
      { name: parsed.data.name },
    );
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: translate("duplicate") };
    }
    throw error;
  }
  return { ok: true, message: translate("created") };
}

export async function updateVerificationTypeAction(
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const actor = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.verifications.errors");
  const typeId = getField(formData, "typeId");
  const parsed = parseTypeInput(formData);
  if (!parsed.success) {
    return { error: translate("invalid") };
  }
  try {
    await updateVerificationType(typeId, parsed.data);
    await logAudit(
      actor.id,
      AUDIT_ACTIONS.UPDATE_VERIFICATION_TYPE,
      "VerificationType",
      typeId,
    );
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: translate("duplicate") };
    }
    throw error;
  }
  return { ok: true, message: translate("updated") };
}

export async function toggleVerificationTypeAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const typeId = getField(formData, "typeId");
  const isActive = getField(formData, "isActive") === "true";
  await setVerificationTypeActive(typeId, isActive);
  await logAudit(
    actor.id,
    AUDIT_ACTIONS.UPDATE_VERIFICATION_TYPE,
    "VerificationType",
    typeId,
    { isActive },
  );
  revalidatePath("/admin/verifications");
}

export async function deleteVerificationTypeAction(
  formData: FormData,
): Promise<void> {
  const actor = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const typeId = getField(formData, "typeId");
  try {
    await deleteVerificationType(typeId);
  } catch (error: unknown) {
    const translate = await getTranslations("Admin.verifications.errors");
    const message =
      error instanceof Error && error.message.includes("records against")
        ? translate("deleteBlocked")
        : error instanceof Error
          ? error.message
          : translate("deleteFailed");
    redirect(`/admin/verifications?error=${encodeURIComponent(message)}`);
  }
  await logAudit(
    actor.id,
    AUDIT_ACTIONS.DELETE_VERIFICATION_TYPE,
    "VerificationType",
    typeId,
  );
  revalidatePath("/admin/verifications");
}

// --------------- trainer records ---------------

function isoToDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function saveTrainerVerificationAction(
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const actor = await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const translate = await getTranslations("Trainers.verifications");

  const parsed = verificationRecordSchema.safeParse({
    trainerId: getField(formData, "trainerId"),
    typeId: getField(formData, "typeId"),
    referenceNumber: getField(formData, "referenceNumber"),
    issuedAt: getField(formData, "issuedAt"),
    expiresAt: getField(formData, "expiresAt"),
    notes: getField(formData, "notes"),
  });
  if (!parsed.success) {
    return { error: translate("invalid") };
  }

  // Optional scanned document.
  let documentKey: string | undefined;
  const file = formData.get("document");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: translate("tooLarge") };
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_ATTACHMENT_EXTS.has(ext)) {
      return { error: translate("fileType", { extension: ext }) };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(ext, buffer)) {
      return { error: translate("fileContent") };
    }
    documentKey = `trainer-verification-${randomBytes(12).toString("hex")}.${ext}`;
    await storage.save(documentKey, buffer);
  }

  const result = await saveTrainerVerification({
    trainerId: parsed.data.trainerId,
    typeId: parsed.data.typeId,
    referenceNumber: parsed.data.referenceNumber,
    issuedAt: isoToDate(parsed.data.issuedAt),
    expiresAt: isoToDate(parsed.data.expiresAt),
    notes: parsed.data.notes,
    ...(documentKey !== undefined ? { documentKey } : {}),
    recordedById: actor.id,
  });

  // Replacing a document cleans up the previous file.
  if (documentKey && result.previousDocumentKey) {
    await storage.delete(result.previousDocumentKey).catch(() => undefined);
  }

  await logAudit(
    actor.id,
    AUDIT_ACTIONS.RECORD_VERIFICATION,
    "Trainer",
    parsed.data.trainerId,
    { typeId: parsed.data.typeId, expiresAt: parsed.data.expiresAt },
  );
  // State-fed — client refreshes via useActionFeedback.
  return { ok: true, message: translate("saved") };
}

export async function deleteTrainerVerificationAction(
  _previousState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const actor = await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const translate = await getTranslations("Trainers.verifications");
  const verificationId = getField(formData, "verificationId");

  const { documentKey } = await deleteTrainerVerification(verificationId);
  if (documentKey) {
    await storage.delete(documentKey).catch(() => undefined);
  }
  await logAudit(
    actor.id,
    AUDIT_ACTIONS.DELETE_VERIFICATION,
    "Trainer",
    undefined,
    { verificationId },
  );
  return { ok: true, message: translate("removed") };
}
