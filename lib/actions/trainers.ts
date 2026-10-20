"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createTrainer, deleteTrainer, updateTrainer } from "@/lib/db/trainers";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { trainerSchema } from "@/lib/schemas/trainer";
import { Prisma } from "../../prisma/generated/prisma/client";

export type TrainerActionState =
  { error: string } | { ok: true; message: string } | undefined;

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseTrainerInput(formData: FormData) {
  return trainerSchema.safeParse({
    name: getField(formData, "name"),
    email: getField(formData, "email"),
    phone: getField(formData, "phone"),
    bio: getField(formData, "bio"),
    isActive: getField(formData, "isActive") === "on",
    userId: getField(formData, "userId"),
  });
}

export async function createTrainerAction(
  previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const translate = await getTranslations("Trainers.form");

  const parsed = parseTrainerInput(formData);
  if (!parsed.success) {
    return { error: translate("invalid") };
  }

  let trainer;
  try {
    trainer = await createTrainer(parsed.data);
  } catch (error: unknown) {
    if (isUniqueError(error)) {
      return { error: translate("duplicate") };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_TRAINER,
      "Trainer",
      trainer.id,
      { name: parsed.data.name },
    );
  }
  // Feeds useActionState — must not revalidatePath (see AGENTS.md); the
  // client refreshes via useActionFeedback.
  return { ok: true, message: translate("created") };
}

export async function updateTrainerAction(
  previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const translate = await getTranslations("Trainers.form");
  const trainerId = getField(formData, "trainerId");

  const parsed = parseTrainerInput(formData);
  if (!parsed.success) {
    return { error: translate("invalid") };
  }

  try {
    await updateTrainer(trainerId, parsed.data);
  } catch (error: unknown) {
    if (isUniqueError(error)) {
      return { error: translate("duplicate") };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_TRAINER, "Trainer", trainerId);
  }
  // Feeds useActionState — must not revalidatePath (see AGENTS.md).
  return { ok: true, message: translate("updated") };
}

export async function deleteTrainerAction(formData: FormData) {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const trainerId = getField(formData, "trainerId");

  await deleteTrainer(trainerId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.DELETE_TRAINER, "Trainer", trainerId);
  }
  revalidatePath("/trainers");
}
