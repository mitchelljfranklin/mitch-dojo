"use server";

import { revalidatePath } from "next/cache";

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

  const parsed = parseTrainerInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createTrainer(parsed.data);
  } catch (error: unknown) {
    if (isUniqueError(error)) {
      return { error: "That email or linked account is already in use." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_TRAINER,
      "Trainer",
      parsed.data.name,
    );
  }
  revalidatePath("/trainers");
  return { ok: true, message: "Trainer created." };
}

export async function updateTrainerAction(
  previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const trainerId = getField(formData, "trainerId");

  const parsed = parseTrainerInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateTrainer(trainerId, parsed.data);
  } catch (error: unknown) {
    if (isUniqueError(error)) {
      return { error: "That email or linked account is already in use." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_TRAINER, "Trainer", trainerId);
  }
  revalidatePath("/trainers");
  return { ok: true, message: "Trainer updated." };
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
