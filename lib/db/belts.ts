import {
  type BeltLevel,
  type Prisma,
} from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";
import { type BeltLevelInput } from "@/lib/schemas/belt";

export function listCoursesWithBeltCounts() {
  return prisma.course.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      location: { select: { name: true } },
      _count: { select: { beltLevels: true } },
    },
  });
}

export function getCourseWithBelts(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      location: { select: { id: true, name: true } },
      trainer: { select: { id: true, name: true } },
      beltLevels: { orderBy: { order: "asc" } },
    },
  });
}

export async function createBeltLevel(
  courseId: string,
  input: BeltLevelInput,
): Promise<BeltLevel> {
  return prisma.beltLevel.create({
    data: { ...input, courseId },
  });
}

export async function updateBeltLevel(
  beltLevelId: string,
  input: BeltLevelInput,
): Promise<BeltLevel> {
  return prisma.beltLevel.update({ where: { id: beltLevelId }, data: input });
}

// Belt levels with awarded history cannot be hard-deleted — that would
// orphan the denormalised history rows. Refuse and let the admin deactivate
// the course or reorganise instead.
export async function deleteBeltLevel(beltLevelId: string): Promise<void> {
  const beltLevel = await prisma.beltLevel.findUnique({
    where: { id: beltLevelId },
    include: { _count: { select: { studentBelts: true } } },
  });
  if (!beltLevel) {
    throw new Error("Belt level not found.");
  }
  if (beltLevel._count.studentBelts > 0) {
    throw new Error(
      "This belt has been awarded to students and cannot be removed.",
    );
  }
  await prisma.beltLevel.delete({ where: { id: beltLevelId } });
}

export type ProgressRow = {
  studentId: string;
  name: string;
  photoKey: string | null;
  currentBeltName: string | null;
  currentBeltColor: string | null;
  awardedAt: Date | null;
  trainingsSince: number;
  nextBeltName: string | null;
  nextBeltColor: string | null;
  requiredTrainings: number | null;
  isEligible: boolean;
};

// Students at the course's location (ACTIVE/TRIAL) with their belt progress
// for this course: current rank, trainings since the last promotion, and
// whether they have met the next belt's required trainings.
export async function getCourseProgress(courseId: string): Promise<{
  course: {
    id: string;
    name: string;
    locationName: string;
    trainerName: string | null;
    isActive: boolean;
  } | null;
  belts: BeltLevel[];
  rows: ProgressRow[];
}> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      location: { select: { id: true, name: true } },
      trainer: { select: { name: true } },
      beltLevels: { orderBy: { order: "asc" } },
    },
  });
  if (!course) return { course: null, belts: [], rows: [] };

  const belts = course.beltLevels;

  const students = await prisma.student.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      locations: { some: { locationId: course.locationId } },
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
      beltLevel: { courseId },
    },
    orderBy: { awardedAt: "desc" },
    select: {
      id: true,
      studentId: true,
      beltName: true,
      colorHex: true,
      awardedAt: true,
      beltLevelId: true,
    },
  });

  const currentByStudent = new Map<string, (typeof history)[number]>();
  for (const record of history) {
    if (!currentByStudent.has(record.studentId)) {
      currentByStudent.set(record.studentId, record);
    }
  }

  const beltById = new Map(belts.map((belt) => [belt.id, belt]));

  function nextBeltOf(current: BeltLevel): BeltLevel | null {
    const next = belts
      .filter((belt) => belt.order > current.order)
      .sort((a, b) => a.order - b.order);
    return next[0] ?? null;
  }

  const rows: ProgressRow[] = [];
  for (const student of students) {
    const currentRecord = currentByStudent.get(student.id) ?? null;
    const currentBelt = currentRecord
      ? (belts.find((belt) => belt.id === currentRecord.beltLevelId) ?? null)
      : null;

    const since = currentRecord
      ? new Date(
          Date.UTC(
            currentRecord.awardedAt.getFullYear(),
            currentRecord.awardedAt.getMonth(),
            currentRecord.awardedAt.getDate(),
          ),
        )
      : new Date(0);

    const trainingsSince = await prisma.attendance.count({
      where: {
        studentId: student.id,
        status: { in: TRAINED_STATUSES as unknown as AttendanceStatusValue[] },
        session: { courseId, date: { gte: since } },
      },
    });

    const nextBelt = currentBelt ? nextBeltOf(currentBelt) : (belts[0] ?? null);
    const requiredTrainings = nextBelt ? nextBelt.requiredTrainings : null;

    rows.push({
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      photoKey: student.photoKey,
      currentBeltName: currentRecord?.beltName ?? null,
      currentBeltColor: currentRecord?.colorHex ?? null,
      awardedAt: currentRecord?.awardedAt ?? null,
      trainingsSince,
      nextBeltName: nextBelt?.name ?? null,
      nextBeltColor: nextBelt?.colorHex ?? null,
      requiredTrainings,
      isEligible:
        requiredTrainings !== null && trainingsSince >= requiredTrainings,
    });
  }

  return {
    course: {
      id: course.id,
      name: course.name,
      locationName: course.location.name,
      trainerName: course.trainer?.name ?? null,
      isActive: course.isActive,
    },
    belts,
    rows,
  };
}

export async function getStudentBeltHistory(studentId: string) {
  return prisma.studentBelt.findMany({
    where: { studentId },
    orderBy: { awardedAt: "desc" },
    include: {
      beltLevel: { include: { course: { select: { id: true, name: true } } } },
    },
  });
}

