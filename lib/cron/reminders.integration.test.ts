import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createMembershipPlan } from "@/lib/db/memberships";
import { updateCommunicationsSettings } from "@/lib/settings";
import {
  resolveRecipient,
  sendBirthdayEmails,
  sendClassReminders,
  sendPaymentReminders,
  sessionStartDateTime,
} from "@/lib/cron/reminders";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
// No SMTP is configured on the test database, so sendEmail() attempts fail
// and record a FAILED NotificationLog row — which is exactly what these
// tests assert on: one log row per dedup key, never a second one.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let studentId: string;
let courseId: string;

function daysFromNowAt(days: number, hours: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

beforeAll(async () => {
  await prisma.notificationLog.deleteMany({});
  const location = await createLocation({
    name: `Reminder Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Reminder Karate ${suffix}`);
  disciplineId = discipline.id;

  studentId = await createStudent({
    firstName: "Reminder",
    lastName: `Kid${suffix}`,
    email: `reminder-kid-${suffix}@example.com`,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
    guardianPhone: null,
    addressLine: null,
    city: null,
    postcode: null,
    status: "ACTIVE",
    notes: null,
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [disciplineId],
  });

  const course = await prisma.course.create({
    data: {
      name: `Reminder Course ${suffix}`,
      locationId,
      disciplineId,
    },
  });
  courseId = course.id;
});

afterAll(async () => {
  await prisma.notificationLog.deleteMany({});
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.course
    .delete({ where: { id: courseId } })
    .catch(() => undefined);
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.membershipPlan
    .deleteMany({ where: { name: { contains: suffix } } })
    .catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("resolveRecipient", () => {
  it("prefers the student email and falls back to the guardian", () => {
    expect(resolveRecipient({ email: "a@b.c", guardianEmail: "g@b.c" })).toBe(
      "a@b.c",
    );
    expect(resolveRecipient({ email: null, guardianEmail: "g@b.c" })).toBe(
      "g@b.c",
    );
    expect(resolveRecipient({ email: " ", guardianEmail: null })).toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("sessionStartDateTime", () => {
  it("combines the UTC-midnight session date with a wall-clock time", () => {
    const date = utcMidnight(new Date(2026, 8, 15));
    const start = sessionStartDateTime({ date, startTime: "18:30" });
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(18);
    expect(start.getMinutes()).toBe(30);
  });
});

describe.skipIf(!hasTestDatabase)("class reminders", () => {
  it("logs one reminder per student in the window and never repeats", async () => {
    await updateCommunicationsSettings({
      classRemindersEnabled: true,
      classReminderHoursBefore: 24,
    });

    // A session starting within the 24h window.
    const insideStart = daysFromNowAt(0, 20);
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: utcMidnight(insideStart),
        startTime: `${String(insideStart.getHours()).padStart(2, "0")}:00`,
        endTime: "21:00",
      },
    });

    const created = await sendClassReminders(
      new Date(insideStart.getTime() - 2 * 3_600_000),
    );
    void created;

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: `class-reminder:${session.id}:${studentId}` },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.type).toBe("CLASSREMINDER");

    // Second tick: dedup key exists → no new row.
    await sendClassReminders(new Date(insideStart.getTime() - 1 * 3_600_000));
    const logsAfter = await prisma.notificationLog.findMany({
      where: { assessmentId: `class-reminder:${session.id}:${studentId}` },
    });
    expect(logsAfter).toHaveLength(1);

    await prisma.classSession.delete({ where: { id: session.id } });
  });

  it("skips sessions outside the reminder window", async () => {
    await updateCommunicationsSettings({
      classRemindersEnabled: true,
      classReminderHoursBefore: 24,
    });

    const farStart = daysFromNowAt(3, 18);
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: utcMidnight(farStart),
        startTime: "18:00",
        endTime: "19:00",
      },
    });

    await sendClassReminders(new Date());
    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: `class-reminder:${session.id}:${studentId}` },
    });
    expect(logs).toHaveLength(0);

    await prisma.classSession.delete({ where: { id: session.id } });
  });

  it("skips students not linked to the course's discipline", async () => {
    await updateCommunicationsSettings({
      classRemindersEnabled: true,
      classReminderHoursBefore: 24,
    });

    const outsider = await createStudent({
      firstName: "Outsider",
      lastName: `Kid${suffix}`,
      email: "outsider@example.com",
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      addressLine: null,
      city: null,
      postcode: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [locationId],
      primaryLocationId: locationId,
      disciplineIds: [],
    });

    const start = daysFromNowAt(0, 21);
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: utcMidnight(start),
        startTime: "21:00",
        endTime: "22:00",
      },
    });

    await sendClassReminders(new Date(start.getTime() - 3_600_000));

    const outsiderLogs = await prisma.notificationLog.findMany({
      where: { assessmentId: `class-reminder:${session.id}:${outsider}` },
    });
    expect(outsiderLogs).toHaveLength(0);

    await prisma.classSession.delete({ where: { id: session.id } });
    await deleteStudent(outsider);
  });
});

