"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  bulkAssignDisciplines,
  createStudent,
  deleteStudent,
  exportAllStudents,
  getStudent,
  listStudents,
  setStudentPhoto,
  setStudentLocations,
  updateStudent,
  updateStudentStatus,
} from "@/lib/db/students";
import { listLocations } from "@/lib/db/locations";
import { enrollStudent } from "@/lib/db/memberships";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { resolveCountryCode } from "@/lib/countries";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import {
  studentSchema,
  studentImportSchema,
  studentCsvRowSchema,
  STUDENT_STATUSES,
  applyMedicalPermission,
  type StudentInput,
  type StudentCsvRow,
} from "@/lib/schemas/student";
import {
  Prisma,
  type StudentStatus,
} from "../../prisma/generated/prisma/client";

export type StudentFormState =
  { error: string } | { ok: true; message: string } | undefined;

type TranslateError = (key: string) => string;

// Zod stops at the first issue for these single-field rules; map its path to a
// specific translated message so the form can say what is actually missing.
function studentErrorMessage(
  issues: { path: readonly PropertyKey[]; message: string }[],
  translate: TranslateError,
): string {
  const first = issues[0];
  const field = first?.path[0];
  switch (field) {
    case "firstName":
      return translate("firstNameRequired");
    case "lastName":
      return translate("lastNameRequired");
    case "email":
    case "guardianEmail":
      return translate("emailInvalid");
    case "locationIds":
      return translate("locationRequired");
    case "primaryLocationId":
      return first.message.includes("one of the assigned locations")
        ? translate("primaryMismatch")
        : translate("primaryRequired");
    case "disciplineIds":
      return translate("disciplineRequired");
    default:
      return translate("invalid");
  }
}

function parseStudentInput(formData: FormData) {
  return studentSchema.safeParse({
    firstName: getField(formData, "firstName"),
    lastName: getField(formData, "lastName"),
    email: getField(formData, "email"),
    phone: getField(formData, "phone"),
    dateOfBirth: getField(formData, "dateOfBirth"),
    emergencyContactName: getField(formData, "emergencyContactName"),
    emergencyContactPhone: getField(formData, "emergencyContactPhone"),
    guardianName: getField(formData, "guardianName"),
    guardianEmail: getField(formData, "guardianEmail"),
    guardianPhone: getField(formData, "guardianPhone"),
    guardianRelationship: getField(formData, "guardianRelationship"),
    householdId: getField(formData, "householdId") || undefined,
    medicalMedications: getField(formData, "medicalMedications"),
    medicalConditions: getField(formData, "medicalConditions"),
    medicalInjuries: getField(formData, "medicalInjuries"),
    addressLine: getField(formData, "addressLine"),
    city: getField(formData, "city"),
    state: getField(formData, "state"),
    postcode: getField(formData, "postcode"),
    country: getField(formData, "country"),
    status: getField(formData, "status") || "TRIAL",
    notes: getField(formData, "notes"),
    locationIds: formData
      .getAll("locationIds")
      .map((value) => String(value))
      .filter(Boolean),
    primaryLocationId: getField(formData, "primaryLocationId"),
    disciplineIds: formData
      .getAll("disciplineIds")
      .map((value) => String(value))
      .filter(Boolean),
  });
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// Fills blank guardian contact from the household the student joins, so a
// sibling inherits the family contact.
async function inheritHouseholdContact(
  data: StudentInput,
): Promise<StudentInput> {
  if (!data.householdId) return data;
  const household = await prisma.household.findUnique({
    where: { id: data.householdId },
    select: { contactName: true, contactEmail: true, contactPhone: true },
  });
  if (!household) return data;
  return {
    ...data,
    guardianName: data.guardianName ?? household.contactName,
    guardianEmail: data.guardianEmail ?? household.contactEmail,
    guardianPhone: data.guardianPhone ?? household.contactPhone,
  };
}

async function handlePhotoUpload(
  formData: FormData,
  currentPhotoKey: string | null,
): Promise<{ photoKey: string | null; error?: string }> {
  const translate = await getTranslations("Students.errors");
  const removePhoto = getField(formData, "removePhoto") === "true";
  const photoFile = formData.get("photoFile");

  if (removePhoto) {
    return { photoKey: null };
  }
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return { photoKey: currentPhotoKey };
  }

  if (photoFile.size > 2 * 1024 * 1024) {
    return { photoKey: currentPhotoKey, error: translate("photoTooLarge") };
  }
  if (
    !photoFile.type.startsWith("image/") ||
    isDangerousUploadMime(photoFile.type)
  ) {
    return { photoKey: currentPhotoKey, error: translate("photoType") };
  }
  const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return {
      photoKey: currentPhotoKey,
      error: translate("photoFormat"),
    };
  }
  const buffer = Buffer.from(await photoFile.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return {
      photoKey: currentPhotoKey,
      error: translate("photoMismatch"),
    };
  }

  const fileName = `student-photo-${randomBytes(8).toString("hex")}.${ext}`;
  await storage.save(fileName, buffer);
  return { photoKey: fileName };
}

