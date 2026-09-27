import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent, getStudent } from "@/lib/db/students";
import {
  createHousehold,
  deleteHousehold,
  getStudentHousehold,
  listHouseholds,
} from "@/lib/db/households";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let householdId: string;
let studentId: string;

beforeAll(async () => {
  if (!hasTestDatabase) return;
  householdId = await createHousehold({
    name: `Smiths ${suffix}`,
    contactName: "Pat Smith",
    contactEmail: `smiths-${suffix}@example.com`,
    contactPhone: "0400 111 222",
    notes: null,
  });
  studentId = await createStudent({
    firstName: "Junior",
    lastName: `Smith${suffix}`,
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
    disciplineIds: [],
    householdId,
  });
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await deleteHousehold(householdId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("households", () => {
  it("lists a household with its members", async () => {
    const households = await listHouseholds();
    const household = households.find((row) => row.id === householdId);
    expect(household).toBeDefined();
    expect(household?.contactEmail).toBe(`smiths-${suffix}@example.com`);
    expect(household?.members.some((member) => member.id === studentId)).toBe(
      true,
    );
  });

  it("exposes the household from the student record", async () => {
    const household = await getStudentHousehold(studentId);
    expect(household?.name).toBe(`Smiths ${suffix}`);
    expect(household?.students).toHaveLength(1);
  });

  it("unassigns members when the household is deleted", async () => {
    await deleteHousehold(householdId);
    const student = await getStudent(studentId);
    expect(student?.householdId).toBeNull();
    // Recreate so afterAll has something to clean up if needed.
    householdId = await createHousehold({
      name: `Smiths recreated ${suffix}`,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      notes: null,
    });
  });
});
