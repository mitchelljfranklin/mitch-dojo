import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createDocument,
  createDocumentVersion,
  getStudentAgreementStatuses,
  getStudentAgreementSummary,
  hasOutstandingAgreements,
  listDocuments,
  listOutstandingAgreements,
  recordStudentSignature,
  setDocumentEnabled,
  signAgreementViaPortal,
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
  // The versioning tests created documents with the suffix — remove them
  // (their signature rows cascade) so other runs stay clean.
  await prisma.agreementDocument.deleteMany({
    where: { title: { contains: suffix } },
  });
  await deleteDiscipline(disciplineId).catch(() => undefined);
  await deleteLocation(locationId).catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("agreements", () => {
  it("seeds the three starter documents, enabled", async () => {
    const statuses = await getStudentAgreementStatuses(studentId);
    // The test DB accumulates documents and version bumps across runs —
    // assert on the seeded starters' presence only (the v0 property is
    // covered by the add-document test).
    const starters = statuses.filter((status) =>
      ["Privacy information notice", "Informed consent", "Safety"].some(
        (title) => status.title.includes(title),
      ),
    );
    expect(starters).toHaveLength(3);
    expect(starters.every((status) => !status.signed)).toBe(true);
  });

  it("adds a new document at version 0 and hides disabled ones", async () => {
    const created = await createDocument({
      title: `Code of conduct ${suffix}`,
      bodyMarkdown: "Be excellent to each other.",
      createdById: null,
    });
    expect(created.version).toBe(0);

    let statuses = await getStudentAgreementStatuses(studentId);
    const mine = statuses.find((status) =>
      status.title.includes(`Code of conduct ${suffix}`),
    );
    expect(mine).toBeDefined();
    expect(mine!.activeVersion).toBe(0);

    // Disabling hides it from the compliance surface
    await setDocumentEnabled(created.id, false);
    statuses = await getStudentAgreementStatuses(studentId);
    expect(
      statuses.find((status) => status.documentId === created.id),
    ).toBeUndefined();
    await setDocumentEnabled(created.id, true);
  });

  it("records a staff signature against the current version", async () => {
    const statuses = await getStudentAgreementStatuses(studentId);
    const privacy = statuses.find((status) =>
      status.title.includes("Privacy"),
    )!;
    await recordStudentSignature({
      studentId,
      documentId: privacy.documentId,
      signedAt: new Date(),
      signedByName: "Guardian Test",
      recordedById: null,
    });

    const after = await getStudentAgreementStatuses(studentId);
    const privacyAfter = after.find((status) =>
      status.title.includes("Privacy"),
    )!;
    expect(privacyAfter.signed).toBe(true);
    expect(privacyAfter.method).toBe("STAFF");
    expect(privacyAfter.signedVersion).toBe(privacyAfter.activeVersion);

    const summary = await getStudentAgreementSummary(studentId);
    expect(summary.signedCount).toBe(1);
    expect(summary.total).toBeGreaterThanOrEqual(3);
  });

  it("records a portal signature with the typed signer name", async () => {
    const statuses = await getStudentAgreementStatuses(studentId);
    const consent = statuses.find((status) =>
      status.title.includes("Informed consent"),
    )!;
    await signAgreementViaPortal({
      studentId,
      documentId: consent.documentId,
      signedByName: "Portal Signer",
    });

    const after = await getStudentAgreementStatuses(studentId);
    const consentAfter = after.find((status) =>
      status.title.includes("Informed consent"),
    )!;
    expect(consentAfter.signed).toBe(true);
    expect(consentAfter.method).toBe("PORTAL");
    expect(consentAfter.signedByName).toBe("Portal Signer");
  });

  it("reports re-sign required when the version moves past a signature", async () => {
    // Use a scratch document — mutating the seeded docs would drift them
    // across runs.
    const scratch = await createDocument({
      title: `Re-sign scratch ${suffix}`,
      bodyMarkdown: "Original body.",
      createdById: null,
    });
    await recordStudentSignature({
      studentId,
      documentId: scratch.id,
      signedAt: new Date(),
      signedByName: "Paper Signer",
      recordedById: null,
    });

    // Editing bumps the version by exactly one (v0 → v1).
    const newVersion = await createDocumentVersion({
      documentId: scratch.id,
      title: `Re-sign scratch ${suffix}`,
      bodyMarkdown: "Updated body.",
      createdById: null,
    });
    expect(newVersion).toBe(1);

    const after = await getStudentAgreementStatuses(studentId);
    const scratchAfter = after.find((status) =>
      status.title.includes(`Re-sign scratch ${suffix}`),
    )!;
    expect(scratchAfter.signed).toBe(false);
    expect(scratchAfter.reSignRequired).toBe(true);
    expect(scratchAfter.signedVersion!).toBeLessThan(
      scratchAfter.activeVersion,
    );

    const summary = await getStudentAgreementSummary(studentId);
    expect(summary.reSignRequired).toBe(true);
  });
});

describe.skipIf(!hasTestDatabase)("outstanding agreements", () => {
  it("lists students with signatures to chase, then clears them", async () => {
    const chaseId = await createStudent({
      firstName: "Chase",
      lastName: `Me${suffix}`,
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
      locationIds: [],
      primaryLocationId: "",
      disciplineIds: [],
    });
    try {
      const enabled = await listDocuments(true);
      expect(enabled.length).toBeGreaterThan(0);

      const report = await listOutstandingAgreements();
      const mine = report.find((row) => row.studentId === chaseId);
      expect(mine).toBeDefined();
      expect(mine!.outstanding).toHaveLength(enabled.length);
      expect(await hasOutstandingAgreements(chaseId)).toBe(true);

      for (const document of enabled) {
        await recordStudentSignature({
          studentId: chaseId,
          documentId: document.id,
          signedAt: new Date(),
          signedByName: "Chase Me",
          recordedById: null,
        });
      }

      const after = await listOutstandingAgreements();
      expect(after.find((row) => row.studentId === chaseId)).toBeUndefined();
      expect(await hasOutstandingAgreements(chaseId)).toBe(false);
    } finally {
      await deleteStudent(chaseId).catch(() => undefined);
    }
  });
});
