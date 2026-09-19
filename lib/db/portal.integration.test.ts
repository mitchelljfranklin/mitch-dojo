import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createMembershipPlan } from "@/lib/db/memberships";
import {
  createPortalLink,
  getPortalAttendance,
  getPortalInvoices,
  getPortalUpcomingSessions,
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
