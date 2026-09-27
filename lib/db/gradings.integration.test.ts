import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";
import {
  closeGradingEvent,
  createGradingEvent,
  getGradingEvent,
  listGradingEvents,
  setGradingOutcome,
} from "@/lib/db/gradings";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let disciplineId: string;
let studentId: string;
let eventId: string;

beforeAll(async () => {
  if (!hasTestDatabase) return;
  const discipline = await createDiscipline(`Grading Karate ${suffix}`);
  disciplineId = discipline.id;
  await prisma.beltRangeEntry.createMany({
    data: [
      {
        disciplineId,
        name: "White",
        colorHex: "#FFFFFF",
        order: 0,
        requiredTrainings: 0,
      },
      {
        disciplineId,
        name: "Yellow",
        colorHex: "#FFD700",
        order: 1,
        requiredTrainings: 5,
      },
    ],
  });
  // An unranked active member is eligible for the entry belt (required 0).
  studentId = await createStudent({
    firstName: "Grade",
    lastName: `Kid${suffix}`,
    email: null,
    phone: null,
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    guardianName: null,
    guardianEmail: `grade-${suffix}@example.com`,
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
  if (!hasTestDatabase) return;
  await prisma.gradingEvent.deleteMany({ where: { disciplineId } });
  await prisma.studentBelt.deleteMany({ where: { studentId } });
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await prisma.beltRangeEntry.deleteMany({ where: { disciplineId } });
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("grading events", () => {
  it("snapshots eligible students with their next belt as the target", async () => {
    const { studentCount } = await createGradingEvent({
      disciplineId,
      name: `Autumn grading ${suffix}`,
      date: new Date("2026-10-10"),
      locationId: null,
      notes: null,
      createdById: null,
    });
    expect(studentCount).toBeGreaterThanOrEqual(1);

    const events = await listGradingEvents(disciplineId);
    const event = events.find((row) => row.name === `Autumn grading ${suffix}`);
    expect(event).toBeDefined();
    expect(event?.status).toBe("OPEN");
    eventId = event!.id;

    const detail = await getGradingEvent(eventId);
    const row = detail?.students.find(
      (entry) => entry.student.id === studentId,
    );
    expect(row).toBeDefined();
    expect(row?.targetBeltRangeEntry?.name).toBe("White");
    expect(row?.outcome).toBe("PENDING");
  });

  it("recording a promotion awards the belt once", async () => {
    await setGradingOutcome(eventId, studentId, "PROMOTED", null);

    const belts = await prisma.studentBelt.findMany({ where: { studentId } });
    expect(belts).toHaveLength(1);
    expect(belts[0]?.beltName).toBe("White");

    // Re-setting PROMOTED must not create a second award.
    await setGradingOutcome(eventId, studentId, "PROMOTED", null);
    expect(await prisma.studentBelt.count({ where: { studentId } })).toBe(1);
  });

  it("closes the event", async () => {
    await closeGradingEvent(eventId);
    const detail = await getGradingEvent(eventId);
    expect(detail?.status).toBe("CLOSED");
  });
});
