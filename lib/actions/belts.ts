"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  applyBeltRangeToCourse,
  checkPromotionEligibility,
  createBeltLevel,
  createBeltRangeEntry,
  deleteBeltLevel,
  deleteBeltRangeEntry,
  deletePromotion,
  recordHistoricalPromotion,
  recordPromotion,
  updateBeltLevel,
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

  const parsed = promotionSchema.safeParse({
    beltLevelId: getField(formData, "beltLevelId"),
    awardedAt: getField(formData, "awardedAt"),
    notes: getField(formData, "notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Enforce the training requirement unless the instructor explicitly
  // overrides (make-up gradings, exceptional progression, …).
  const eligibility = await checkPromotionEligibility(
    studentId,
    parsed.data.beltLevelId,
  );
  if (eligibility === null) {
    return { error: "That belt level no longer exists." };
  }
  if (eligibility.status === "insufficient") {
    const overrideConfirmed =
      getField(formData, "overrideEligibility") === "on";
    if (!overrideConfirmed) {
      return {
        error: `${eligibility.targetBeltName} requires ${eligibility.requiredTrainings} trainings — the student has attended ${eligibility.trainingsTotal}. Tick "Override eligibility" to record anyway.`,
      };
    }
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

export async function applyBeltRangeAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const courseId = getField(formData, "courseId");

  await applyBeltRangeToCourse(courseId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_BELT_LEVEL,
      "Course",
      courseId,
      { action: "applied-standard-belt-range" },
    );
  }
  revalidatePath(`/belts/${courseId}`);
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

// --------------- standard belt range (Settings -> Belts) ---------------

function parseRangeInput(formData: FormData) {
  return beltLevelSchema.safeParse({
    name: getField(formData, "name"),
    colorHex: getField(formData, "colorHex"),
    order: getField(formData, "order"),
    requiredTrainings: getField(formData, "requiredTrainings") || "0",
  });
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function createBeltRangeEntryAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  await requirePermission(PERMISSIONS.BELTS_EDIT);

  const parsed = parseRangeInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createBeltRangeEntry(parsed.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "A belt with that name already exists in the range." };
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
    );
  }
  return { ok: true, message: "Belt added to the standard range." };
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function updateBeltRangeEntryAction(
  previousState: BeltActionState,
  formData: FormData,
): Promise<BeltActionState> {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const entryId = getField(formData, "entryId");

  const parsed = parseRangeInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateBeltRangeEntry(entryId, parsed.data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "A belt with that name already exists in the range." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_BELT_LEVEL,
      "BeltRangeEntry",
      entryId,
    );
  }
  return { ok: true, message: "Belt range updated." };
}

export async function deleteBeltRangeEntryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const entryId = getField(formData, "entryId");

  await deleteBeltRangeEntry(entryId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_BELT_LEVEL,
      "BeltRangeEntry",
      entryId,
    );
  }
  revalidatePath("/settings");
}

export type BeltImportState =
  | { ok: true; message: string; created: number; skipped: number }
  | { ok: false; error: string }
  | undefined;

// Feeds useActionState — must not revalidatePath (see AGENTS.md). Belts must
// already exist in the selected course's ladder (per design: no auto-creation).
export async function importBeltHistoryAction(
  previousState: BeltImportState,
  formData: FormData,
): Promise<BeltImportState> {
  const actor = await requirePermission(PERMISSIONS.BELTS_EDIT);
  const courseId = getField(formData, "courseId");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, locationId: true },
  });
  if (!course) {
    return { ok: false, error: "Choose a course." };
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

  const belts = await prisma.beltLevel.findMany({
    where: { courseId },
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
    beltLevelId: string;
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
        `Row ${i + 2}: unknown belt "${row.belt}" — add it to the course's ladder first.`,
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

    const match = await findStudentForImport(
      { email: row.email, firstName: row.firstName, lastName: row.lastName },
      course.locationId,
    );
    if (match.status !== "found") {
      const reason =
        match.status === "not_found"
          ? "student not found"
          : match.status === "ambiguous"
            ? "student name matches several students"
            : "student is not at this course's location";
      rowErrors.push(`Row ${i + 2}: ${reason}.`);
      continue;
    }

    validRows.push({
      studentId: match.studentId,
      beltLevelId: belt.id,
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
    "Course",
    courseId,
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
