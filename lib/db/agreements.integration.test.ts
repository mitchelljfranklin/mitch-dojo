import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createDocumentVersion,
  getStudentAgreementStatuses,
  getStudentAgreementSummary,
  recordStudentSignature,
  signAgreementViaPortal,
  type AgreementTypeValue,
} from "@/lib/db/agreements";
import { createStudent, deleteStudent } from "@/lib/db/students";
import { createLocation, deleteLocation } from "@/lib/db/locations";
import { createDiscipline, deleteDiscipline } from "@/lib/db/belts";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts).
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;
let studentId: string;

beforeAll(async () => {
  const location = await createLocation({
    name: `Agreements Dojo ${suffix}`,
    address: null,
    phone: null,
    email: null,
    isActive: true,
    sortOrder: 70,
  });
  locationId = location.id;
  const discipline = await createDiscipline(`Agreements Karate ${suffix}`);
  disciplineId = discipline.id;
  studentId = await createStudent({
    firstName: "Agreement",
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
    notes: null,
    status: "ACTIVE",
    locationIds: [locationId],
    primaryLocationId: locationId,
    disciplineIds: [disciplineId],
  });
});

afterAll(async () => {
  if (studentId) await deleteStudent(studentId).catch(() => undefined);
  // The versioning tests created CONSENT/SAFETY versions with the suffix —
  // remove them (their signature rows cascade) so other runs stay clean.
  await prisma.agreementDocument.deleteMany({
    where: { bodyMarkdown: { contains: "versioning test" } },
  });
  await prisma.agreementDocument.deleteMany({
    where: { bodyMarkdown: "Updated safety expectations." },
  });
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("agreements", () => {
  it("exposes the three seeded active documents, all unsigned for a new student", async () => {
    const statuses = await getStudentAgreementStatuses(studentId);
    expect(statuses).toHaveLength(3);
    expect(statuses.map((status) => status.type).join(",")).toBe(
      "PRIVACY,CONSENT,SAFETY",
    );
    expect(statuses.every((status) => !status.signed)).toBe(true);
  });

  it("records a staff signature against the active version", async () => {
    const statuses = await getStudentAgreementStatuses(studentId);
    const privacy = statuses.find((status) => status.type === "PRIVACY")!;
    await recordStudentSignature({
      studentId,
      documentId: privacy.documentId,
      signedAt: new Date(),
      signedByName: "Guardian Test",
      recordedById: null,
    });

    const after = await getStudentAgreementStatuses(studentId);
    const privacyAfter = after.find((status) => status.type === "PRIVACY")!;
    expect(privacyAfter.signed).toBe(true);
    expect(privacyAfter.method).toBe("STAFF");
    expect(privacyAfter.signedVersion).toBe(privacyAfter.activeVersion);

    const summary = await getStudentAgreementSummary(studentId);
    expect(summary.signedCount).toBe(1);
    expect(summary.total).toBe(3);
  });

  it("records a portal signature with the typed signer name", async () => {
    const statuses = await getStudentAgreementStatuses(studentId);
    const consent = statuses.find((status) => status.type === "CONSENT")!;
    await signAgreementViaPortal({
      studentId,
      documentId: consent.documentId,
      signedByName: "Portal Signer",
    });

    const after = await getStudentAgreementStatuses(studentId);
    const consentAfter = after.find((status) => status.type === "CONSENT")!;
    expect(consentAfter.signed).toBe(true);
    expect(consentAfter.method).toBe("PORTAL");
    expect(consentAfter.signedByName).toBe("Portal Signer");
  });

  it("reports re-sign required for signatures on an older version", async () => {
    const before = await getStudentAgreementStatuses(studentId);
    const safety = before.find((status) => status.type === "SAFETY")!;
    await recordStudentSignature({
      studentId,
      documentId: safety.documentId,
      signedAt: new Date(),
      signedByName: "Paper Signer",
      recordedById: null,
    });
    await createDocumentVersion({
      type: "SAFETY" as AgreementTypeValue,
      title: `Safety expectations ${suffix}`,
      bodyMarkdown: "Updated safety expectations.",
      createdById: null,
    });

    const after = await getStudentAgreementStatuses(studentId);
    const safetyAfter = after.find((status) => status.type === "SAFETY")!;
    expect(safetyAfter.signed).toBe(false);
    expect(safetyAfter.reSignRequired).toBe(true);
    expect(safetyAfter.signedVersion!).toBeLessThan(safetyAfter.activeVersion);

    const summary = await getStudentAgreementSummary(studentId);
    expect(summary.reSignRequired).toBe(true);
  });
});
