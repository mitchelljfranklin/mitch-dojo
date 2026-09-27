import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createMembershipPlan } from "@/lib/db/memberships";
import {
  createPortalLink,
  getPortalAttendance,
  getPortalContact,
  getPortalInvoices,
  getPortalStudent,
  getPortalUpcomingSessions,
  portalHasStudent,
  updatePortalContact,
  updatePortalEmailPreference,
  verifyPortalToken,
} from "@/lib/db/portal";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);
const APP_URL = "http://localhost:3000";

let locationId: string;
let disciplineId: string;
let courseId: string;
let studentId: string;
let guardianOnlyId: string;
let noEmailId: string;

beforeAll(async () => {
  const location = await createLocation({
    name: `Portal Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 60,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Portal Karate ${suffix}`);
  disciplineId = discipline.id;
  const course = await prisma.course.create({
    data: { name: `Portal Course ${suffix}`, locationId, disciplineId },
  });
  courseId = course.id;

  studentId = await createStudent({
    firstName: "Portal",
    lastName: `Member${suffix}`,
    email: `portal-${suffix}@example.com`,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
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
    disciplineIds: [disciplineId],
  });
  guardianOnlyId = await createStudent({
    firstName: "Guardian",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: `guardian-${suffix}@example.com`,
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
    disciplineIds: [disciplineId],
  });
  noEmailId = await createStudent({
    firstName: "Offline",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: null,
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
    locationIds: [],
    primaryLocationId: "",
    disciplineIds: [disciplineId],
  });
});

afterAll(async () => {
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  if (guardianOnlyId)
    await deleteStudent(guardianOnlyId).catch(() => undefined);
  if (noEmailId) await deleteStudent(noEmailId).catch(() => undefined);
  await prisma.classSession.deleteMany({ where: { courseId } });
  await prisma.course
    .delete({ where: { id: courseId } })
    .catch(() => undefined);
  await prisma.membershipPlan
    .deleteMany({ where: { name: { contains: suffix } } })
    .catch(() => undefined);
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("portal magic links", () => {
  it("creates a link for the student email and verifies the token", async () => {
    const link = await createPortalLink(studentId!, APP_URL);
    if (link.outcome !== "sent") throw new Error("expected sent");

    expect(link.recipient).toBe(`portal-${suffix}@example.com`);
    expect(link.url).toContain("/portal/welcome?token=");

    const resolved = await verifyPortalToken(
      new URL(link.url).searchParams.get("token")!,
    );
    expect(resolved).toBe(studentId);
  });

  it("falls back to the guardian email when the student has none", async () => {
    const link = await createPortalLink(guardianOnlyId!, APP_URL);
    if (link.outcome !== "sent") throw new Error("expected sent");
    expect(link.recipient).toBe(`guardian-${suffix}@example.com`);
  });

  it("reports no_recipient when neither email exists", async () => {
    const link = await createPortalLink(noEmailId!, APP_URL);
    expect(link.outcome).toBe("no_recipient");
  });

  it("rejects unknown, garbage, and expired tokens", async () => {
    expect(await verifyPortalToken("not-a-real-token")).toBeNull();
    expect(await verifyPortalToken("")).toBeNull();

    const link = await createPortalLink(studentId!, APP_URL);
    if (link.outcome !== "sent") throw new Error("expected sent");
    const rawToken = new URL(link.url).searchParams.get("token")!;

    // Force the token expired, then verify it no longer resolves.
    await prisma.portalToken.updateMany({
      where: { studentId: studentId! },
      data: { expiresAt: new Date(Date.now() - 86_400_000) },
    });
    expect(await verifyPortalToken(rawToken)).toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("portal data", () => {
  it("lists upcoming sessions at the member's location and discipline", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
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

    const sessions = await getPortalUpcomingSessions(studentId!);
    expect(
      sessions.some((session) => session.courseName.includes(suffix)),
    ).toBe(true);
  });

  it("summarises attendance and outstanding invoice balance", async () => {
    const session = await prisma.classSession.create({
      data: {
        courseId,
        locationId,
        date: new Date(Date.now() - 3 * 86_400_000),
        startTime: "18:00",
        endTime: "19:00",
      },
    });
    await prisma.attendance.create({
      data: { sessionId: session.id, studentId: studentId!, status: "PRESENT" },
    });

    const attendance = await getPortalAttendance(studentId!);
    expect(attendance.total).toBeGreaterThanOrEqual(1);

    const plan = await createMembershipPlan({
      name: `Portal Plan ${suffix}`,
      description: null,
      planType: "ITEM",
      billingPeriod: null,
      priceCents: 3000,
    });
    const invoice = await prisma.invoice.create({
      data: {
        number: 600_000 + Math.floor(Math.random() * 99_000),
        studentId: studentId!,
        status: "OPEN",
        issueDate: new Date(),
        dueDate: new Date(),
        items: {
          create: { description: plan.name, quantity: 1, unitPriceCents: 3000 },
        },
      },
    });

    const { rows, outstandingCents } = await getPortalInvoices(studentId!);
    const ours = rows.find((row) => row.id === invoice.id);
    expect(ours?.totalCents).toBe(3000);
    expect(outstandingCents).toBeGreaterThanOrEqual(3000);

    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.membershipPlan.delete({ where: { id: plan.id } });
  });
});

describe.skipIf(!hasTestDatabase)("household portal tokens", () => {
  let householdId: string;

  beforeAll(async () => {
    const { createHousehold } = await import("@/lib/db/households");
    householdId = await createHousehold({
      name: `Portal Family ${suffix}`,
      contactName: "Pat Family",
      contactEmail: `family-${suffix}@example.com`,
      contactPhone: null,
      notes: null,
    });
    await prisma.student.update({
      where: { id: studentId },
      data: { householdId },
    });
  });

  afterAll(async () => {
    const { deleteHousehold } = await import("@/lib/db/households");
    await prisma.student.update({
      where: { id: studentId },
      data: { householdId: null },
    });
    await deleteHousehold(householdId).catch(() => undefined);
  });

  it("issues a household link and resolves access to the whole family", async () => {
    const {
      createHouseholdPortalLink,
      resolvePortalToken,
      getHouseholdPortalChildren,
    } = await import("@/lib/db/portal");

    const link = await createHouseholdPortalLink(householdId, APP_URL);
    expect(link.outcome).toBe("sent");
    if (link.outcome !== "sent") throw new Error("expected sent");
    expect(link.recipient).toBe(`family-${suffix}@example.com`);

    const token = new URL(link.url).searchParams.get("token") ?? "";
    const access = await resolvePortalToken(token);
    expect(access?.householdId).toBe(householdId);
    expect(access?.studentId).toBeNull();

    const children = await getHouseholdPortalChildren(householdId);
    expect(children.some((child) => child.id === studentId)).toBe(true);
  });

  it("does not expose a student id for a household token", async () => {
    const { createHouseholdPortalLink, verifyPortalToken } =
      await import("@/lib/db/portal");
    const link = await createHouseholdPortalLink(householdId, APP_URL);
    if (link.outcome !== "sent") throw new Error("expected sent");
    const token = new URL(link.url).searchParams.get("token") ?? "";
    // The legacy student-only verifier returns null for a household token.
    expect(await verifyPortalToken(token)).toBeNull();
  });
});

describe.skipIf(!hasTestDatabase)("portal self-service", () => {
  it("reads and updates the member's contact details", async () => {
    const link = await createPortalLink(studentId!, APP_URL);
    if (link.outcome !== "sent") throw new Error("expected sent");

    const before = await getPortalContact(studentId!);
    expect(before?.studentId).toBe(studentId);
    expect(before?.email).toBe(`portal-${suffix}@example.com`);

    await updatePortalContact(studentId!, {
      email: `updated-${suffix}@example.com`,
      phone: "0400 000 000",
      addressLine: "1 Mat Street",
      city: "Brisbane",
      state: "QLD",
      postcode: "4000",
      country: "AU",
      emergencyContactName: "Emergency Contact",
      emergencyContactPhone: "0400 111 111",
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
    });

    const after = await getPortalContact(studentId!);
    expect(after?.email).toBe(`updated-${suffix}@example.com`);
    expect(after?.addressLine).toBe("1 Mat Street");
    expect(after?.country).toBe("AU");

    // Restore the original email for later runs.
    await updatePortalContact(studentId!, {
      email: `portal-${suffix}@example.com`,
      phone: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
    });
  });

  it("toggles the email opt-out preference", async () => {
    await updatePortalEmailPreference(studentId!, true);
    expect((await getPortalContact(studentId!))?.emailOptOut).toBe(true);
    await updatePortalEmailPreference(studentId!, false);
    expect((await getPortalContact(studentId!))?.emailOptOut).toBe(false);
  });

  it("authorizes only the students the token grants", async () => {
    const link = await createPortalLink(studentId!, APP_URL);
    if (link.outcome !== "sent") throw new Error("expected sent");
    const token = new URL(link.url).searchParams.get("token") ?? "";

    expect(await portalHasStudent(token, studentId!)).toBe(true);
    // A different student is out of scope for a student token.
    expect(await portalHasStudent(token, guardianOnlyId!)).toBe(false);
    expect(await portalHasStudent("garbage", studentId!)).toBe(false);
  });

  it("lets a household token reach its children", async () => {
    const { createHousehold, deleteHousehold } =
      await import("@/lib/db/households");
    const { createHouseholdPortalLink } = await import("@/lib/db/portal");
    const householdId = await createHousehold({
      name: `Self-serve Family ${suffix}`,
      contactName: "Pat Family",
      contactEmail: `self-family-${suffix}@example.com`,
      contactPhone: null,
      notes: null,
    });
    await prisma.student.update({
      where: { id: studentId },
      data: { householdId },
    });
    try {
      const link = await createHouseholdPortalLink(householdId, APP_URL);
      if (link.outcome !== "sent") throw new Error("expected sent");
      const token = new URL(link.url).searchParams.get("token") ?? "";
      expect(await portalHasStudent(token, studentId!)).toBe(true);
      expect(await portalHasStudent(token, guardianOnlyId!)).toBe(false);
    } finally {
      await prisma.student.update({
        where: { id: studentId },
        data: { householdId: null },
      });
      await deleteHousehold(householdId).catch(() => undefined);
    }
  });
});

describe.skipIf(!hasTestDatabase)("portal belt ordering", () => {
  it("shows the highest-ranked belt when award dates tie", async () => {
    const white = await prisma.beltRangeEntry.create({
      data: {
        disciplineId,
        name: `White ${suffix}`,
        colorHex: "#FFFFFF",
        order: 1,
      },
    });
    const black = await prisma.beltRangeEntry.create({
      data: {
        disciplineId,
        name: `Black ${suffix}`,
        colorHex: "#000000",
        order: 2,
      },
    });
    const tiedDate = new Date("2026-09-25T00:00:00.000Z");
    // Insert the lower rank first so a naive awardedAt-only sort surfaces it.
    await prisma.studentBelt.create({
      data: {
        studentId,
        beltRangeEntryId: white.id,
        beltName: white.name,
        colorHex: white.colorHex,
        awardedAt: tiedDate,
      },
    });
    await prisma.studentBelt.create({
      data: {
        studentId,
        beltRangeEntryId: black.id,
        beltName: black.name,
        colorHex: black.colorHex,
        awardedAt: tiedDate,
      },
    });

    try {
      const student = await getPortalStudent(studentId);
      expect(student?.belts[0]?.beltName).toBe(black.name);
    } finally {
      await prisma.studentBelt.deleteMany({ where: { studentId } });
      await prisma.beltRangeEntry
        .delete({ where: { id: white.id } })
        .catch(() => undefined);
      await prisma.beltRangeEntry
        .delete({ where: { id: black.id } })
        .catch(() => undefined);
    }
  });
});
