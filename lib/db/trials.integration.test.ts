import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { updateCommunicationsSettings } from "@/lib/settings";
import {
  canTransition,
  createTrialBooking,
  listBookableSessions,
  listTrials,
  setTrialStage,
} from "@/lib/db/trials";
import { createCourse } from "@/lib/db/courses";
import { sendTrialFollowUps } from "@/lib/cron/reminders";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let courseId: string;
let trialId: string;
let originalDefaultCountry: string | null;

beforeAll(async () => {
  await prisma.notificationLog.deleteMany({});
  // The booking mirrors the org's default country onto new trials; seed it
  // and restore the original value afterwards.
  const original = await prisma.appSetting.findUnique({
    where: { key: "organization.defaultCountry" },
  });
  originalDefaultCountry =
    typeof original?.value === "string" ? original.value : null;
  await prisma.appSetting.upsert({
    where: { key: "organization.defaultCountry" },
    update: { value: "AU", category: "organization" },
    create: {
      key: "organization.defaultCountry",
      category: "organization",
      value: "AU",
    },
  });
  const location = await createLocation({
    name: `Trial Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 50,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Trial Karate ${suffix}`);
  disciplineId = discipline.id;
  const course = await prisma.course.create({
    data: { name: `Trial Course ${suffix}`, locationId, disciplineId },
  });
  courseId = course.id;
});

afterAll(async () => {
  // Restore the default country the suite overwrote.
  if (originalDefaultCountry === null) {
    await prisma.appSetting
      .deleteMany({ where: { key: "organization.defaultCountry" } })
      .catch(() => undefined);
  } else {
    await prisma.appSetting.upsert({
      where: { key: "organization.defaultCountry" },
      update: { value: originalDefaultCountry, category: "organization" },
      create: {
        key: "organization.defaultCountry",
        category: "organization",
        value: originalDefaultCountry,
      },
    });
  }
  await prisma.notificationLog.deleteMany({});
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.course
    .delete({ where: { id: courseId } })
    .catch(() => undefined);
  await prisma.student
    .deleteMany({ where: { lastName: { contains: suffix } } })
    .catch(() => undefined);
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("trial stage transitions", () => {
  it("allows the documented transitions only", () => {
    expect(canTransition("NEW", "CONTACTED")).toBe(true);
    expect(canTransition("FIRST_CLASS", "CONVERTED")).toBe(true);
    expect(canTransition("NEW", "CONVERTED")).toBe(false);
    expect(canTransition("CONVERTED", "LOST")).toBe(false);
    expect(canTransition("LOST", "CONTACTED")).toBe(true);
  });

  it("converts a trial to an active member with convertedAt", async () => {
    trialId = await prisma.student
      .create({
        data: {
          firstName: "Pipeline",
          lastName: `Trial${suffix}`,
          status: "TRIAL",
          trialStage: "FIRST_CLASS",
          locations: { create: { locationId, isPrimary: true } },
          disciplines: { create: { disciplineId } },
        },
        select: { id: true },
      })
      .then((student) => student.id);

    await setTrialStage(trialId, "CONVERTED");

    const student = await prisma.student.findUnique({ where: { id: trialId } });
    expect(student?.status).toBe("ACTIVE");
    expect(student?.trialStage).toBe("CONVERTED");
    expect(student?.convertedAt).not.toBeNull();
  });

  it("marks a lost trial inactive and allows reactivation into the pipeline", async () => {
    // CONVERTED is terminal — a lost trial must come from an open stage.
    const lostTrialId = await prisma.student
      .create({
        data: {
          firstName: "Churned",
          lastName: `Trial${suffix}`,
          status: "TRIAL",
          trialStage: "FIRST_CLASS",
          locations: { create: { locationId, isPrimary: true } },
        },
        select: { id: true },
      })
      .then((student) => student.id);

    await setTrialStage(lostTrialId, "LOST");
    const lost = await prisma.student.findUnique({
      where: { id: lostTrialId },
    });
    expect(lost?.status).toBe("INACTIVE");
    expect(lost?.trialStage).toBe("LOST");

    await setTrialStage(lostTrialId, "CONTACTED");
    const revived = await prisma.student.findUnique({
      where: { id: lostTrialId },
    });
    expect(revived?.status).toBe("TRIAL");
    expect(revived?.trialStage).toBe("CONTACTED");
  });
});

describe.skipIf(!hasTestDatabase)("website booking", () => {
  it("creates a TRIAL student with location, discipline, and a booking note", async () => {
    const result = await createTrialBooking({
      bookingFor: "adult",
      firstName: "Website",
      lastName: `Lead${suffix}`,
      guardianName: null,
      guardianRelationship: null,
      email: `lead-${suffix}@example.com`,
      phone: null,
      locationId,
      disciplineId,
      sessionDate: "2026-09-20",
      sessionCourseName: `Trial Course ${suffix}`,
    });
    expect(result.outcome).toBe("created");
    if (result.outcome !== "created") throw new Error("expected created");

    const student = await prisma.student.findUnique({
      where: { id: result.studentId },
      include: { locations: true, disciplines: true },
    });
    expect(student?.status).toBe("TRIAL");
    expect(student?.trialStage).toBe("NEW");
    expect(student?.locations).toHaveLength(1);
    expect(student?.disciplines).toHaveLength(1);
    expect(student?.notes).toContain("Booked via website");
    // Adult bookings leave the guardian fields untouched, and the org's
    // default country is preselected (mirrors the manual student form).
    expect(student?.guardianEmail).toBeNull();
    expect(student?.guardianRelationship).toBeNull();
    expect(student?.country).toBe("AU");
  });

  it("stores a child booking's contact on the guardian fields only", async () => {
    const result = await createTrialBooking({
      bookingFor: "child",
      firstName: "Kid",
      lastName: `Lead${suffix}`,
      guardianName: `Guardian ${suffix}`,
      guardianRelationship: "Mother",
      email: `kid-lead-${suffix}@example.com`,
      phone: "0412 345 678",
      locationId,
      disciplineId,
      sessionDate: null,
      sessionCourseName: null,
    });
    expect(result.outcome).toBe("created");
    if (result.outcome !== "created") throw new Error("expected created");

    const student = await prisma.student.findUnique({
      where: { id: result.studentId },
    });
    // The entered contact is the guardian's — it lives on the guardian
    // fields ONLY. Student.email is unique, and copying the guardian's
    // address onto every child would block a second sibling booking.
    // Reminders and portal links fall back to the guardian.
    expect(student?.email).toBeNull();
    expect(student?.phone).toBeNull();
    expect(student?.guardianName).toBe(`Guardian ${suffix}`);
    expect(student?.guardianRelationship).toBe("Mother");
    expect(student?.guardianEmail).toBe(`kid-lead-${suffix}@example.com`);
    expect(student?.guardianPhone).toBe("0412 345 678");
    expect(student?.country).toBe("AU");
    expect(student?.notes).toContain("Booked by the guardian");

    await prisma.student.delete({ where: { id: result.studentId } });
  });

  it("lets one guardian book several children with the same email", async () => {
    const guardianEmail = `parent-${suffix}@example.com`;
    const first = await createTrialBooking({
      bookingFor: "child",
      firstName: "Elder",
      lastName: `Sibling${suffix}`,
      guardianName: `Guardian ${suffix}`,
      guardianRelationship: "Father",
      email: guardianEmail,
      phone: null,
      locationId,
      disciplineId,
      sessionDate: null,
      sessionCourseName: null,
    });
    expect(first.outcome).toBe("created");

    // Second child, same guardian address — must NOT be flagged as a
    // duplicate (the guardian's email is not the child's identity).
    const second = await createTrialBooking({
      bookingFor: "child",
      firstName: "Younger",
      lastName: `Sibling${suffix}`,
      guardianName: `Guardian ${suffix}`,
      guardianRelationship: "Father",
      email: guardianEmail,
      phone: null,
      locationId,
      disciplineId,
      sessionDate: null,
      sessionCourseName: null,
    });
    expect(second.outcome).toBe("created");

    // Booking the SAME child again (same name + guardian email) is caught.
    const rebook = await createTrialBooking({
      bookingFor: "child",
      firstName: "Younger",
      lastName: `Sibling${suffix}`,
      guardianName: `Guardian ${suffix}`,
      guardianRelationship: "Father",
      email: guardianEmail,
      phone: null,
      locationId,
      disciplineId,
      sessionDate: null,
      sessionCourseName: null,
    });
    expect(rebook.outcome).toBe("duplicate");

    const students = await prisma.student.findMany({
      where: { guardianEmail, lastName: `Sibling${suffix}` },
      select: { id: true, guardianEmail: true, email: true },
    });
    expect(students).toHaveLength(2);
    for (const student of students) {
      expect(student.guardianEmail).toBe(guardianEmail);
      expect(student.email).toBeNull();
    }

    await prisma.student.deleteMany({
      where: { guardianEmail, lastName: `Sibling${suffix}` },
    });
  });

  it("flags a duplicate email instead of creating a second student", async () => {
    const result = await createTrialBooking({
      bookingFor: "adult",
      firstName: "Website",
      lastName: `Lead${suffix}`,
      guardianName: null,
      guardianRelationship: null,
      email: `lead-${suffix}@example.com`,
      phone: null,
      locationId,
      disciplineId,
      sessionDate: null,
      sessionCourseName: null,
    });
    expect(result.outcome).toBe("duplicate");
  });
});

describe.skipIf(!hasTestDatabase)("bookable sessions", () => {
  it("lists upcoming scheduled sessions for active courses", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    future.setUTCHours(0, 0, 0, 0);
    await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: future,
        startTime: "18:00",
        endTime: "19:00",
      },
    });
    // Sessions are generated from weekly slots; the bookable filter matches
    // sessions back to their slot, so the slot must exist and allow trials.
    await prisma.trainingTime.create({
      data: {
        courseId,
        weekday: future.getUTCDay(),
        startTime: "18:00",
        endTime: "19:00",
      },
    });

    const sessions = await listBookableSessions();
    const ours = sessions.find((session) =>
      session.courseName.includes(suffix),
    );
    expect(ours).toBeDefined();
    expect(ours?.disciplineId).toBe(disciplineId);
  });

  it("hides sessions whose weekly slot is not trial bookable", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 4);
    future.setUTCHours(0, 0, 0, 0);
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: future,
        startTime: "19:30",
        endTime: "20:30",
      },
    });

    // Slot exists but opted out of trials — the session stays hidden even
    // though it is scheduled at an active course.
    await prisma.trainingTime.create({
      data: {
        courseId,
        weekday: future.getUTCDay(),
        startTime: "19:30",
        endTime: "20:30",
        trialBookable: false,
      },
    });
    const optedOut = await listBookableSessions();
    expect(optedOut.filter((row) => row.id === session.id)).toHaveLength(0);

    // Flipping the slot to bookable reveals the session immediately.
    await prisma.trainingTime.updateMany({
      where: { courseId, startTime: "19:30" },
      data: { trialBookable: true },
    });
    const optedIn = await listBookableSessions();
    expect(optedIn.some((row) => row.id === session.id)).toBe(true);
  });
});

