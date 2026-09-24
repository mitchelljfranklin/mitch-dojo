import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { sendBookingStaffAlert } from "@/lib/email/booking-staff-alert";
import {
  getCommunicationsSettings,
  updateCommunicationsSettings,
} from "@/lib/settings";
import { type CommunicationsSettings } from "@/lib/settings/schema";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

const STUDENT_ID = "booking-staff-alert-test-student";
const DEDUP_KEY = `booking-staff:${STUDENT_ID}`;
const suffix = Date.now().toString(36);

let originalSettings: CommunicationsSettings;

function bookingInput() {
  return {
    studentId: STUDENT_ID,
    firstName: "Test",
    lastName: `Booking${suffix}`,
    bookingFor: "child" as const,
    guardianName: "Jo Guardian",
    email: "parent@example.com",
    phone: "0412 345 678",
    sessionCourseName: "Kids Karate",
    sessionDate: "2026-10-01",
  };
}

beforeAll(async () => {
  originalSettings = await getCommunicationsSettings();
  await prisma.notificationLog.deleteMany({
    where: { assessmentId: DEDUP_KEY },
  });
});

afterAll(async () => {
  if (originalSettings) {
    await updateCommunicationsSettings(originalSettings);
  }
  await prisma.notificationLog.deleteMany({
    where: { assessmentId: DEDUP_KEY },
  });
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("sendBookingStaffAlert", () => {
  it("logs one alert per configured recipient", async () => {
    await updateCommunicationsSettings({
      bookingStaffAlertsEnabled: true,
      bookingStaffAlertRecipients: [
        `staff-a-${suffix}@example.com`,
        `staff-b-${suffix}@example.com`,
      ],
    });

    await sendBookingStaffAlert(bookingInput());

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: DEDUP_KEY },
    });
    expect(logs).toHaveLength(2);
    expect(logs.every((log) => log.type === "BOOKINGSTAFF")).toBe(true);
    expect(
      logs.every((log) => log.subject?.includes("New trial booking")),
    ).toBe(true);
    const recipients = logs.map((log) => log.sentTo).sort();
    expect(recipients).toEqual([
      `staff-a-${suffix}@example.com`,
      `staff-b-${suffix}@example.com`,
    ]);
  });

  it("sends nothing when disabled", async () => {
    await updateCommunicationsSettings({
      bookingStaffAlertsEnabled: false,
      bookingStaffAlertRecipients: [`staff-c-${suffix}@example.com`],
    });
    await prisma.notificationLog.deleteMany({
      where: { assessmentId: DEDUP_KEY },
    });

    await sendBookingStaffAlert(bookingInput());

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: DEDUP_KEY },
    });
    expect(logs).toHaveLength(0);
  });

  it("sends nothing with no recipients configured", async () => {
    await updateCommunicationsSettings({
      bookingStaffAlertsEnabled: true,
      bookingStaffAlertRecipients: [],
    });
    await prisma.notificationLog.deleteMany({
      where: { assessmentId: DEDUP_KEY },
    });

    await sendBookingStaffAlert(bookingInput());

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: DEDUP_KEY },
    });
    expect(logs).toHaveLength(0);
  });
});
