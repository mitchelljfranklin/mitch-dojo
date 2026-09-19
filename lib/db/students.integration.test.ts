import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  bulkAssignDisciplines,
  createStudent,
  deleteStudent,
  exportAllStudents,
  getStudent,
  listStudents,
  setStudentLocations,
  updateStudent,
} from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { getDisciplineProgress } from "@/lib/db/belts";
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
let karateId: string;
let jujitsuId: string;

beforeAll(async () => {
  await db.attachment.deleteMany({ where: { entityType: "Student" } });
  await db.studentLocation.deleteMany({});
  await db.student.deleteMany({});
  const main = await makeLocation("Main Dojo");
  const north = await makeLocation("North Dojo");
  mainDojoId = main.id;
  northDojoId = north.id;

  const karate = await db.discipline.upsert({
    where: { name: `Karate ${suffix}` },
    update: {},
    create: { name: `Karate ${suffix}` },
  });
  const jujitsu = await db.discipline.upsert({
    where: { name: `Jujitsu ${suffix}` },
    update: {},
    create: { name: `Jujitsu ${suffix}` },
  });
  karateId = karate.id;
  jujitsuId = jujitsu.id;
});

afterAll(async () => {
  await db.attachment.deleteMany({ where: { entityType: "Student" } });
  await db.studentLocation.deleteMany({});
  await db.student.deleteMany({});
  await db.discipline
    .deleteMany({ where: { id: { in: [karateId, jujitsuId] } } })
    .catch(() => undefined);
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
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId, northDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [],
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
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "TRIAL",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [],
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
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId, northDojoId],
      primaryLocationId: northDojoId,
      disciplineIds: [],
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
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [],
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
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [northDojoId],
      primaryLocationId: northDojoId,
      disciplineIds: [],
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
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "TRIAL",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId],
    });

    await deleteStudent(studentId);
    expect(await getStudent(studentId)).toBeNull();
    const links = await db.studentLocation.findMany({
      where: { studentId },
    });
    expect(links).toHaveLength(0);
    const disciplineLinks = await db.studentDiscipline.findMany({
      where: { studentId },
    });
    expect(disciplineLinks).toHaveLength(0);
  });

  it("stores discipline links on create and replaces them on update", async () => {
    const studentId = await createStudent({
      firstName: "Multi",
      lastName: "Artist",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId, jujitsuId],
    });

    const created = await getStudent(studentId);
    expect(
      created!.disciplines.map((link) => link.disciplineId).sort(),
    ).toEqual([karateId, jujitsuId].sort());

    // Update drops Jujitsu — replace-set semantics, same as locations.
    await updateStudent(studentId, {
      firstName: "Multi",
      lastName: "Artist",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId],
    });

    const updated = await getStudent(studentId);
    expect(updated!.disciplines).toHaveLength(1);
    expect(updated!.disciplines[0]!.disciplineId).toBe(karateId);

    await deleteStudent(studentId);
  });

  it("stores address details and includes them in the export", async () => {
    const studentId = await createStudent({
      firstName: "Addressed",
      lastName: `Member${suffix}`,
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: "12 Dojo Lane",
      city: "Testville",
      state: "Test Region",
      postcode: "TE5 7ER",
      country: "AU",
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId],
    });

    const stored = await getStudent(studentId);
    expect(stored?.addressLine).toBe("12 Dojo Lane");
    expect(stored?.city).toBe("Testville");
    expect(stored?.state).toBe("Test Region");
    expect(stored?.postcode).toBe("TE5 7ER");
    expect(stored?.country).toBe("AU");

    const exports = await exportAllStudents();
    const exported = exports.find((row) => row.id === studentId);
    expect(exported?.addressLine).toBe("12 Dojo Lane");
    expect(exported?.city).toBe("Testville");
    expect(exported?.state).toBe("Test Region");
    expect(exported?.postcode).toBe("TE5 7ER");
    expect(exported?.country).toBe("AU");

    // Update clears the address (empty strings normalise to null).
    await updateStudent(studentId, {
      firstName: "Addressed",
      lastName: `Member${suffix}`,
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId],
    });
    const cleared = await getStudent(studentId);
    expect(cleared?.addressLine).toBeNull();

    await deleteStudent(studentId);
  });

  it("progression lists only students linked to the discipline", async () => {
    const linked = await createStudent({
      firstName: "Linked",
      lastName: "Karateka",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId],
    });
    const unlinked = await createStudent({
      firstName: "Only",
      lastName: "Jitsuka",
      email: null,
      phone: null,
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      status: "ACTIVE",
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [jujitsuId],
    });

    const karateProgress = await getDisciplineProgress(karateId);
    const karateIds = karateProgress.rows.map((row) => row.studentId);
    expect(karateIds).toContain(linked);
    expect(karateIds).not.toContain(unlinked);

    const jujitsuProgress = await getDisciplineProgress(jujitsuId);
    const jujitsuIds = jujitsuProgress.rows.map((row) => row.studentId);
    expect(jujitsuIds).toContain(unlinked);
    expect(jujitsuIds).not.toContain(linked);

    await deleteStudent(linked);
    await deleteStudent(unlinked);
  });

  it("bulkAssignDisciplines links pairs once and skips existing ones", async () => {
    const first = await createStudent({
      firstName: "Bulk",
      lastName: `One ${suffix}`,
      email: `bulk-one-${suffix}@example.com`,
      phone: null,
      status: "ACTIVE",
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [karateId],
    });
    const second = await createStudent({
      firstName: "Bulk",
      lastName: `Two ${suffix}`,
      email: `bulk-two-${suffix}@example.com`,
      phone: null,
      status: "ACTIVE",
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      guardianName: null,
      guardianEmail: null,
      guardianPhone: null,
      guardianRelationship: null,
      addressLine: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
      notes: null,
      locationIds: [mainDojoId],
      primaryLocationId: mainDojoId,
      disciplineIds: [],
    });

    const added = await bulkAssignDisciplines(
      [first, second],
      [karateId, jujitsuId],
    );
    // first already trains Karate → only 3 new links (first+Jujitsu,
    // second+Karate, second+Jujitsu)
    expect(added).toBe(3);

    // Re-running the same assignment creates nothing
    const again = await bulkAssignDisciplines(
      [first, second],
      [karateId, jujitsuId],
    );
    expect(again).toBe(0);

    const firstDisciplines = await db.studentDiscipline.findMany({
      where: { studentId: first },
      select: { disciplineId: true },
    });
    const secondDisciplines = await db.studentDiscipline.findMany({
      where: { studentId: second },
      select: { disciplineId: true },
    });
    expect(firstDisciplines).toHaveLength(2);
    expect(secondDisciplines).toHaveLength(2);

    await deleteStudent(first);
    await deleteStudent(second);
  });
});
