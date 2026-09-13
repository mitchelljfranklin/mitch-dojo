import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  setStudentLocations,
  updateStudent,
} from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { prisma as db } from "@/lib/prisma";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts);
// a bare `npm run test` without a database skips it.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

async function makeLocation(name: string) {
  return createLocation({
    name: `${name} ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 0,
  });
}

let mainDojoId: string;
let northDojoId: string;

beforeAll(async () => {
  await db.attachment.deleteMany({ where: { entityType: "Student" } });
  await db.studentLocation.deleteMany({});
  await db.student.deleteMany({});
  const main = await makeLocation("Main Dojo");
  const north = await makeLocation("North Dojo");
  mainDojoId = main.id;
  northDojoId = north.id;
});

afterAll(async () => {
  await db.attachment.deleteMany({ where: { entityType: "Student" } });
  await db.studentLocation.deleteMany({});
  await db.student.deleteMany({});
  await deleteLocation(mainDojoId).catch(() => undefined);
  await deleteLocation(northDojoId).catch(() => undefined);
  await db.$disconnect();
});

describe.skipIf(!hasTestDatabase)("students data layer", () => {
  it("creates a student with locations and a single primary", async () => {
    const studentId = await createStudent({
      firstName: "Aiko",
      lastName: "Tanaka",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId, northDojoId],
      primaryLocationId: mainDojoId,
    });

    const student = await getStudent(studentId);
    expect(student).not.toBeNull();
    expect(student?.locations).toHaveLength(2);
    const primaryLinks = student!.locations.filter((link) => link.isPrimary);
    expect(primaryLinks).toHaveLength(1);
    expect(primaryLinks[0]!.locationId).toBe(mainDojoId);
  });

  it("rejects a primary location that is not assigned", async () => {
    await expect(
      setStudentLocations("nonexistent", [mainDojoId], northDojoId),
    ).rejects.toThrow();
  });

  it("updates locations while keeping exactly one primary", async () => {
    const studentId = await createStudent({
      firstName: "Kenji",
      lastName: "Sato",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      status: "TRIAL",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
    });

    await updateStudent(studentId, {
      firstName: "Kenji",
      lastName: "Sato",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId, northDojoId],
      primaryLocationId: northDojoId,
    });

    const student = await getStudent(studentId);
    expect(student!.locations).toHaveLength(2);
    const primary = student!.locations.find((link) => link.isPrimary);
    expect(primary?.locationId).toBe(northDojoId);
  });

  it("lists students filtered by location and search", async () => {
    const mainOnly = await createStudent({
      firstName: "Hiro",
      lastName: "Yamada",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
    });
    const onlyNorth = await createStudent({
      firstName: "Mei",
      lastName: "Watanabe",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [northDojoId],
      primaryLocationId: northDojoId,
    });

    const byLocation = await listStudents({ locationId: northDojoId });
    const northIds = byLocation.students.map((student) => student.id);
    expect(northIds).toContain(onlyNorth);
    expect(northIds).not.toContain(mainOnly);

    const byQuery = await listStudents({ query: "Mei" });
    expect(byQuery.students.some((student) => student.id === onlyNorth)).toBe(
      true,
    );

    const primaryNames = byLocation.students.find(
      (student) => student.id === onlyNorth,
    )?.primaryLocationName;
    expect(primaryNames).toContain("North Dojo");
  });

  it("deletes a student and cascades location links", async () => {
    const studentId = await createStudent({
      firstName: "Temp",
      lastName: "Student",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      status: "TRIAL",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
    });

    await deleteStudent(studentId);
    expect(await getStudent(studentId)).toBeNull();
    const links = await db.studentLocation.findMany({
      where: { studentId },
    });
    expect(links).toHaveLength(0);
  });
});
