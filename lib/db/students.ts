import {
  type Prisma,
  type StudentStatus,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { type StudentInput } from "@/lib/schemas/student";

export const STUDENT_SORTS = {
  name: "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  newest: "Newest",
  oldest: "Oldest joined",
} as const;

export type StudentSort = keyof typeof STUDENT_SORTS;

const DEFAULT_PAGE_SIZE = 25;

function studentOrderBy(
  sort: StudentSort | undefined,
): Prisma.StudentOrderByWithRelationInput[] {
  const nameAsc: Prisma.StudentOrderByWithRelationInput[] = [
    { lastName: "asc" },
    { firstName: "asc" },
  ];
  const nameDesc: Prisma.StudentOrderByWithRelationInput[] = [
    { lastName: "desc" },
    { firstName: "desc" },
  ];

  switch (sort) {
    case "name-desc":
      return nameDesc;
    case "newest":
      return [{ joinedAt: "desc" }];
    case "oldest":
      return [{ joinedAt: "asc" }];
    default:
      return nameAsc;
  }
}

export type StudentListFilters = {
  query?: string;
  status?: string;
  locationId?: string;
  sort?: StudentSort;
  page?: number;
  pageSize?: number;
};

export type StudentListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: StudentStatus;
  joinedAt: Date;
  photoKey: string | null;
  primaryLocationName: string | null;
  locationCount: number;
};

export type StudentListResult = {
  students: StudentListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function listStudents(
  filters?: StudentListFilters,
): Promise<StudentListResult> {
  const where: Prisma.StudentWhereInput = {};

  if (filters?.query) {
    const term = filters.query;
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  if (filters?.status) {
    where.status = filters.status as StudentStatus;
  }

  if (filters?.locationId) {
    where.locations = { some: { locationId: filters.locationId } };
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.student.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: studentOrderBy(filters?.sort),
      include: { locations: { include: { location: true } } },
    }),
    prisma.student.count({ where }),
  ]);

  const students: StudentListItem[] = rows.map((student) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    status: student.status,
    joinedAt: student.joinedAt,
    photoKey: student.photoKey,
    primaryLocationName:
      student.locations.find((link) => link.isPrimary)?.location.name ??
      student.locations[0]?.location.name ??
      null,
    locationCount: student.locations.length,
  }));

  return { students, totalCount, page, pageSize };
}

export type StudentDetail = Awaited<ReturnType<typeof getStudent>>;

export async function getStudent(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      locations: { include: { location: true } },
      disciplines: { include: { discipline: true } },
    },
  });
  return student;
}

// Replaces all location links for a student in one transaction and enforces
// the "exactly one primary" rule at the data layer.
export async function setStudentLocations(
  studentId: string,
  locationIds: string[],
  primaryLocationId: string,
): Promise<void> {
  if (!locationIds.includes(primaryLocationId)) {
    throw new Error(
      "The primary location must be one of the assigned locations.",
    );
  }

  await prisma.$transaction([
    prisma.studentLocation.deleteMany({ where: { studentId } }),
    prisma.studentLocation.createMany({
      data: locationIds.map((locationId) => ({
        studentId,
        locationId,
        isPrimary: locationId === primaryLocationId,
      })),
    }),
  ]);
}

export async function createStudent(input: StudentInput): Promise<string> {
  const student = await prisma.student.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state,
      postcode: input.postcode,
      country: input.country,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      guardianName: input.guardianName,
      guardianEmail: input.guardianEmail,
      guardianPhone: input.guardianPhone,
      guardianRelationship: input.guardianRelationship ?? null,
      medicalMedications: input.medicalMedications,
      medicalConditions: input.medicalConditions,
      medicalInjuries: input.medicalInjuries,
      status: input.status,
      notes: input.notes,
      locations: {
        create: input.locationIds.map((locationId) => ({
          locationId,
          isPrimary: locationId === input.primaryLocationId,
        })),
      },
      disciplines: {
        create: input.disciplineIds.map((disciplineId) => ({
          disciplineId,
        })),
      },
    },
    select: { id: true },
  });
  return student.id;
}

export async function updateStudent(
  studentId: string,
  input: StudentInput,
): Promise<void> {
  const { locationIds, primaryLocationId, disciplineIds, ...fields } = input;

  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: studentId }, data: fields });
    await tx.studentLocation.deleteMany({ where: { studentId } });
    await tx.studentLocation.createMany({
      data: locationIds.map((locationId) => ({
        studentId,
        locationId,
        isPrimary: locationId === primaryLocationId,
      })),
    });
    await tx.studentDiscipline.deleteMany({ where: { studentId } });
    await tx.studentDiscipline.createMany({
      data: disciplineIds.map((disciplineId) => ({
        studentId,
        disciplineId,
      })),
    });
  });
}

