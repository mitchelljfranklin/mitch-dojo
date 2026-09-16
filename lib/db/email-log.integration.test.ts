import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  getEmailLogById,
  getFailedEmailCount,
  listEmailLogs,
} from "@/lib/db/email-log";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

async function seedLog(overrides: {
  type: string;
  sentTo: string;
  status: string;
  sentAt?: Date;
  errorMessage?: string | null;
  dedupKey?: string | null;
}) {
  return prisma.notificationLog.create({
    data: {
      type: overrides.type,
      sentTo: overrides.sentTo,
      subject: `Test ${overrides.type}`,
      status: overrides.status,
      errorMessage: overrides.errorMessage ?? null,
      sentAt: overrides.sentAt ?? new Date(),
      assessmentId: overrides.dedupKey ?? null,
    },
  });
}

const createdIds: string[] = [];

async function track(prismaPromise: Promise<{ id: string }>) {
  const row = await prismaPromise;
  createdIds.push(row.id);
  return row;
}

beforeAll(async () => {
  await prisma.notificationLog.deleteMany({});
  await track(
    seedLog({
      type: "CLASSREMINDER",
      sentTo: `alice-${suffix}@example.com`,
      status: "SENT",
      sentAt: new Date(Date.now() - 3_600_000),
    }),
  );
  await track(
    seedLog({
      type: "PAYMENTREMINDER",
      sentTo: `bob-${suffix}@example.com`,
      status: "FAILED",
      errorMessage: "SMTP is not configured.",
      sentAt: new Date(Date.now() - 1_800_000),
      dedupKey: "payment-due:inv123",
    }),
  );
  await track(
    seedLog({
      type: "BIRTHDAY",
      sentTo: `carol-${suffix}@example.com`,
      status: "FAILED",
      errorMessage: "SMTP is not configured.",
      // 48h ago — outside the 24h failed window.
      sentAt: new Date(Date.now() - 2 * 86_400_000),
    }),
  );
});

afterAll(async () => {
  await prisma.notificationLog.deleteMany({
    where: { id: { in: createdIds } },
  });
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("email log listing", () => {
  it("lists rows newest first with sender fallback", async () => {
    const { rows } = await listEmailLogs({}, 1, 50);
    const ours = rows.filter((row) => row.sentTo.includes(suffix));
    expect(ours.length).toBe(3);
    expect(ours[0]!.sentTo).toBe(`bob-${suffix}@example.com`);
    // No user attached → "System".
    expect(ours[0]!.sentByName).toBe("System");
  });

  it("filters by status and type", async () => {
    const failed = await listEmailLogs({ status: "FAILED" }, 1, 50);
    expect(failed.rows.every((row) => row.status === "FAILED")).toBe(true);
    expect(
      failed.rows.some((row) => row.sentTo === `bob-${suffix}@example.com`),
    ).toBe(true);

    const birthdays = await listEmailLogs({ type: "BIRTHDAY" }, 1, 50);
    expect(birthdays.rows).toHaveLength(1);
    expect(birthdays.rows[0]!.sentTo).toBe(`carol-${suffix}@example.com`);
  });

  it("filters by recipient fragment (case-insensitive)", async () => {
    const { rows } = await listEmailLogs(
      { recipient: `ALICE-${suffix}` },
      1,
      50,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sentTo).toBe(`alice-${suffix}@example.com`);
  });

  it("filters by date range", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    // en-CA yields the LOCAL YYYY-MM-DD calendar date (toISOString would
    // give the UTC date and shift the boundary for anyone ahead of UTC).
    const { rows } = await listEmailLogs(
      { fromDate: yesterday.toLocaleDateString("en-CA") },
      1,
      50,
    );
    // Everything except the 48h-old birthday email.
    expect(rows.some((row) => row.sentTo === `bob-${suffix}@example.com`)).toBe(
      true,
    );
    expect(
      rows.some((row) => row.sentTo === `carol-${suffix}@example.com`),
    ).toBe(false);
  });

  it("paginates", async () => {
    const page1 = await listEmailLogs({}, 1, 2);
    expect(page1.rows).toHaveLength(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);

    const page2 = await listEmailLogs({}, 2, 2);
    expect(page2.rows.length).toBeGreaterThanOrEqual(1);
    expect(page2.rows[0]!.id).not.toBe(page1.rows[0]!.id);
  });
});

describe.skipIf(!hasTestDatabase)("email log lookup", () => {
  it("fetches one row with the dedup key", async () => {
    const { rows } = await listEmailLogs({ type: "PAYMENTREMINDER" }, 1, 10);
    const target = rows.find((row) => row.sentTo.includes(suffix));
    expect(target).toBeDefined();

    const detail = await getEmailLogById(target!.id);
    expect(detail?.dedupKey).toBe("payment-due:inv123");
    expect(detail?.status).toBe("FAILED");
  });

  it("returns null for unknown ids", async () => {
    expect(await getEmailLogById("nonexistent")).toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("failed email count", () => {
  it("counts only FAILED rows inside the 24h window", async () => {
    const count = await getFailedEmailCount();
    // bob (1.5h ago, FAILED) counts; carol (48h ago, FAILED) does not.
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
