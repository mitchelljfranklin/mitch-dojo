import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { type CourseFormInput } from "@/lib/schemas/course";

export const COURSE_SORTS = {
  name: "Name (A–Z)",
  location: "Location",
  newest: "Newest",
} as const;

export type CourseSort = keyof typeof COURSE_SORTS;

const DEFAULT_PAGE_SIZE = 25;

function courseOrderBy(
  sort: CourseSort | undefined,
): Prisma.CourseOrderByWithRelationInput[] {
  switch (sort) {
    case "location":
      return [{ location: { name: "asc" } }, { name: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      return [{ name: "asc" }];
  }
}

export type CourseListFilters = {
  query?: string;
  locationId?: string;
  trainerId?: string;
  sort?: CourseSort;
  page?: number;
  pageSize?: number;
};

export type CourseListResult = {
  courses: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    locationName: string;
    disciplineName: string;
    trainerName: string | null;
    trainerId: string | null;
    weeklySlotCount: number;
  }[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function listCourses(
  filters?: CourseListFilters,
): Promise<CourseListResult> {
  const where: Prisma.CourseWhereInput = {};

  if (filters?.query) {
    const term = filters.query;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }
  if (filters?.locationId) {
    where.locationId = filters.locationId;
  }
  if (filters?.trainerId) {
    where.trainerId = filters.trainerId;
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.course.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: courseOrderBy(filters?.sort),
      include: {
        location: { select: { name: true } },
        discipline: { select: { name: true } },
        trainer: { select: { name: true } },
        trainingTimes: { select: { id: true } },
      },
    }),
    prisma.course.count({ where }),
  ]);

  const courses = rows.map((course) => ({
    id: course.id,
    name: course.name,
    description: course.description,
    isActive: course.isActive,
    locationName: course.location.name,
    disciplineName: course.discipline.name,
    trainerName: course.trainer?.name ?? null,
    trainerId: course.trainerId,
    weeklySlotCount: course.trainingTimes.length,
  }));

  return { courses, totalCount, page, pageSize };
}

export async function getCourse(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      location: true,
      discipline: true,
      trainer: true,
      trainingTimes: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
    },
  });
}

export async function createCourse(input: CourseFormInput): Promise<string> {
  const { trainingTimes, ...fields } = input;
  const course = await prisma.course.create({
    data: {
      ...fields,
      trainingTimes: {
        create: trainingTimes.map((slot) => ({
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          trialBookable: slot.trialBookable,
          capacity: slot.capacity,
        })),
      },
    },
    select: { id: true },
  });
  return course.id;
}

export async function updateCourse(
  courseId: string,
  input: CourseFormInput,
): Promise<void> {
  const { trainingTimes, ...fields } = input;

  // Local calendar day (matching how ClassSession.date is generated).
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  await prisma.$transaction(async (tx) => {
    await tx.course.update({ where: { id: courseId }, data: fields });
    // Weekly slots are replaced wholesale. Future sessions that have no
    // attendance are regenerated from the new slots (they would otherwise
    // linger at the old time/location for up to two weeks); sessions with
    // recorded attendance are preserved so history never moves.
    await tx.trainingTime.deleteMany({ where: { courseId } });
    await tx.classSession.deleteMany({
      where: {
        courseId,
        date: { gte: today },
        attendance: { none: {} },
      },
    });
    if (trainingTimes.length > 0) {
      await tx.trainingTime.createMany({
        data: trainingTimes.map((slot) => ({
          courseId,
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          trialBookable: slot.trialBookable,
          capacity: slot.capacity,
        })),
      });
    }
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  await prisma.course.delete({ where: { id: courseId } });
}

// Courses a student could be backfilled against: every course at the
// student's locations (active first), used by the past-attendance sheet.
export async function listCoursesForStudent(
  studentId: string,
): Promise<
  { id: string; name: string; locationName: string; isActive: boolean }[]
> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { locations: { select: { locationId: true } } },
  });
  if (!student) return [];

  const locationIds = student.locations.map((link) => link.locationId);
  const courses = await prisma.course.findMany({
    where: { locationId: { in: locationIds } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { location: { select: { name: true } } },
  });

  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    locationName: course.location.name,
    isActive: course.isActive,
  }));
}

// Simple id/name options for import pickers.
export async function listCourseOptions(): Promise<
  { id: string; name: string; locationName: string }[]
> {
  const courses = await prisma.course.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      location: { select: { name: true } },
    },
  });
  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    locationName: course.location.name,
  }));
}
