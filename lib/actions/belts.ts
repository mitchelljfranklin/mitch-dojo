"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  checkPromotionEligibility,
  createBeltRangeEntry,
  createDiscipline,
  deleteBeltRangeEntry,
  deleteDiscipline,
  deletePromotion,
  getDisciplineWithBelts,
  recordHistoricalPromotion,
  recordPromotion,
  updateBeltRangeEntry,
} from "@/lib/db/belts";
import { findStudentForImport } from "@/lib/db/students";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import {
  beltHistoryCsvRowSchema,
  beltLevelSchema,
  promotionSchema,
} from "@/lib/schemas/belt";

export type BeltActionState =
  { error: string } | { ok: true; message: string } | undefined;

// --------------- disciplines ---------------

function isUniqueNameError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Unique constraint");
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function createDisciplineAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts");

  const name = getField(formData, "name")?.trim();
  if (!name || name.length === 0 || name.length > 80) {
    return { error: t("errors.disciplineName") };
  }

  try {
    await createDiscipline(name);
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: t("errors.disciplineDuplicate") };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_DISCIPLINE,
      "Discipline",
      name,
    );
  }
  return { ok: true, message: t("created") };
}

export async function deleteDisciplineAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts");
  const disciplineId = getField(formData, "disciplineId");

  try {
    await deleteDiscipline(disciplineId);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.startsWith("This discipline has courses")
    ) {
      redirect(
        `/belts?disciplineError=${encodeURIComponent(
          t("errors.disciplineHasCourses"),
        )}`,
      );
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_DISCIPLINE,
      "Discipline",
      disciplineId,
    );
  }
  revalidatePath("/belts");
}

// --------------- discipline belt ladder ---------------

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
  const t = await getTranslations("Belts");
  const disciplineId = getField(formData, "disciplineId");

  const parsed = parseBeltInput(formData);
  if (!parsed.success) {
    return { error: t("errors.beltInvalid") };
  }

  try {
    await createBeltRangeEntry(disciplineId, parsed.data);
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: t("errors.beltDuplicate") };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_BELT_LEVEL,
      "BeltRangeEntry",
      parsed.data.name,
      { disciplineId },
    );
  }
  return { ok: true, message: t("beltAdded") };
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function updateBeltLevelAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts");
  const beltLevelId = getField(formData, "beltLevelId");

  const parsed = parseBeltInput(formData);
  if (!parsed.success) {
    return { error: t("errors.beltInvalid") };
  }

  try {
    await updateBeltRangeEntry(beltLevelId, parsed.data);
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: t("errors.beltDuplicate") };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_BELT_LEVEL,
      "BeltRangeEntry",
      beltLevelId,
    );
  }
  return { ok: true, message: t("beltUpdated") };
}

export async function deleteBeltLevelAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts");
  const beltLevelId = getField(formData, "beltLevelId");
  const disciplineId = getField(formData, "disciplineId");

  try {
    await deleteBeltRangeEntry(beltLevelId);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.startsWith("This belt has been awarded")
    ) {
      redirect(
        `/belts/${disciplineId}?beltError=${encodeURIComponent(
          t("errors.beltAwarded"),
        )}`,
      );
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_BELT_LEVEL,
      "BeltRangeEntry",
      beltLevelId,
    );
  }
  revalidatePath(`/belts/${disciplineId}`);
}

// --------------- promotion ---------------

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function recordPromotionAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  const user = await requirePermission(PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts");
  const studentId = getField(formData, "studentId");

  const parsed = promotionSchema.safeParse({
    beltRangeEntryId: getField(formData, "beltRangeEntryId"),
    awardedAt: getField(formData, "awardedAt"),
    notes: getField(formData, "notes"),
    trainingsCredit: getField(formData, "trainingsCredit") || "0",
  });
  if (!parsed.success) {
    return { error: t("errors.promotionInvalid") };
  }

  // Enforce the training requirement unless the instructor explicitly
  // overrides (make-up gradings, exceptional progression, …). On a
  // first-belt promotion the trainings credit entered with it counts
  // towards its own threshold — the instructor is asserting the student
  // already trained that much elsewhere.
  const eligibility = await checkPromotionEligibility(
    studentId,
    parsed.data.beltRangeEntryId,
  );
  if (eligibility === null) {
    return { error: t("errors.beltMissing") };
  }
  const requiredTrainings = eligibility.requiredTrainings ?? 0;
  const creditTowardsGate =
    eligibility.currentBeltName === null ? parsed.data.trainingsCredit : 0;
  const effectiveTrainings = eligibility.trainingsTotal + creditTowardsGate;
  if (effectiveTrainings < requiredTrainings) {
    const overrideConfirmed =
      getField(formData, "overrideEligibility") === "on";
    if (!overrideConfirmed) {
      return {
        error: t("errors.eligibility", {
          belt: eligibility.targetBeltName,
          required: requiredTrainings,
          count: effectiveTrainings,
        }),
      };
    }
  }

  try {
    await recordPromotion({
      studentId,
      beltRangeEntryId: parsed.data.beltRangeEntryId,
      awardedAt: new Date(parsed.data.awardedAt),
      notes: parsed.data.notes,
      awardedById: user.id,
      trainingsCredit: parsed.data.trainingsCredit,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("not found")) {
      return { error: t("errors.beltMissing") };
    }
    throw error;
  }

  await logAudit(
    user.id,
    AUDIT_ACTIONS.RECORD_PROMOTION,
    "StudentBelt",
    parsed.data.beltRangeEntryId,
    { studentId },
  );
  return { ok: true, message: t("promotionRecorded") };
}

export async function deletePromotionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const promotionId = getField(formData, "promotionId");

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
  revalidatePath("/students");
  revalidatePath("/belts");
}