describe.skipIf(!hasTestDatabase)("trial follow-up emails", () => {
  it("emails open trials past the window once and never repeats", async () => {
    await updateCommunicationsSettings({
      trialFollowUpsEnabled: true,
      trialFollowUpDaysAfterJoin: 3,
    });

    // The pipeline trial from earlier tests joined recently — backdate it.
    const old = new Date();
    old.setDate(old.getDate() - 5);
    await prisma.student.update({
      where: { id: trialId! },
      data: {
        status: "TRIAL",
        trialStage: "FIRST_CLASS",
        joinedAt: old,
        email: `trial-${suffix}@example.com`,
      },
    });

    await sendTrialFollowUps(new Date());

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: `trial-followup:${trialId}` },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.type).toBe("TRIALFOLLOWUP");

    await sendTrialFollowUps(new Date());
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: `trial-followup:${trialId}` },
        })
      ).length,
    ).toBe(1);
  });

  it("skips trials inside the follow-up window and converted ones", async () => {
    const fresh = await prisma.student.create({
      data: {
        firstName: "Fresh",
        lastName: `Trial${suffix}`,
        status: "TRIAL",
        trialStage: "NEW",
        email: `fresh-${suffix}@example.com`,
        locations: { create: { locationId, isPrimary: true } },
      },
      select: { id: true },
    });

    await sendTrialFollowUps(new Date());
    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: `trial-followup:${fresh.id}` },
    });
    expect(logs).toHaveLength(0);

    await prisma.student.delete({ where: { id: fresh.id } });
  });

  it("shows pipeline stats via listTrials", async () => {
    const { rows } = await listTrials();
    const ours = rows.find((row) => row.studentId === trialId);
    expect(ours).toBeDefined();
    expect(ours?.stage).toBe("FIRST_CLASS");
    expect(ours?.locationNames).toContain(`Trial Dojo ${suffix}`);
  });
});

