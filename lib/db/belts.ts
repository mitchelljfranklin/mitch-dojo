import {
  type BeltRangeEntry,
  type Discipline,
  type Prisma,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";
import type { BeltLevelInput } from "@/lib/schemas/belt";

// --------------- disciplines ---------------

export function listDisciplines(): Promise<
  (Discipline & { _count: { beltRangeEntries: number; courses: number } })[]
> {
  return prisma.discipline.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { beltRangeEntries: true, courses: true } },
    },
  });
}

export function getDiscipline(id: string): Promise<Discipline | null> {
  return prisma.discipline.findUnique({ where: { id } });
}

export function getDisciplineByName(name: string): Promise<Discipline | null> {
  return prisma.discipline.findUnique({ where: { name } });
}

export async function createDiscipline(name: string): Promise<Discipline> {
  return prisma.discipline.create({ data: { name: name.trim() } });
}

export async function deleteDiscipline(id: string): Promise<void> {
  const discipline = await prisma.discipline.findUnique({
    where: { id },
    include: { _count: { select: { courses: true } } },
  });
  if (!discipline) {
    throw new Error("Discipline not found.");
  }
  if (discipline._count.courses > 0) {
    throw new Error(
      "This discipline has courses assigned. Reassign or delete them first.",
    );
  }
  await prisma.discipline.delete({ where: { id } });
}

// --------------- discipline belt ladder ---------------

export function getDisciplineWithBelts(disciplineId: string) {
  return prisma.discipline.findUnique({
    where: { id: disciplineId },
    include: { beltRangeEntries: { orderBy: { order: "asc" } } },
  });
}

export async function createBeltRangeEntry(
  disciplineId: string,
  input: BeltLevelInput,
): Promise<BeltRangeEntry> {
  return prisma.beltRangeEntry.create({
    data: { ...input, disciplineId },
  });
}

export async function updateBeltRangeEntry(
  id: string,
  input: BeltLevelInput,
): Promise<BeltRangeEntry> {
  return prisma.beltRangeEntry.update({ where: { id }, data: input });
}

// Belt entries that have been awarded cannot be hard-deleted — that would
// orphan the denormalised history rows.
export async function deleteBeltRangeEntry(id: string): Promise<void> {
  const entry = await prisma.beltRangeEntry.findUnique({
    where: { id },
    include: { _count: { select: { studentBelts: true } } },
  });
  if (!entry) {
    throw new Error("Belt not found.");
  }
  if (entry._count.studentBelts > 0) {
    throw new Error(
      "This belt has been awarded to students and cannot be removed.",
    );
  }
  await prisma.beltRangeEntry.delete({ where: { id } });
}

// --------------- student progression (per discipline, school-wide) ---------------

export type ProgressRow = {
  studentId: string;
  name: string;
  photoKey: string | null;
  currentBeltName: string | null;
  currentBeltColor: string | null;
  awardedAt: Date | null;
  trainingsTotal: number;
  nextBeltName: string | null;
  nextBeltColor: string | null;
  requiredTrainings: number | null;
  isEligible: boolean;
};

// All ACTIVE/TRIAL students school-wide with their belt progress for this
// discipline: current rank, total trained sessions across ALL courses of
// that discipline (cumulative, from their first class), and whether they
// have met the next belt's required trainings.
export async function getDisciplineProgress(disciplineId: string): Promise<{
  discipline: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  belts: BeltRangeEntry[];
  rows: ProgressRow[];
}> {
  const discipline = await prisma.discipline.findUnique({
    where: { id: disciplineId },
    include: { beltRangeEntries: { orderBy: { order: "asc" } } },
  });
  if (!discipline) return { discipline: null, belts: [], rows: [] };

  const belts = discipline.beltRangeEntries;

  const students = await prisma.student.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      // Only students assigned to this discipline appear in its progression
      // table (StudentDiscipline link, required on the student form).
      disciplines: { some: { disciplineId } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoKey: true,
    },
  });

  const history = await prisma.studentBelt.findMany({
    where: {
      studentId: { in: students.map((student) => student.id) },
      beltRangeEntry: { disciplineId },
    },
    orderBy: { awardedAt: "desc" },
    select: {
      id: true,
      studentId: true,
      beltName: true,
      colorHex: true,
      awardedAt: true,
      beltRangeEntryId: true,
    },
  });

  const currentByStudent = new Map<string, (typeof history)[number]>();
  for (const record of history) {
    if (!currentByStudent.has(record.studentId)) {
      currentByStudent.set(record.studentId, record);
    }
  }

  // All course ids belonging to this discipline — attendance across all of
  // them counts towards the student's rank.
  const disciplineCourses = await prisma.course.findMany({
    where: { disciplineId },
    select: { id: true },
  });
  const courseIds = disciplineCourses.map((course) => course.id);

  function nextBeltOf(current: BeltRangeEntry): BeltRangeEntry | null {
    const next = belts
      .filter((belt) => belt.order > current.order)
      .sort((a, b) => a.order - b.order);
    return next[0] ?? null;
  }

  const rows: ProgressRow[] = [];
  for (const student of students) {
    const currentRecord = currentByStudent.get(student.id) ?? null;

    const trainingsTotal =
      courseIds.length > 0
        ? await prisma.attendance.count({
            where: {
              studentId: student.id,
              status: {
                in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
              },
              session: { courseId: { in: courseIds } },
            },
          })
        : 0;

    const currentBelt = currentRecord
      ? (belts.find((belt) => belt.id === currentRecord.beltRangeEntryId) ??
        null)
      : null;
    const nextBelt = currentBelt ? nextBeltOf(currentBelt) : (belts[0] ?? null);
    const requiredTrainings = nextBelt ? nextBelt.requiredTrainings : null;

    rows.push({
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      photoKey: student.photoKey,
      currentBeltName: currentRecord?.beltName ?? null,
      currentBeltColor: currentRecord?.colorHex ?? null,
      awardedAt: currentRecord?.awardedAt ?? null,
      trainingsTotal,
      nextBeltName: nextBelt?.name ?? null,
      nextBeltColor: nextBelt?.colorHex ?? null,
      requiredTrainings,
      isEligible:
        requiredTrainings !== null && trainingsTotal >= requiredTrainings,
    });
  }

  return {
    discipline: {
      id: discipline.id,
      name: discipline.name,
      isActive: discipline.isActive,
    },
    belts,
    rows,
  };
}

