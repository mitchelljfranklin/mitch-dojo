import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createTrainer, deleteTrainer } from "@/lib/db/trainers";
import { sendVerificationReminders } from "@/lib/cron/reminders";
import { updateCommunicationsSettings } from "@/lib/settings";
import {
  createVerificationType,
  deleteTrainerVerification,
  deleteVerificationType,
  getTrainerVerificationView,
  getVerificationSummaries,
  listVerificationTypes,
  saveTrainerVerification,
  setVerificationTypeActive,
  updateVerificationType,
  verificationStatus,
} from "@/lib/db/verifications";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let trainerId: string;
let typeId: string;

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

beforeAll(async () => {
  if (!hasTestDatabase) return;
  const trainer = await createTrainer({
    name: `Verify Sensei ${suffix}`,
    email: null,
    phone: null,
    bio: null,
    isActive: true,
    userId: null,
  });
  trainerId = trainer.id;
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  await prisma.trainerVerification
    .deleteMany({ where: { trainerId } })
    .catch(() => undefined);
  if (trainerId) await deleteTrainer(trainerId).catch(() => undefined);
  await prisma.verificationType
    .deleteMany({ where: { name: { contains: suffix } } })
    .catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("verificationStatus", () => {
  it("derives status from the expiry date", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    expect(verificationStatus(null, now)).toBe("VALID");
    expect(verificationStatus(new Date("2027-01-01T00:00:00.000Z"), now)).toBe(
      "VALID",
    );
    expect(
      verificationStatus(new Date("2026-07-01T00:00:00.000Z"), now, 60),
    ).toBe("EXPIRING");
    expect(verificationStatus(new Date("2026-01-01T00:00:00.000Z"), now)).toBe(
      "EXPIRED",
    );
  });
});

describe.skipIf(!hasTestDatabase)("verification types", () => {
  it("creates, updates, disables, and guards deletion", async () => {
    const created = await createVerificationType({
      name: `Blue Card ${suffix}`,
      description: "Working with children",
      required: true,
      requiresExpiry: true,
      defaultValidityMonths: 36,
      isActive: true,
    });
    typeId = created.id;

    let types = await listVerificationTypes(true);
    expect(types.find((type) => type.id === typeId)?.name).toBe(
      `Blue Card ${suffix}`,
    );

    await updateVerificationType(typeId, {
      name: `Blue Card ${suffix}`,
      description: null,
      required: true,
      requiresExpiry: true,
      defaultValidityMonths: 24,
      isActive: true,
    });
    types = await listVerificationTypes();
    expect(
      types.find((type) => type.id === typeId)?.defaultValidityMonths,
    ).toBe(24);

    // A record blocks deletion.
    await saveTrainerVerification({
      trainerId,
      typeId,
      referenceNumber: "BC-1",
      issuedAt: daysFromNow(-30),
      expiresAt: daysFromNow(365),
      notes: null,
      recordedById: null,
    });
    await expect(deleteVerificationType(typeId)).rejects.toThrow();

    await setVerificationTypeActive(typeId, false);
    expect(
      (await listVerificationTypes(true)).some((type) => type.id === typeId),
    ).toBe(false);
    await setVerificationTypeActive(typeId, true);
  });
});

describe.skipIf(!hasTestDatabase)("trainer verification records", () => {
  it("records, views, and removes a verification", async () => {
    const view = await getTrainerVerificationView(trainerId);
    const row = view.rows.find((entry) => entry.typeId === typeId);
    expect(row).toBeDefined();
    expect(row!.recordId).not.toBeNull();
    expect(row!.status).toBe("VALID");
    expect(row!.referenceNumber).toBe("BC-1");

    // Expire it and confirm the summary reflects it.
    await saveTrainerVerification({
      trainerId,
      typeId,
      referenceNumber: "BC-1",
      issuedAt: daysFromNow(-400),
      expiresAt: daysFromNow(-10),
      notes: null,
      recordedById: null,
    });
    const expired = await getTrainerVerificationView(trainerId);
    expect(expired.rows.find((entry) => entry.typeId === typeId)?.status).toBe(
      "EXPIRED",
    );
    expect(expired.summary.expired).toBe(1);

    const summaries = await getVerificationSummaries();
    expect(summaries.get(trainerId)?.expired).toBeGreaterThanOrEqual(1);

    // Missing required type shows in the summary.
    const requiredType = await createVerificationType({
      name: `Required Only ${suffix}`,
      description: null,
      required: true,
      requiresExpiry: false,
      defaultValidityMonths: null,
      isActive: true,
    });
    const withMissing = await getVerificationSummaries();
    expect(withMissing.get(trainerId)?.missing).toBeGreaterThanOrEqual(1);

    const record = await prisma.trainerVerification.findUnique({
      where: { trainerId_typeId: { trainerId, typeId } },
    });
    const removed = await deleteTrainerVerification(record!.id);
    expect(removed.documentKey).toBeNull();
    expect(
      await prisma.trainerVerification.findUnique({
        where: { trainerId_typeId: { trainerId, typeId } },
      }),
    ).toBeNull();

    await deleteVerificationType(requiredType.id);
  });
});

describe.skipIf(!hasTestDatabase)("verification reminders", () => {
  it("reminds weekly, re-arms next week, and falls back to staff recipients", async () => {
    await prisma.trainer.update({
      where: { id: trainerId },
      data: { email: `sensei-${suffix}@example.test`, isActive: true },
    });
    await saveTrainerVerification({
      trainerId,
      typeId,
      referenceNumber: "BC-1",
      issuedAt: daysFromNow(-300),
      expiresAt: daysFromNow(10),
      notes: null,
      recordedById: null,
    });
    await prisma.notificationLog.deleteMany({
      where: { assessmentId: { startsWith: "verification-reminder:" } },
    });

    const now = new Date();
    const bucket = Math.floor(now.getTime() / (7 * 86_400_000));
    await sendVerificationReminders(now);

    const record = await prisma.trainerVerification.findUnique({
      where: { trainerId_typeId: { trainerId, typeId } },
    });
    const expiry = record!.expiresAt!.toISOString().slice(0, 10);
    const trainerEmail = `sensei-${suffix}@example.test`;
    const key = `verification-reminder:${record!.id}:${expiry}:${bucket}:${trainerEmail}`;
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: key },
        })
      ).length,
    ).toBe(1);

    // Same week: dedup holds.
    await sendVerificationReminders(now);
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: key },
        })
      ).length,
    ).toBe(1);

    // Next week: a new bucket re-arms the reminder.
    const nextWeek = new Date(now.getTime() + 7 * 86_400_000);
    const nextBucket = Math.floor(nextWeek.getTime() / (7 * 86_400_000));
    await sendVerificationReminders(nextWeek);
    const nextKey = `verification-reminder:${record!.id}:${expiry}:${nextBucket}:${trainerEmail}`;
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: nextKey },
        })
      ).length,
    ).toBe(1);

    // No trainer email → fall back to the configured staff recipients.
    await updateCommunicationsSettings({
      verificationReminderRecipients: [`office-${suffix}@example.test`],
    });
    await prisma.trainer.update({
      where: { id: trainerId },
      data: { email: null },
    });
    await prisma.notificationLog.deleteMany({
      where: { assessmentId: { startsWith: "verification-reminder:" } },
    });
    await sendVerificationReminders(now);
    const fallbackKey = `verification-reminder:${record!.id}:${expiry}:${bucket}:office-${suffix}@example.test`;
    expect(
      (
        await prisma.notificationLog.findMany({
          where: { assessmentId: fallbackKey },
        })
      ).length,
    ).toBe(1);

    await prisma.notificationLog.deleteMany({
      where: { assessmentId: { startsWith: "verification-reminder:" } },
    });
    await updateCommunicationsSettings({ verificationReminderRecipients: [] });
  });
});