export async function createStudentAction(
  previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const actor = await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const translate = await getTranslations("Students.errors");

  const parsed = parseStudentInput(formData);
  if (!parsed.success) {
    return { error: studentErrorMessage(parsed.error.issues, translate) };
  }

  // Medical PHI is gated by students:medical on the WRITE side too: without
  // it the fields are never rendered, so anything submitted (including a
  // crafted request) must be ignored rather than stored.
  const data = await inheritHouseholdContact(
    applyMedicalPermission(
      parsed.data,
      null,
      hasPermission(actor.permissions, PERMISSIONS.STUDENTS_MEDICAL),
    ),
  );

  let studentId: string;
  try {
    studentId = await createStudent(data);
  } catch (error: unknown) {
    if (isDuplicateEmailError(error)) {
      return { error: translate("duplicateEmail") };
    }
    throw error;
  }

  const { photoKey, error } = await handlePhotoUpload(formData, null);
  if (error) {
    return { error };
  }
  if (photoKey) {
    await setStudentPhoto(studentId, photoKey);
  }

  await logAudit(actor.id, AUDIT_ACTIONS.CREATE_STUDENT, "Student", studentId);
  redirect(`/students/${studentId}?created=1`);
}

export async function updateStudentAction(
  previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const actor = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const studentId = getField(formData, "studentId");
  const translate = await getTranslations("Students.errors");

  const parsed = parseStudentInput(formData);
  if (!parsed.success) {
    return { error: studentErrorMessage(parsed.error.issues, translate) };
  }

  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      photoKey: true,
      medicalMedications: true,
      medicalConditions: true,
      medicalInjuries: true,
    },
  });

  // Without students:medical the medical inputs are absent from the form —
  // writing the parsed (empty → null) values would erase the student's PHI.
  // Preserve the stored values (and ignore any crafted submission) instead.
  const data = await inheritHouseholdContact(
    applyMedicalPermission(
      parsed.data,
      existing,
      hasPermission(actor.permissions, PERMISSIONS.STUDENTS_MEDICAL),
    ),
  );

  try {
    await updateStudent(studentId, data);
  } catch (error: unknown) {
    if (isDuplicateEmailError(error)) {
      return { error: translate("duplicateEmail") };
    }
    throw error;
  }

  const { photoKey, error } = await handlePhotoUpload(
    formData,
    existing?.photoKey ?? null,
  );
  if (error) {
    return { error };
  }
  if (photoKey !== (existing?.photoKey ?? null)) {
    await setStudentPhoto(studentId, photoKey);
  }

  await logAudit(actor.id, AUDIT_ACTIONS.UPDATE_STUDENT, "Student", studentId);
  // Post/redirect/get: land back on the student's display page with a flash
  // toast (redirect() supersedes the useActionState return value).
  redirect(`/students/${studentId}?updated=1`);
}

export async function deleteStudentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.STUDENTS_DELETE);
  const studentId = getField(formData, "studentId");
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.DELETE_STUDENT, "Student", studentId);
  }
  await deleteStudent(studentId);
  redirect("/students");
}

export async function updateStudentStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const studentId = getField(formData, "studentId");
  const status = getField(formData, "status");
  if (!STUDENT_STATUSES.includes(status as StudentStatus)) {
    return;
  }
  await updateStudentStatus(studentId, status as StudentStatus);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_STUDENT_STATUS,
      "Student",
      studentId,
      { status },
    );
  }
  revalidatePath(`/students/${studentId}`);
}

export async function addAttachmentAction(
  previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string } | undefined> {
  await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const translate = await getTranslations("Students.attachments");
  const studentId = getField(formData, "studentId");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: translate("missingFile") };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      message: translate("tooLarge", {
        mb: Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024)),
      }),
    };
  }

  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.has(ext)) {
    return {
      ok: false,
      message: translate("badType", { ext }),
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return {
      ok: false,
      message: translate("mismatch"),
    };
  }

  const storageKey = `student-attachment-${randomBytes(12).toString("hex")}.${ext}`;
  await storage.save(storageKey, buffer);
  await prisma.attachment.create({
    data: {
      entityType: "Student",
      entityId: studentId,
      fileName,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      displayName: getField(formData, "displayName") || fileName,
    },
  });

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_STUDENT, "Student", studentId);
  }
  // No revalidatePath: this feeds useActionState — the client refreshes via
  // useActionFeedback (see AGENTS.md).
  return { ok: true, message: translate("added") };
}