describe.skipIf(!hasTestDatabase)("trial slot capacity", () => {
  let capacityCourseId: string;

  afterAll(async () => {
    if (capacityCourseId) {
      await prisma.classSession.deleteMany({
        where: { courseId: capacityCourseId },
      });
      await prisma.course
        .delete({ where: { id: capacityCourseId } })
        .catch(() => undefined);
    }
  });

  async function book(sessionId: string, email: string) {
    return createTrialBooking({
      bookingFor: "adult",
      firstName: "Capacity",
      lastName: `Prospect${suffix}`,
      guardianName: null,
      guardianRelationship: null,
      email,
      phone: null,
      locationId,
      disciplineId,
      sessionDate: null,
      sessionCourseName: null,
      sessionId,
    });
  }

  it("refuses a booking once the weekly slot is full", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const weekday = today.getUTCDay();

    capacityCourseId = await createCourse({
      name: `Capacity Course ${suffix}`,
      description: null,
      locationId,
      disciplineId,
      trainerId: null,
      isActive: true,
      trainingTimes: [
        {
          weekday,
          startTime: "07:00",
          endTime: "08:00",
          trialBookable: true,
          capacity: 1,
        },
      ],
    });

    const session = await prisma.classSession.create({
      data: {
        courseId: capacityCourseId,
        locationId,
        date: today,
        startTime: "07:00",
        endTime: "08:00",
      },
    });

    const first = await book(session.id, `cap-1-${suffix}@example.com`);
    expect(first.outcome).toBe("created");

    // The slot now reports full to the booking page.
    const bookable = await listBookableSessions();
    const ours = bookable.find((entry) => entry.id === session.id);
    expect(ours?.full).toBe(true);

    const second = await book(session.id, `cap-2-${suffix}@example.com`);
    expect(second.outcome).toBe("full");
  });
});
