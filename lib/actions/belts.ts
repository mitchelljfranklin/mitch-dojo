"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createBeltLevel,
  deleteBeltLevel,
  deletePromotion,
  recordPromotion,
  updateBeltLevel,
} from "@/lib/db/belts";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { beltLevelSchema, promotionSchema } from "@/lib/schemas/belt";

export type BeltActionState =
  { error: string } | { ok: true; message: string } | undefined;

function parseBeltInput(formData: FormData) {
  return beltLevelSchema.safeParse({
    name: getField(formData, "name"),
    colorHex: getField(formData, "colorHex"),
    order: getField(formData, "order"),
    requiredTrainings: getField(formData, "requiredTrainings") || "0",
  });
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function createBeltLevelAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const courseId = getField(formData, "courseId");

  const parsed = parseBeltInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createBeltLevel(courseId, parsed.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        error: "A belt with that name already exists in this course.",
      };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_BELT_LEVEL,
      "BeltLevel",
      `${parsed.data.name}`,
      { courseId },
    );
  }
  return { ok: true, message: "Belt level added." };
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function updateBeltLevelAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const beltLevelId = getField(formData, "beltLevelId");

  const parsed = parseBeltInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateBeltLevel(beltLevelId, parsed.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        error: "A belt with that name already exists in this course.",
      };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_BELT_LEVEL,
      "BeltLevel",
      beltLevelId,
    );
  }
  return { ok: true, message: "Belt level updated." };
}

export async function deleteBeltLevelAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const beltLevelId = getField(formData, "beltLevelId");
  const courseId = getField(formData, "courseId");

  try {
    await deleteBeltLevel(beltLevelId);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.startsWith("This belt has been awarded")
    ) {
      redirect(
        `/belts/${courseId}?beltError=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_BELT_LEVEL,
      "BeltLevel",
      beltLevelId,
    );
  }
  revalidatePath(`/belts/${courseId}`);
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function recordPromotionAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  const user = await requirePermission(PERMISSIONS.BELTS_EDIT);
  const studentId = getField(formData, "studentId");
  const courseId = getField(formData, "courseId");

  const parsed = promotionSchema.safeParse({
    beltLevelId: getField(formData, "beltLevelId"),
    awardedAt: getField(formData, "awardedAt"),
    notes: getField(formData, "notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await recordPromotion({
      studentId,
      beltLevelId: parsed.data.beltLevelId,
      awardedAt: new Date(parsed.data.awardedAt),
      notes: parsed.data.notes,
      awardedById: user.id,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return { error: "That belt level no longer exists." };
    }
    throw error;
  }

  await logAudit(
    user.id,
    AUDIT_ACTIONS.RECORD_PROMOTION,
    "StudentBelt",
    parsed.data.beltLevelId,
    { studentId },
  );
  return { ok: true, message: "Promotion recorded." };
}

export async function deletePromotionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const promotionId = getField(formData, "promotionId");
  const courseId = getField(formData, "courseId");

  await deletePromotion(promotionId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_PROMOTION,
      "StudentBelt",
      promotionId,
    );
  }
  revalidatePath(`/belts/${courseId}`);
}
