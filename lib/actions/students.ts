"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
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
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
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
  studentCsvRowSchema,
  STUDENT_STATUSES,
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
    status: getField(formData, "status") || "TRIAL",
    notes: getField(formData, "notes"),
    locationIds: formData
      .getAll("locationIds")
      .map((value) => String(value))
      .filter(Boolean),
    primaryLocationId: getField(formData, "primaryLocationId"),
  });
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
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
  await requirePermission(PERMISSIONS.STUDENTS_CREATE);

  const parsed = parseStudentInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let studentId: string;
  try {
    studentId = await createStudent(parsed.data);
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

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.CREATE_STUDENT, "Student", studentId);
  }
  redirect(`/students/${studentId}?created=1`);
}

export async function updateStudentAction(
  previousState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const studentId = getField(formData, "studentId");

  const parsed = parseStudentInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: { photoKey: true },
  });

  try {
    await updateStudent(studentId, parsed.data);
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

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_STUDENT, "Student", studentId);
  }
  revalidatePath(`/students/${studentId}`);
  return { ok: true, message: "Student updated." };
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
  revalidatePath(`/students/${studentId}`);
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
      status: csvRow.status,
      notes: csvRow.notes,
      locationIds,
      primaryLocationId,
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
    revalidatePath("/students");
    return {
      ok: true,
      message: `Imported ${count} student${count === 1 ? "" : "s"}.`,
      count,
    };
  }
  return { ok: false, error: "No students imported. " + rowErrors[0] };
}