export async function updateStudentStatus(
  studentId: string,
  status: StudentStatus,
): Promise<void> {
  await prisma.student.update({ where: { id: studentId }, data: { status } });
}

// Bulk discipline assignment for the students list: links every given
// discipline to every given student, skipping pairs that already exist.
// Returns how many links were actually created.
export async function bulkAssignDisciplines(
  studentIds: string[],
  disciplineIds: string[],
): Promise<number> {
  if (studentIds.length === 0 || disciplineIds.length === 0) {
    return 0;
  }
  const existing = await prisma.studentDiscipline.findMany({
    where: {
      studentId: { in: studentIds },
      disciplineId: { in: disciplineIds },
    },
    select: { studentId: true, disciplineId: true },
  });
  const existingPairs = new Set(
    existing.map((row) => `${row.studentId}:${row.disciplineId}`),
  );
  const data = studentIds
    .flatMap((studentId) =>
      disciplineIds.map((disciplineId) => ({ studentId, disciplineId })),
    )
    .filter(
      (pair) => !existingPairs.has(`${pair.studentId}:${pair.disciplineId}`),
    );
  if (data.length === 0) {
    return 0;
  }
  await prisma.studentDiscipline.createMany({ data });
  return data.length;
}

export async function setStudentPhoto(
  studentId: string,
  photoKey: string | null,
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { photoKey: true },
  });
  await prisma.student.update({ where: { id: studentId }, data: { photoKey } });
  if (student?.photoKey && student.photoKey !== photoKey) {
    await storage.delete(student.photoKey).catch(() => undefined);
  }
}

// Deletes the student plus their storage files (photo, attachments).
export async function deleteStudent(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { photoKey: true },
  });
  const attachments = await prisma.attachment.findMany({
    where: { entityType: "Student", entityId: studentId },
    select: { storageKey: true },
  });

  await prisma.student.delete({ where: { id: studentId } });

  const keys = [
    ...(student?.photoKey ? [student.photoKey] : []),
    ...attachments.map((attachment) => attachment.storageKey),
  ];
  for (const key of keys) {
    await storage.delete(key).catch(() => undefined);
  }
}

export type ImportStudentMatch =
  | { status: "found"; studentId: string; name: string }
  | { status: "not_found" }
  | { status: "ambiguous" }
  | { status: "not_at_location" };

// Resolves a CSV import row's student: by email (school-wide) or by
// first+last name. When a locationId is provided (attendance import),
// matching is scoped to that location's roster. Belt history import omits
// locationId since rank is discipline-wide, not location-scoped.
export async function findStudentForImport(
  input: { email?: string; firstName?: string; lastName?: string },
  locationId?: string,
): Promise<ImportStudentMatch> {
  if (input.email) {
    const student = await prisma.student.findUnique({
      where: { email: input.email.toLowerCase() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        locations: { select: { locationId: true } },
      },
    });
    if (!student) return { status: "not_found" };
    if (locationId) {
      const atLocation = student.locations.some(
        (link) => link.locationId === locationId,
      );
      if (!atLocation) return { status: "not_at_location" };
    }
    return {
      status: "found",
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
    };
  }

  if (input.firstName && input.lastName) {
    const matches = await prisma.student.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        ...(locationId ? { locations: { some: { locationId } } } : {}),
        firstName: { equals: input.firstName.trim(), mode: "insensitive" },
        lastName: { equals: input.lastName.trim(), mode: "insensitive" },
      },
      select: { id: true, firstName: true, lastName: true },
    });
    if (matches.length === 0) return { status: "not_found" };
    if (matches.length > 1) return { status: "ambiguous" };
    const match = matches[0]!;
    return {
      status: "found",
      studentId: match.id,
      name: `${match.firstName} ${match.lastName}`,
    };
  }

  return { status: "not_found" };
}

export type StudentExportRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  status: StudentStatus;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  notes: string | null;
  locations: { name: string; isPrimary: boolean }[];
};

export async function exportAllStudents(): Promise<StudentExportRow[]> {
  const students = await prisma.student.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { locations: { include: { location: true } } },
  });

  return students.map((student) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    dateOfBirth: student.dateOfBirth,
    status: student.status,
    addressLine: student.addressLine,
    city: student.city,
    state: student.state,
    postcode: student.postcode,
    country: student.country,
    emergencyContactName: student.emergencyContactName,
    emergencyContactPhone: student.emergencyContactPhone,
    guardianName: student.guardianName,
    guardianEmail: student.guardianEmail,
    guardianPhone: student.guardianPhone,
    guardianRelationship: student.guardianRelationship,
    notes: student.notes,
    locations: student.locations.map((link) => ({
      name: link.location.name,
      isPrimary: link.isPrimary,
    })),
  }));
}