describe.skipIf(!hasTestDatabase)("payment reminders", () => {
  it("logs due-soon and overdue reminders once per invoice", async () => {
    await updateCommunicationsSettings({
      paymentRemindersEnabled: true,
      paymentReminderDaysBeforeDue: 3,
      paymentReminderOverdueDays: 7,
    });

    const plan = await createMembershipPlan({
      name: `Reminder Plan ${suffix}`,
      description: null,
      planType: "ITEM",
      billingPeriod: null,
      priceCents: 5000,
    });

    const dueSoon = await prisma.invoice.create({
      data: {
        number: 800_001,
        studentId,
        status: "OPEN",
        issueDate: utcMidnight(new Date()),
        dueDate: utcMidnight(daysFromNowAt(2, 0)),
        items: {
          create: { description: plan.name, quantity: 1, unitPriceCents: 5000 },
        },
      },
    });
    const overdue = await prisma.invoice.create({
      data: {
        number: 800_002,
        studentId,
        status: "OPEN",
        issueDate: utcMidnight(daysFromNowAt(-60, 0)),
        dueDate: utcMidnight(daysFromNowAt(-45, 0)),
        items: {
          create: { description: plan.name, quantity: 1, unitPriceCents: 5000 },
        },
      },
    });

    await sendPaymentReminders(new Date());

    const dueSoonLogs = await prisma.notificationLog.findMany({
      where: { assessmentId: `payment-due:${dueSoon.id}` },
    });
    expect(dueSoonLogs).toHaveLength(1);

    const overdueLogs = await prisma.notificationLog.findMany({
      where: { assessmentId: `payment-overdue:${overdue.id}` },
    });
    expect(overdueLogs).toHaveLength(1);

    // Repeat tick: still one row each.
    await sendPaymentReminders(new Date());
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: `payment-due:${dueSoon.id}` },
        })
      ).length,
    ).toBe(1);

    await prisma.invoice.deleteMany({
      where: { id: { in: [dueSoon.id, overdue.id] } },
    });
    await prisma.membershipPlan.delete({ where: { id: plan.id } });
  });
});

describe.skipIf(!hasTestDatabase)("birthday emails", () => {
  it("logs a birthday email on the day and never again that year", async () => {
    await updateCommunicationsSettings({
      birthdayEmailsEnabled: true,
    });

    const now = new Date();
    const dobThisYear = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    await prisma.student.update({
      where: { id: studentId },
      data: {
        // Clear the student email so the guardian fallback is exercised.
        email: null,
        dateOfBirth: dobThisYear,
        guardianEmail: `guardian-${suffix}@example.com`,
      },
    });

    await sendBirthdayEmails(now);

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: `birthday:${studentId}:${now.getFullYear()}` },
    });
    expect(logs).toHaveLength(1);
    // Guardian fallback was used (student has no email).
    expect(logs[0]!.sentTo).toBe(`guardian-${suffix}@example.com`);

    // Same day again: no duplicate.
    await sendBirthdayEmails(now);
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: `birthday:${studentId}:${now.getFullYear()}` },
        })
      ).length,
    ).toBe(1);

    await prisma.student.update({
      where: { id: studentId },
      data: { dateOfBirth: null, guardianEmail: null },
    });
  });

  it("ignores students whose birthday is not today", async () => {
    await updateCommunicationsSettings({
      birthdayEmailsEnabled: true,
    });

    // Clear logs from the same-day test above so the strict "0 rows"
    // assertion below measures only this run.
    await prisma.notificationLog.deleteMany({
      where: { assessmentId: { startsWith: `birthday:${studentId}:` } },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await prisma.student.update({
      where: { id: studentId },
      data: {
        dateOfBirth: new Date(
          Date.UTC(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
          ),
        ),
        email: "someone@example.com",
      },
    });

    await sendBirthdayEmails(new Date());
    const logs = await prisma.notificationLog.findMany({
      where: {
        assessmentId: { startsWith: `birthday:${studentId}:` },
      },
    });
    expect(logs).toHaveLength(0);

    await prisma.student.update({
      where: { id: studentId },
      data: { dateOfBirth: null },
    });
  });
});