// --------------- promotion history ---------------

export async function getStudentBeltHistory(studentId: string) {
  return prisma.studentBelt.findMany({
    where: { studentId },
    orderBy: { awardedAt: "desc" },
    include: {
      beltRangeEntry: {
        include: { discipline: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function recordPromotion(input: {
  studentId: string;
  beltRangeEntryId: string;
  awardedAt: Date;
  notes: string | null;
  awardedById: string | null;
}): Promise<void> {
  const beltEntry = await prisma.beltRangeEntry.findUnique({
    where: { id: input.beltRangeEntryId },
    select: { name: true, colorHex: true },
  });
  if (!beltEntry) {
    throw new Error("Belt not found.");
  }

  await prisma.studentBelt.create({
    data: {
      studentId: input.studentId,
      beltRangeEntryId: input.beltRangeEntryId,
      beltName: beltEntry.name,
      colorHex: beltEntry.colorHex,
      awardedAt: input.awardedAt,
      notes: input.notes,
      awardedById: input.awardedById,
    },
  });
}

export async function deletePromotion(promotionId: string): Promise<void> {
  await prisma.studentBelt.delete({ where: { id: promotionId } });
}

// --------------- eligibility gate ---------------

export type PromotionEligibility = {
  status: "eligible" | "insufficient";
  trainingsTotal: number;
  requiredTrainings: number | null;
  currentBeltName: string | null;
  targetBeltName: string;
};

// Server-side eligibility gate for a promotion: counts ALL Present/Late
// attendance across ALL courses of the target belt's discipline (cumulative
// — every trained session from the student's first class counts towards
// their ranks). Reused by the record-promotion action and integration tests.
export async function checkPromotionEligibility(
  studentId: string,
  beltRangeEntryId: string,
): Promise<NonNullable<PromotionEligibility> | null> {
  const target = await prisma.beltRangeEntry.findUnique({
    where: { id: beltRangeEntryId },
    select: { name: true, requiredTrainings: true, disciplineId: true },
  });
  if (!target) return null;

  const currentRecord = await prisma.studentBelt.findFirst({
    where: { studentId, beltRangeEntry: { disciplineId: target.disciplineId } },
    orderBy: { awardedAt: "desc" },
    select: { beltName: true },
  });

  const disciplineCourseIds = await prisma.course.findMany({
    where: { disciplineId: target.disciplineId },
    select: { id: true },
  });

  const trainingsTotal =
    disciplineCourseIds.length > 0
      ? await prisma.attendance.count({
          where: {
            studentId,
            status: {
              in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
            },
            session: {
              courseId: { in: disciplineCourseIds.map((course) => course.id) },
            },
          },
        })
      : 0;

  return {
    status:
      trainingsTotal >= target.requiredTrainings ? "eligible" : "insufficient",
    trainingsTotal,
    requiredTrainings: target.requiredTrainings,
    currentBeltName: currentRecord?.beltName ?? null,
    targetBeltName: target.name,
  };
}

// --------------- historical promotion import ---------------

export async function recordHistoricalPromotion(input: {
  studentId: string;
  beltRangeEntryId: string;
  awardedAt: Date;
  notes: string | null;
}): Promise<"created" | "skipped"> {
  const beltEntry = await prisma.beltRangeEntry.findUnique({
    where: { id: input.beltRangeEntryId },
    select: { name: true, colorHex: true },
  });
  if (!beltEntry) {
    throw new Error("Belt not found.");
  }

  const dayStart = new Date(
    input.awardedAt.getFullYear(),
    input.awardedAt.getMonth(),
    input.awardedAt.getDate(),
  );
  const dayEnd = new Date(dayStart.getTime());
  dayEnd.setDate(dayEnd.getDate() + 1);
  const duplicate = await prisma.studentBelt.findFirst({
    where: {
      studentId: input.studentId,
      beltRangeEntryId: input.beltRangeEntryId,
      awardedAt: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true },
  });
  if (duplicate) return "skipped";

  await prisma.studentBelt.create({
    data: {
      studentId: input.studentId,
      beltRangeEntryId: input.beltRangeEntryId,
      beltName: beltEntry.name,
      colorHex: beltEntry.colorHex,
      awardedAt: input.awardedAt,
      notes: input.notes,
    },
  });
  return "created";
}

export type BeltHistoryRow = Awaited<
  ReturnType<typeof getStudentBeltHistory>
>[number];

export type DisciplineWhere = Prisma.DisciplineWhereInput;