export async function deleteAttachmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const attachmentId = getField(formData, "attachmentId");
  const studentId = getField(formData, "studentId");

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) return;

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await storage.delete(attachment.storageKey).catch(() => undefined);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_STUDENT,
      "Student",
      studentId,
      {
        attachmentId,
        removed: attachment.storageKey,
      },
    );
  }

  revalidatePath(`/students/${studentId}`);
}

export type StudentsImportState =
  | { ok: true; message: string; count: number }
  | { ok: false; error: string }
  | undefined;

export async function importStudentsAction(
  previousState: StudentsImportState,
  formData: FormData,
): Promise<StudentsImportState> {
  const actor = await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const translate = await getTranslations("Students.import");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: translate("missingFile") };
  }
  if (file.size > 1_000_000) {
    return { ok: false, error: translate("tooLarge") };
  }

  const text = await file.text();
  const rows = parseCsvWithHeaders(text);
  if (rows.length === 0) {
    return {
      ok: false,
      error: translate("noRows"),
    };
  }

  const locations = await listLocations();
  const locationIdByName = new Map(
    locations.map((location) => [location.name.toLowerCase(), location.id]),
  );

  const rowErrors: string[] = [];
  const parsedInputs: StudentInput[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rawLocations = (raw.locations ?? "")
      .split(";")
      .map((name) => name.trim())
      .filter(Boolean);

    const parsedRow = studentCsvRowSchema.safeParse({
      firstName: raw.firstname ?? raw.firstName ?? "",
      lastName: raw.lastname ?? raw.lastName ?? "",
      email: raw.email ?? "",
      phone: raw.phone ?? "",
      dateOfBirth: raw.dateofbirth ?? raw.dateOfBirth ?? "",
      emergencyContactName: raw.emergencycontactname ?? "",
      emergencyContactPhone: raw.emergencycontactphone ?? "",
      guardianName: raw.guardianname ?? raw.guardianName ?? "",
      guardianEmail: raw.guardianemail ?? raw.guardianEmail ?? "",
      guardianPhone: raw.guardianphone ?? raw.guardianPhone ?? "",
      guardianRelationship:
        raw.guardianrelationship ?? raw.guardianRelationship ?? "",
      addressLine: raw.addressline ?? raw.addressLine ?? "",
      city: raw.city ?? "",
      state: raw.state ?? "",
      postcode: raw.postcode ?? "",
      country: raw.country ?? "",
      status: raw.status ?? "",
      notes: raw.notes ?? "",
      locations: raw.locations ?? "",
      primaryLocation: raw.primarylocation ?? raw.primaryLocation ?? "",
    });

    if (!parsedRow.success) {
      rowErrors.push(
        translate("row", {
          row: i + 2,
          message: parsedRow.error.issues[0]?.message ?? "invalid",
        }),
      );
      continue;
    }

    const csvRow: StudentCsvRow = parsedRow.data;
    const unknownLocations = rawLocations.filter(
      (name) => !locationIdByName.has(name.toLowerCase()),
    );
    if (unknownLocations.length > 0) {
      rowErrors.push(
        translate("unknownLocations", {
          row: i + 2,
          names: unknownLocations.join(", "),
        }),
      );
      continue;
    }

    const locationIds = rawLocations.map((name) =>
      locationIdByName.get(name.toLowerCase())!,
    );
    const primaryName = csvRow.primaryLocation || rawLocations[0] || "";
    const primaryLocationId = locationIdByName.get(primaryName.toLowerCase());
    if (!primaryLocationId) {
      rowErrors.push(translate("noLocation", { row: i + 2 }));
      continue;
    }

    const input = studentImportSchema.safeParse({
      firstName: csvRow.firstName,
      lastName: csvRow.lastName,
      email: csvRow.email,
      phone: csvRow.phone,
      dateOfBirth: csvRow.dateOfBirth,
      emergencyContactName: csvRow.emergencyContactName,
      emergencyContactPhone: csvRow.emergencyContactPhone,
      guardianName: csvRow.guardianName,
      guardianEmail: csvRow.guardianEmail,
      guardianPhone: csvRow.guardianPhone,
      guardianRelationship: csvRow.guardianRelationship,
      addressLine: csvRow.addressLine,
      city: csvRow.city,
      state: csvRow.state,
      postcode: csvRow.postcode,
      country: resolveCountryCode(csvRow.country) ?? "",
      status: csvRow.status,
      notes: csvRow.notes,
      locationIds,
      primaryLocationId,
      // CSV import has no discipline column; the link comes from the
      // attendance/belt backfill or manual assignment after import.
      disciplineIds: [],
    });
    if (!input.success) {
      rowErrors.push(
        translate("row", {
          row: i + 2,
          message: input.error.issues[0]?.message ?? "invalid",
        }),
      );
      continue;
    }

    parsedInputs.push(input.data);
  }

  if (parsedInputs.length === 0) {
    return {
      ok: false,
      error: translate("noValid", { error: rowErrors[0] ?? "unknown" }),
    };
  }

  let count = 0;
  const duplicateEmails: string[] = [];
  for (const input of parsedInputs) {
    try {
      await createStudent(input);
      count++;
    } catch (error: unknown) {
      if (isDuplicateEmailError(error)) {
        duplicateEmails.push(input.email ?? input.firstName);
      } else {
        throw error;
      }
    }
  }

  if (actor) {
    await logAudit(
      actor.id,
      AUDIT_ACTIONS.IMPORT_STUDENT,
      "Student",
      undefined,
      {
        count,
        skipped: duplicateEmails.length,
      },
    );
  }

  if (count > 0) {
    // No revalidatePath: this feeds useActionState — the client refreshes via
    // useActionFeedback (see AGENTS.md).
    return {
      ok: true,
      message: translate("imported", { count }),
      count,
    };
  }
  return {
    ok: false,
    error: translate("noneImported", { error: rowErrors[0] ?? "" }),
  };
}

