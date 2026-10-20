import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createCampaign, processCampaigns } from "@/lib/db/campaigns";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let otherDisciplineId: string;
const studentIds: string[] = [];

async function makeStudent(
  label: string,
  opts: {
    email: string | null;
    guardianEmail?: string | null;
    disciplineId?: string;
  },
): Promise<string> {
  const id = await createStudent({
    firstName: label,
    lastName: `Camp${suffix}`,
    email: opts.email,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: opts.guardianEmail ?? null,
    guardianPhone: null,
    guardianRelationship: null,
    medicalMedications: null,
    medicalConditions: null,
    medicalInjuries: null,
    addressLine: null,
    city: null,
    state: null,
    postcode: null,
    country: null,
    status: "ACTIVE",
    notes: null,
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [opts.disciplineId ?? disciplineId],
  });
  studentIds.push(id);
  return id;
}

beforeAll(async () => {
  if (!hasTestDatabase) return;
  const location = await createLocation({
    name: `Campaign Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 70,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Campaign Karate ${suffix}`);
  disciplineId = discipline.id;
  const other = await createDiscipline(`Campaign Judo ${suffix}`);
  otherDisciplineId = other.id;

  await makeStudent("Alpha", { email: `alpha-${suffix}@example.com` });
  // Guardian-only contact (no own email).
  await makeStudent("Bravo", {
    email: null,
    guardianEmail: `bravo-${suffix}@example.com`,
  });
  // Shares the guardian address of Alpha — must be deduped to one email.
  await makeStudent("Charlie", {
    email: null,
    guardianEmail: `alpha-${suffix}@example.com`,
  });
  // Different discipline — excluded from the DISCIPLINE audience.
  await makeStudent("Delta", {
    email: `delta-${suffix}@example.com`,
    disciplineId: otherDisciplineId,
  });
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  await prisma.notificationLog.deleteMany({
    where: { assessmentId: { startsWith: "campaign:" } },
  });
  await prisma.emailCampaign.deleteMany({
    where: { subject: { contains: suffix } },
  });
  for (const id of studentIds) {
    await deleteStudent(id).catch(() => undefined);
  }
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteDiscipline(otherDisciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("campaigns", () => {
  it("resolves and dedupes recipients (student → guardian fallback)", async () => {
    const all = await createCampaign({
      subject: `All members ${suffix}`,
      body: "Hello everyone",
      audienceType: "ALL",
      audienceRefId: null,
      createdById: null,
    });
    // The shared test DB holds students from other suites, so assert on the
    // addresses rather than an exact total: our three distinct addresses
    // appear once each, and Charlie's guardian address (== Alpha's) is deduped.
    const allRow = await prisma.emailCampaign.findUnique({
      where: { id: all.id },
      select: { recipients: true },
    });
    const addresses = (allRow!.recipients as { email: string }[]).map(
      (recipient) => recipient.email,
    );
    const ours = addresses.filter((email) => email.includes(suffix));
    expect(ours.sort()).toEqual(
      [
        `alpha-${suffix}@example.com`,
        `bravo-${suffix}@example.com`,
        `delta-${suffix}@example.com`,
      ].sort(),
    );
    expect(new Set(addresses).size).toBe(addresses.length);

    const byDiscipline = await createCampaign({
      subject: `Karate only ${suffix}`,
      body: "Hello karate",
      audienceType: "DISCIPLINE",
      audienceRefId: disciplineId,
      createdById: null,
    });
    // Only our two Karate students (Alpha + Bravo), no other suite's data.
    expect(byDiscipline.recipientCount).toBe(2);
  });

  it("processes queued campaigns and logs one email per recipient", async () => {
    // SMTP is unconfigured in tests, so sends log as FAILED — but each
    // recipient gets exactly one log row and the campaign completes.
    const sent = await processCampaigns(25);
    expect(sent).toBe(0);

    // The oldest campaign (ALL) is now finished.
    const all = await prisma.emailCampaign.findFirst({
      where: { subject: `All members ${suffix}` },
    });
    expect(all?.status).toBe("SENT");
    expect(all?.failedCount).toBe(all?.recipientCount);

    const logs = await prisma.notificationLog.findMany({
      where: { assessmentId: { startsWith: `campaign:${all!.id}:` } },
    });
    expect(logs).toHaveLength(all!.recipientCount);
    expect(logs.every((log) => log.type === "CAMPAIGN")).toBe(true);
    // Our account is among them.
    expect(
      logs.some((log) => log.sentTo === `alpha-${suffix}@example.com`),
    ).toBe(true);
  });

  it("does not resend on a subsequent tick", async () => {
    await processCampaigns(25); // drains the DISCIPLINE campaign
    const before = await prisma.notificationLog.count({
      where: { assessmentId: { startsWith: "campaign:" } },
    });
    await processCampaigns(25);
    const after = await prisma.notificationLog.count({
      where: { assessmentId: { startsWith: "campaign:" } },
    });
    expect(after).toBe(before);
  });

  it("skips opted-out members and includes tax in the overdue audience", async () => {
    // An opted-out member is excluded from every audience.
    const optedOutId = await makeStudent("Echo", {
      email: `echo-${suffix}@example.com`,
    });
    await prisma.student.update({
      where: { id: optedOutId },
      data: { emailOptOut: true },
    });
    const all = await createCampaign({
      subject: `Optout ${suffix}`,
      body: "Hello",
      audienceType: "ALL",
      audienceRefId: null,
      createdById: null,
    });
    const allRow = await prisma.emailCampaign.findUnique({
      where: { id: all.id },
      select: { recipients: true },
    });
    expect(
      (allRow!.recipients as { email: string }[]).map(
        (recipient) => recipient.email,
      ),
    ).not.toContain(`echo-${suffix}@example.com`);

    // Overdue audience is tax-aware: items cover the subtotal, tax remains.
    const foxtrotId = await makeStudent("Foxtrot", {
      email: `foxtrot-${suffix}@example.com`,
    });
    const now = new Date();
    const due = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 5),
    );
    await prisma.invoice.create({
      data: {
        number: 950_000 + Math.floor(Math.random() * 40_000),
        studentId: foxtrotId,
        status: "OPEN",
        issueDate: due,
        dueDate: due,
        taxCents: 100,
        taxLabel: "GST",
        items: {
          create: { description: "Plan", quantity: 1, unitPriceCents: 1000 },
        },
        payments: {
          create: { amountCents: 1000, method: "CASH", paidAt: due },
        },
      },
    });

    const overdue = await createCampaign({
      subject: `Overdue ${suffix}`,
      body: "Pay please",
      audienceType: "OVERDUE",
      audienceRefId: null,
      createdById: null,
    });
    const overdueRow = await prisma.emailCampaign.findUnique({
      where: { id: overdue.id },
      select: { recipients: true },
    });
    expect(
      (overdueRow!.recipients as { email: string }[]).map(
        (recipient) => recipient.email,
      ),
    ).toContain(`foxtrot-${suffix}@example.com`);
  });
});
