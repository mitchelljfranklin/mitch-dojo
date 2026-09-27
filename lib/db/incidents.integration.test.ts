import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import {
  countOpenIncidents,
  createIncident,
  deleteIncident,
  getIncidentDetail,
  listIncidentFormOptions,
  listIncidents,
  listStudentIncidents,
  setIncidentStatus,
  updateIncident,
} from "@/lib/db/incidents";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let studentId: string;
let incidentId: string;

beforeAll(async () => {
  if (!hasTestDatabase) return;
  const location = await createLocation({
    name: `Incident Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 75,
  });
  locationId = location.id;
  studentId = await createStudent({
    firstName: "Incident",
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
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [],
  });
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  if (incidentId) {
    await prisma.incident
      .delete({ where: { id: incidentId } })
      .catch(() => undefined);
  }
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("incidents", () => {
  it("creates an incident and reads it back", async () => {
    const created = await createIncident({
      title: `Sprain ${suffix}`,
      occurredAt: new Date("2026-09-01T00:00:00.000Z"),
      studentId,
      locationId,
      severity: "MODERATE",
      description: "Landed awkwardly during sparring.",
      injuryDescription: "Swollen ankle",
      treatmentGiven: "Ice and elevation",
      medicalAttentionRequired: false,
      actionsTaken: null,
      reportedById: null,
    });
    incidentId = created.id;

    const detail = await getIncidentDetail(incidentId);
    expect(detail?.title).toBe(`Sprain ${suffix}`);
    expect(detail?.severity).toBe("MODERATE");
    expect(detail?.status).toBe("OPEN");
    expect(detail?.studentName).toBe(`Incident Kid${suffix}`);
    expect(detail?.locationName).toBe(`Incident Dojo ${suffix}`);
    expect(detail?.closedAt).toBeNull();
  });

  it("lists incidents and student/form options", async () => {
    const all = await listIncidents();
    expect(all.some((row) => row.id === incidentId)).toBe(true);

    const mine = await listStudentIncidents(studentId);
    expect(mine.some((row) => row.id === incidentId)).toBe(true);

    const options = await listIncidentFormOptions();
    expect(options.students.some((s) => s.id === studentId)).toBe(true);
    expect(options.locations.some((l) => l.id === locationId)).toBe(true);
  });

  it("updates the report", async () => {
    await updateIncident(incidentId, {
      title: `Wrist sprain ${suffix}`,
      occurredAt: new Date("2026-09-02T00:00:00.000Z"),
      studentId,
      locationId,
      severity: "SERIOUS",
      description: "Updated description.",
      injuryDescription: null,
      treatmentGiven: null,
      medicalAttentionRequired: true,
      actionsTaken: "Referred to doctor",
    });
    const detail = await getIncidentDetail(incidentId);
    expect(detail?.title).toBe(`Wrist sprain ${suffix}`);
    expect(detail?.severity).toBe("SERIOUS");
    expect(detail?.medicalAttentionRequired).toBe(true);
  });

  it("closes, reopens, counts, and filters", async () => {
    await setIncidentStatus(incidentId, "CLOSED");
    let detail = await getIncidentDetail(incidentId);
    expect(detail?.status).toBe("CLOSED");
    expect(detail?.closedAt).not.toBeNull();

    const closed = await listIncidents({ status: "CLOSED" });
    expect(closed.some((row) => row.id === incidentId)).toBe(true);
    const open = await listIncidents({ status: "OPEN" });
    expect(open.some((row) => row.id === incidentId)).toBe(false);

    const openCountBefore = await countOpenIncidents();
    await setIncidentStatus(incidentId, "OPEN");
    detail = await getIncidentDetail(incidentId);
    expect(detail?.status).toBe("OPEN");
    expect(detail?.closedAt).toBeNull();
    expect(await countOpenIncidents()).toBe(openCountBefore + 1);
  });

  it("deletes the report", async () => {
    await deleteIncident(incidentId);
    expect(await getIncidentDetail(incidentId)).toBeNull();
    incidentId = "";
  });
});