// --------------- belt history import ---------------

export type BeltImportState =
  | { ok: true; message: string; created: number; skipped: number }
  | { ok: false; error: string }
  | undefined;

// Feeds useActionState — must not revalidatePath (see AGENTS.md). Belts must
// already exist in the selected discipline's ladder (per design).
export async function importBeltHistoryAction(
  previousState: BeltImportState,
  formData: FormData,
): Promise<BeltImportState> {
  const actor = await requirePermission(PERMISSIONS.BELTS_EDIT);
  const disciplineId = getField(formData, "disciplineId");

  const discipline = await prisma.discipline.findUnique({
    where: { id: disciplineId },
    select: { id: true },
  });
  if (!discipline) {
    return { ok: false, error: "Choose a discipline." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > 1_000_000) {
    return { ok: false, error: "File is too large (max 1 MB)." };
  }

  const text = await file.text();
  const rows = parseCsvWithHeaders(text);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No rows found in CSV. The first row must be a header.",
    };
  }

  const belts = await prisma.beltRangeEntry.findMany({
    where: { disciplineId },
    select: { id: true, name: true },
  });
  const beltByName = new Map(
    belts.map((belt) => [belt.name.toLowerCase(), belt]),
  );

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const rowErrors: string[] = [];
  const validRows: {
    studentId: string;
    beltRangeEntryId: string;
    awardedAt: Date;
    notes: string | null;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const parsed = beltHistoryCsvRowSchema.safeParse({
      email: raw.email ?? raw.studentemail ?? "",
      firstName: raw.firstname ?? raw.firstName ?? "",
      lastName: raw.lastname ?? raw.lastName ?? "",
      belt: raw.belt ?? "",
      awardedAt: raw.awardedat ?? raw.awardedAt ?? "",
      notes: raw.notes ?? "",
    });
    if (!parsed.success) {
      rowErrors.push(
        `Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      );
      continue;
    }

    const row = parsed.data;
    const belt = beltByName.get(row.belt.toLowerCase());
    if (!belt) {
      rowErrors.push(
        `Row ${i + 2}: unknown belt "${row.belt}" — add it to the discipline's ladder first.`,
      );
      continue;
    }

    const awardedAt = new Date(`${row.awardedAt}T00:00:00`);
    if (awardedAt > endOfToday) {
      rowErrors.push(
        `Row ${i + 2}: award dates in the future cannot be imported (${row.awardedAt}).`,
      );
      continue;
    }

    const match = await findStudentForImport({
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
    });
    if (match.status !== "found") {
      const reason =
        match.status === "not_found"
          ? "student not found"
          : match.status === "ambiguous"
            ? "student name matches several students"
            : "student is not at this location";
      rowErrors.push(`Row ${i + 2}: ${reason}.`);
      continue;
    }

    validRows.push({
      studentId: match.studentId,
      beltRangeEntryId: belt.id,
      awardedAt,
      notes: row.notes.length > 0 ? row.notes : null,
    });
  }

  let created = 0;
  let skipped = 0;
  for (const row of validRows) {
    const result = await recordHistoricalPromotion(row);
    if (result === "created") created++;
    else skipped++;
  }

  await logAudit(
    actor.id,
    AUDIT_ACTIONS.IMPORT_BELT_HISTORY,
    "Discipline",
    disciplineId,
    { created, skipped },
  );

  if (created > 0 || skipped > 0) {
    return {
      ok: true,
      message: `Imported ${created} promotion${created === 1 ? "" : "s"} (${skipped} duplicates skipped).`,
      created,
      skipped,
    };
  }
  return {
    ok: false,
    error: `No promotions imported. First error: ${rowErrors[0] ?? "unknown"}`,
  };
}
