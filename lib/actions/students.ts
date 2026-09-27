"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
import { STUDENT_STATUS_LABELS } from "@/lib/schemas/student";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import {
  studentSchema,
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
  const removePhoto = getField(formData, "removePhoto") === "true";
  const photoFile = formData.get("photoFile");

  if (removePhoto) {
    return { photoKey: null };
  }
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return { photoKey: currentPhotoKey };
  }

  if (photoFile.size > 2 * 1024 * 1024) {
    return { photoKey: currentPhotoKey, error: "Photo must be under 2 MB." };
  }
  if (
    !photoFile.type.startsWith("image/") ||
    isDangerousUploadMime(photoFile.type)
  ) {
    return { photoKey: currentPhotoKey, error: "Photo must be an image file." };
  }
  const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return {
      photoKey: currentPhotoKey,
      error: "Photo must be a PNG, JPG, GIF, or WEBP image.",
    };
  }
  const buffer = Buffer.from(await photoFile.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return {
      photoKey: currentPhotoKey,
      error: "Photo file content does not match its extension.",
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

  const parsed = parseStudentInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
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
      return { error: "A student with this email already exists." };
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

  const parsed = parseStudentInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
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
      return { error: "A student with this email already exists." };
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
  const studentId = getField(formData, "studentId");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "No file selected." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      message: `File is too large (max ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB).`,
    };
  }

  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.has(ext)) {
    return {
      ok: false,
      message: `File type .${ext} is not allowed.`,
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return {
      ok: false,
      message: "File content does not match its extension.",
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
  return { ok: true, message: "Attachment added." };
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
        `Row ${i + 2}: ${parsedRow.error.issues[0]?.message ?? "invalid"}`,
      );
      continue;
    }

    const csvRow: StudentCsvRow = parsedRow.data;
    const unknownLocations = rawLocations.filter(
      (name) => !locationIdByName.has(name.toLowerCase()),
    );
    if (unknownLocations.length > 0) {
      rowErrors.push(
        `Row ${i + 2}: unknown location(s): ${unknownLocations.join(", ")}. Create them in Settings first.`,
      );
      continue;
    }

    const locationIds = rawLocations.map((name) =>
      locationIdByName.get(name.toLowerCase())!,
    );
    const primaryName = csvRow.primaryLocation || rawLocations[0] || "";
    const primaryLocationId = locationIdByName.get(primaryName.toLowerCase());
    if (!primaryLocationId) {
      rowErrors.push(`Row ${i + 2}: no location assigned.`);
      continue;
    }

    const input = studentSchema.safeParse({
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
        `Row ${i + 2}: ${input.error.issues[0]?.message ?? "invalid"}`,
      );
      continue;
    }

    parsedInputs.push(input.data);
  }

  if (parsedInputs.length === 0) {
    return {
      ok: false,
      error:
        "No valid students found. First error: " + (rowErrors[0] ?? "unknown"),
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
      message: `Imported ${count} student${count === 1 ? "" : "s"}.`,
      count,
    };
  }
  return { ok: false, error: "No students imported. " + rowErrors[0] };
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
  const ids = readSelectedIds(formData);
  const status = getField(formData, "status");
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one student." };
  }
  if (!STUDENT_STATUSES.includes(status as StudentStatus)) {
    return { ok: false, message: "Choose a status to apply." };
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
    message: `Set ${ids.length} student${ids.length === 1 ? "" : "s"} to ${STUDENT_STATUS_LABELS[status as StudentStatus]}.`,
  };
}

export async function bulkAssignDisciplinesAction(
  _previousState: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const ids = readSelectedIds(formData);
  const disciplineIds = formData
    .getAll("disciplineIds")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one student." };
  }
  if (disciplineIds.length === 0) {
    return { ok: false, message: "Choose at least one discipline." };
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
        ? `Assigned ${added} discipline link${added === 1 ? "" : "s"} (existing ones kept).`
        : "All selected students already train those disciplines.",
  };
}

export async function bulkEnrollAction(
  _previousState: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const ids = readSelectedIds(formData);
  const planId = getField(formData, "planId");
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one student." };
  }
  if (!planId) {
    return { ok: false, message: "Choose a plan." };
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { name: true },
  });
  if (!plan) {
    return { ok: false, message: "That plan no longer exists." };
  }

  const results = await Promise.all(
    ids.map((studentId) =>
      enrollStudent({ studentId, planId, startDate: new Date() }),
    ),
  );
  const created = results.filter((r) => r.outcome === "created").length;
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
        ? `Enrolled ${created} student${created === 1 ? "" : "s"} in ${plan.name}.`
        : `Enrolled ${created} of ${ids.length} students in ${plan.name} (the rest were already enrolled).`,
  };
}
