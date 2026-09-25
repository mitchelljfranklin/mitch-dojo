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
      // Prior trainings credited when the student's first belt was recorded
      // (transferring students whose history lives outside this system).
      disciplines: {
        where: { disciplineId },
        select: { trainingsCredit: true },
      },
    },
  });

  const history = await prisma.studentBelt.findMany({
    where: {
      studentId: { in: students.map((student) => student.id) },
      beltRangeEntry: { disciplineId },
    },
    // Awarded-at desc decides recency; ladder order breaks ties so a
    // backfilled lower rank (same date) never shadows the newer belt.
    orderBy: [{ awardedAt: "desc" }, { beltRangeEntry: { order: "desc" } }],
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
    const trainingsCredit = student.disciplines[0]?.trainingsCredit ?? 0;

    const trainingsTotal =
      trainingsCredit +
      (courseIds.length > 0
        ? await prisma.attendance.count({
            where: {
              studentId: student.id,
              status: {
                in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
              },
              session: { courseId: { in: courseIds } },
            },
          })
        : 0);

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
    orderBy: [{ awardedAt: "desc" }, { beltRangeEntry: { order: "desc" } }],
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
  // Prior trainings asserted with the FIRST belt (transferring students
  // whose history lives outside the system). Beyond that, the counter is
  // reconciled on EVERY promotion so it always covers the awarded belt's
  // requirement — a multi-level grading or an override promotion aligns
  // the next grading's count with the new rank.
  trainingsCredit?: number;
}): Promise<void> {
  const beltEntry = await prisma.beltRangeEntry.findUnique({
    where: { id: input.beltRangeEntryId },
    select: {
      name: true,
      colorHex: true,
      disciplineId: true,
      requiredTrainings: true,
      order: true,
    },
  });
  if (!beltEntry) {
    throw new Error("Belt not found.");
  }

  await prisma.$transaction(async (tx) => {
    // Missing rungs below the awarded belt (first belt at a higher rank, or
    // a multi-level grading) are backfilled so the student's history shows
    // a complete ladder view.
    const [disciplineBelts, existingHistory] = await Promise.all([
      tx.beltRangeEntry.findMany({
        where: { disciplineId: beltEntry.disciplineId },
        orderBy: { order: "asc" },
        select: { id: true, name: true, colorHex: true, order: true },
      }),
      tx.studentBelt.findMany({
        where: {
          studentId: input.studentId,
          beltRangeEntry: { disciplineId: beltEntry.disciplineId },
        },
        select: { beltRangeEntryId: true },
      }),
    ]);
    const recordedEntryIds = new Set(
      existingHistory.map((row) => row.beltRangeEntryId),
    );
    const skippedBelts = disciplineBelts.filter(
      (belt) => belt.order < beltEntry.order && !recordedEntryIds.has(belt.id),
    );
    if (skippedBelts.length > 0) {
      await tx.studentBelt.createMany({
        data: skippedBelts.map((belt) => ({
          studentId: input.studentId,
          beltRangeEntryId: belt.id,
          beltName: belt.name,
          colorHex: belt.colorHex,
          awardedAt: input.awardedAt,
          notes: `Backfilled — rank recorded directly at ${beltEntry.name}`,
        })),
      });
    }

    await tx.studentBelt.create({
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

    const enteredCredit = input.trainingsCredit ?? 0;
    const [link, disciplineCourses] = await Promise.all([
      tx.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId: input.studentId,
            disciplineId: beltEntry.disciplineId,
          },
        },
        select: { trainingsCredit: true },
      }),
      tx.course.findMany({
        where: { disciplineId: beltEntry.disciplineId },
        select: { id: true },
      }),
    ]);
    const existingCredit = link?.trainingsCredit ?? 0;
    const attendance =
      disciplineCourses.length > 0
        ? await tx.attendance.count({
            where: {
              studentId: input.studentId,
              status: {
                in: TRAINED_STATUSES as unknown as AttendanceStatusValue[],
              },
              session: {
                courseId: { in: disciplineCourses.map((course) => course.id) },
              },
            },
          })
        : 0;

    // Reconcile: the counter (credit + attendance) must never sit below
    // the belt just awarded — top the credit up by any shortfall. An
    // eligible promotion never needs a top-up (shortfall 0), and extra
    // entered credit is kept as-is.
    const provisionalCount = existingCredit + enteredCredit + attendance;
    const shortfall = Math.max(
      0,
      beltEntry.requiredTrainings - provisionalCount,
    );
    const finalCredit = existingCredit + enteredCredit + shortfall;

    if (finalCredit > 0 && (shortfall > 0 || enteredCredit > 0)) {
      await tx.studentDiscipline.upsert({
        where: {
          studentId_disciplineId: {
            studentId: input.studentId,
            disciplineId: beltEntry.disciplineId,
          },
        },
        create: {
          studentId: input.studentId,
          disciplineId: beltEntry.disciplineId,
          trainingsCredit: finalCredit,
        },
        update: { trainingsCredit: finalCredit },
      });
    }
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
// their ranks), plus any prior-trainings credit recorded with their first
// belt. Reused by the record-promotion action and integration tests.
export async function checkPromotionEligibility(
  studentId: string,
  beltRangeEntryId: string,
): Promise<NonNullable<PromotionEligibility> | null> {
  const target = await prisma.beltRangeEntry.findUnique({
    where: { id: beltRangeEntryId },
    select: { name: true, requiredTrainings: true, disciplineId: true },
  });
  if (!target) return null;

  const [currentRecord, disciplineLink, disciplineCourseIds] =
    await Promise.all([
      prisma.studentBelt.findFirst({
        where: {
          studentId,
          beltRangeEntry: { disciplineId: target.disciplineId },
        },
        // Ladder order breaks same-date ties (backfilled lower ranks).
        orderBy: [{ awardedAt: "desc" }, { beltRangeEntry: { order: "desc" } }],
        select: { beltName: true },
      }),
      prisma.studentDiscipline.findUnique({
        where: {
          studentId_disciplineId: {
            studentId,
            disciplineId: target.disciplineId,
          },
        },
        select: { trainingsCredit: true },
      }),
      prisma.course.findMany({
        where: { disciplineId: target.disciplineId },
        select: { id: true },
      }),
    ]);

  const trainingsTotal =
    (disciplineLink?.trainingsCredit ?? 0) +
    (disciplineCourseIds.length > 0
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
      : 0);

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