// ---- bulk actions (students list selection bar) -------------------------

export type BulkActionState = { ok: boolean; message: string } | undefined;

function readSelectedIds(formData: FormData): string[] {
  return formData
    .getAll("ids")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
}

export async function bulkSetStatusAction(
  _previousState: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const translate = await getTranslations("Students");
  const ids = readSelectedIds(formData);
  const status = getField(formData, "status");
  if (ids.length === 0) {
    return { ok: false, message: translate("errors.bulkSelect") };
  }
  if (!STUDENT_STATUSES.includes(status as StudentStatus)) {
    return { ok: false, message: translate("errors.statusRequired") };
  }

  await prisma.student.updateMany({
    where: { id: { in: ids } },
    data: { status: status as StudentStatus },
  });
  await logAudit(
    user.id,
    AUDIT_ACTIONS.UPDATE_STUDENT_STATUS,
    "Student",
    "bulk",
    { status, count: ids.length, ids },
  );
  return {
    ok: true,
    message: translate("errors.statusDone", {
      count: ids.length,
      status: translate(`status.${status}`),
    }),
  };
}

export async function bulkAssignDisciplinesAction(
  _previousState: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const translate = await getTranslations("Students");
  const ids = readSelectedIds(formData);
  const disciplineIds = formData
    .getAll("disciplineIds")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  if (ids.length === 0) {
    return { ok: false, message: translate("errors.bulkSelect") };
  }
  if (disciplineIds.length === 0) {
    return { ok: false, message: translate("errors.disciplineRequired") };
  }

  const validDisciplines = await prisma.discipline.findMany({
    where: { id: { in: disciplineIds } },
    select: { id: true },
  });
  const added = await bulkAssignDisciplines(
    ids,
    validDisciplines.map((discipline) => discipline.id),
  );
  await logAudit(user.id, AUDIT_ACTIONS.UPDATE_STUDENT, "Student", "bulk", {
    disciplines: validDisciplines.map((discipline) => discipline.id),
    count: ids.length,
    ids,
  });
  return {
    ok: true,
    message:
      added > 0
        ? translate("errors.assigned", { count: added })
        : translate("errors.alreadyAssigned"),
  };
}

export async function bulkEnrollAction(
  _previousState: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const translate = await getTranslations("Students");
  const ids = readSelectedIds(formData);
  const planId = getField(formData, "planId");
  if (ids.length === 0) {
    return { ok: false, message: translate("errors.bulkSelect") };
  }
  if (!planId) {
    return { ok: false, message: translate("errors.planRequired") };
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { name: true },
  });
  if (!plan) {
    return { ok: false, message: translate("errors.planMissing") };
  }

  const results = await Promise.all(
    ids.map((studentId) =>
      enrollStudent({ studentId, planId, startDate: new Date() }),
    ),
  );
  const created = results.filter(
    (result) => result.outcome === "created",
  ).length;
  await logAudit(
    user.id,
    AUDIT_ACTIONS.CREATE_ENROLLMENT,
    "Enrollment",
    "bulk",
    { planId, count: created, ids },
  );
  return {
    ok: true,
    message:
      created === ids.length
        ? translate("errors.enrolledAll", { count: created, plan: plan.name })
        : translate("errors.enrolledSome", {
            count: created,
            total: ids.length,
            plan: plan.name,
          }),
  };
}