export async function recordPromotion(input: {
  studentId: string;
  beltLevelId: string;
  awardedAt: Date;
  notes: string | null;
  awardedById: string | null;
}): Promise<void> {
  const beltLevel = await prisma.beltLevel.findUnique({
    where: { id: input.beltLevelId },
    select: { name: true, colorHex: true },
  });
  if (!beltLevel) {
    throw new Error("Belt level not found.");
  }

  await prisma.studentBelt.create({
    data: {
      studentId: input.studentId,
      beltLevelId: input.beltLevelId,
      beltName: beltLevel.name,
      colorHex: beltLevel.colorHex,
      awardedAt: input.awardedAt,
      notes: input.notes,
      awardedById: input.awardedById,
    },
  });
}

export async function deletePromotion(promotionId: string): Promise<void> {
  await prisma.studentBelt.delete({ where: { id: promotionId } });
}

export type PromotionEligibility = {
  eligible: boolean;
  trainingsSince: number;
  requiredTrainings: number | null;
  currentBeltName: string | null;
  targetBeltName: string;
};

// Server-side eligibility gate for a promotion: counts Present/Late
// attendance on the target belt's course after the student's current belt
// award date. Reused by the record-promotion action and integration tests.
export async function checkPromotionEligibility(
  studentId: string,
  beltLevelId: string,
): Promise<{
  status: "eligible" | "insufficient" | "no_belt" | "already_current";
  trainingsSince: number;
  requiredTrainings: number | null;
  currentBeltName: string | null;
  targetBeltName: string;
} | null> {
  const target = await prisma.beltLevel.findUnique({
    where: { id: beltLevelId },
    select: { name: true, requiredTrainings: true, courseId: true },
  });
  if (!target) return null;

  const currentRecord = await prisma.studentBelt.findFirst({
    where: { studentId, beltLevel: { courseId: target.courseId } },
    orderBy: { awardedAt: "desc" },
    select: { beltName: true, awardedAt: true, beltLevelId: true },
  });

  const currentBelt = currentRecord
    ? await prisma.beltLevel.findUnique({
        where: { id: currentRecord.beltLevelId ?? "" },
        select: { order: true },
      })
    : null;

  const trainingsSince = await prisma.attendance.count({
    where: {
      studentId,
      status: { in: TRAINED_STATUSES as unknown as AttendanceStatusValue[] },
      session: {
        courseId: target.courseId,
        date: { gte: sinceDateOf(currentRecord?.awardedAt ?? null) },
      },
    },
  });

  return {
    status:
      trainingsSince >= target.requiredTrainings ? "eligible" : "insufficient",
    trainingsSince,
    requiredTrainings: target.requiredTrainings,
    currentBeltName: currentRecord?.beltName ?? null,
    targetBeltName: target.name,
  };
}

function sinceDateOf(awardedAt: Date | null): Date {
  if (!awardedAt) return new Date(0);
  return new Date(
    Date.UTC(
      awardedAt.getFullYear(),
      awardedAt.getMonth(),
      awardedAt.getDate(),
    ),
  );
}

// --------------- standard belt range (Settings) ---------------

export function listBeltRange() {
  return prisma.beltRangeEntry.findMany({ orderBy: { order: "asc" } });
}

export async function createBeltRangeEntry(
  input: BeltLevelInput,
): Promise<void> {
  await prisma.beltRangeEntry.create({ data: input });
}

export async function updateBeltRangeEntry(
  id: string,
  input: BeltLevelInput,
): Promise<void> {
  await prisma.beltRangeEntry.update({ where: { id }, data: input });
}

export async function deleteBeltRangeEntry(id: string): Promise<void> {
  await prisma.beltRangeEntry.delete({ where: { id } });
}

// Loads the school's standard ladder into a course: entries matching by name
// are updated, missing ones are created, and unawarded course belts that are
// not part of the standard range are removed. Awarded belts are always kept.
export async function applyBeltRangeToCourse(
  courseId: string,
): Promise<number> {
  const [range, courseBelts] = await Promise.all([
    prisma.beltRangeEntry.findMany({ orderBy: { order: "asc" } }),
    prisma.beltLevel.findMany({
      where: { courseId },
      include: { _count: { select: { studentBelts: true } } },
    }),
  ]);

  const rangeByName = new Map(range.map((entry) => [entry.name, entry]));
  let changes = 0;

  await prisma.$transaction(async (tx) => {
    for (const belt of courseBelts) {
      const standard = rangeByName.get(belt.name);
      if (standard) {
        await tx.beltLevel.update({
          where: { id: belt.id },
          data: {
            colorHex: standard.colorHex,
            order: standard.order,
            requiredTrainings: standard.requiredTrainings,
          },
        });
        changes++;
      } else if (belt._count.studentBelts === 0) {
        await tx.beltLevel.delete({ where: { id: belt.id } });
        changes++;
      }
    }

    const existingNames = new Set(courseBelts.map((belt) => belt.name));
    for (const entry of range) {
      if (!existingNames.has(entry.name)) {
        await tx.beltLevel.create({
          data: {
            courseId,
            name: entry.name,
            colorHex: entry.colorHex,
            order: entry.order,
            requiredTrainings: entry.requiredTrainings,
          },
        });
        changes++;
      }
    }
  });

  return changes;
}

export type BeltHistoryRow = Awaited<
  ReturnType<typeof getStudentBeltHistory>
>[number];

export type BeltWhere = Prisma.BeltLevelWhereInput;
