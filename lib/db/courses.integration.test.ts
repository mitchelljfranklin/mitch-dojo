import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
} from "@/lib/db/courses";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import {
  createTrainer,
  deleteTrainer,
  listLinkableUsers,
  updateTrainer,
} from "@/lib/db/trainers";
import { ensureUpcomingSessions, getWeeklySchedule } from "@/lib/db/sessions";
import type { TrainerInput } from "@/lib/schemas/trainer";
import type { CourseFormInput } from "@/lib/schemas/course";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationAId: string;
let locationBId: string;
let trainerId: string;
let courseId: string;
let disciplineId: string;

function trainerInput(name: string): TrainerInput {
  return {
    name,
    email: null,
    phone: null,
    bio: null,
    isActive: true,
    userId: null,
  };
}

function courseInput(overrides?: Partial<CourseFormInput>): CourseFormInput {
  return {
    name: `Karate Basics ${suffix}`,
    description: null,
    locationId: locationAId,
    disciplineId: typeof disciplineId === "string" ? disciplineId : "",
    trainerId: null,
    isActive: true,
    trainingTimes: [
      {
        weekday: 1,
        startTime: "17:00",
        endTime: "18:00",
        trialBookable: true,
        capacity: null,
      },
      {
        weekday: 3,
        startTime: "17:00",
        endTime: "18:00",
        trialBookable: true,
        capacity: null,
      },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  const discipline = await prisma.discipline.upsert({
    where: { name: `Discipline ${suffix}` },
    update: {},
    create: { name: `Discipline ${suffix}` },
  });
  disciplineId = discipline.id;
  const locationA = await createLocation({
    name: `Class Main ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
  const locationB = await createLocation({
    name: `Class North ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 1,
  });
  locationAId = locationA.id;
  locationBId = locationB.id;
});

afterAll(async () => {
  await prisma.classSession.deleteMany({
    where: { course: { locationId: { in: [locationAId, locationBId] } } },
  });
  await prisma.trainingTime.deleteMany({
    where: { course: { locationId: { in: [locationAId, locationBId] } } },
  });
  await prisma.course.deleteMany({
    where: { locationId: { in: [locationAId, locationBId] } },
  });
  await prisma.trainer.deleteMany({
    where: { name: { contains: suffix } },
  });
  await prisma.discipline
    .delete({ where: { id: disciplineId } })
    .catch(() => undefined);
  await deleteLocation(locationAId).catch(() => undefined);
  await deleteLocation(locationBId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("trainers data layer", () => {
  it("creates a trainer and links a user account at most once", async () => {
    const trainer = await createTrainer(trainerInput(`Sensei A ${suffix}`));
    const user = await prisma.user.create({
      data: {
        email: `trainer-${suffix}@example.test`,
        name: "Trainer User",
        passwordHash: "x",
        roleId: (await prisma.role.findFirst())!.id,
      },
    });

    const updated = await updateTrainer(trainer.id, {
      ...trainerInput(`Sensei A ${suffix}`),
      userId: user.id,
    });
    expect(updated.userId).toBe(user.id);

    // The linked user disappears from the linkable list.
    const linkable = await listLinkableUsers();
    expect(linkable.some((candidate) => candidate.id === user.id)).toBe(false);

    // Deleting the trainer keeps the user (SetNull).
    await deleteTrainer(trainer.id);
    const stillThere = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(stillThere).not.toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("courses data layer", () => {
  it("creates a course with weekly slots", async () => {
    const trainer = await createTrainer(trainerInput(`Sensei B ${suffix}`));
    courseId = await createCourse(courseInput({ trainerId: trainer.id }));

    const course = await getCourse(courseId);
    expect(course).not.toBeNull();
    expect(course?.trainingTimes).toHaveLength(2);
    expect(course?.trainer?.id).toBe(trainer.id);
  });

  it("lists courses with location and trainer names", async () => {
    const { courses } = await listCourses({ locationId: locationAId });
    const found = courses.find((entry) => entry.id === courseId);
    expect(found).toBeDefined();
    expect(found?.locationName).toContain("Class Main");
    expect(found?.weeklySlotCount).toBe(2);
  });

  it("updates slots wholesale without touching generated sessions", async () => {
    await updateCourse(
      courseId,
      courseInput({
        locationId: locationBId,
        trainingTimes: [
          {
            weekday: 5,
            startTime: "18:30",
            endTime: "19:30",
            trialBookable: true,
            capacity: null,
          },
        ],
      }),
    );

    const course = await getCourse(courseId);
    expect(course?.locationId).toBe(locationBId);
    expect(course?.trainingTimes).toHaveLength(1);
    expect(course?.trainingTimes[0]?.weekday).toBe(5);
  });

  it("generates upcoming sessions idempotently and denormalises location", async () => {
    const createdFirst = await ensureUpcomingSessions();
    expect(createdFirst).toBeGreaterThanOrEqual(1);

    const createdAgain = await ensureUpcomingSessions();
    expect(createdAgain).toBe(0);

    const sessions = await prisma.classSession.findMany({
      where: { courseId },
    });
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    // Sessions carry the location the course had when they were generated.
    for (const session of sessions) {
      expect(session.locationId).toBe(locationBId);
      expect(session.status).toBe("SCHEDULED");
    }
  });

  it("exposes the weekly schedule across courses", async () => {
    const schedule = await getWeeklySchedule();
    const own = schedule.filter((slot) => slot.courseId === courseId);
    expect(own.length).toBe(1);
    expect(own[0]?.locationName).toContain("Class North");
  });

  it("deletes a course with its slots and sessions", async () => {
    await deleteCourse(courseId);
    expect(await getCourse(courseId)).toBeNull();
    const remaining = await prisma.classSession.count({
      where: { courseId },
    });
    expect(remaining).toBe(0);
    courseId = "";
  });
});
