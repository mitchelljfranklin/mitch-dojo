import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";

// Server actions import next/navigation (redirect) and next/cache, and gate
// on the auth helpers. Mock those so an action can be exercised directly
// against the test database — this is the action layer the review flagged as
// untested (the medical-PHI gate lives here, not in the schema).
const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
    error.digest = url;
    throw error;
  }),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: async () => ({
    id: "action-test-user",
    permissions: mocks.permissions,
  }),
  getCurrentUser: async () => ({ id: "action-test-user" }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { createStudentAction, updateStudentAction } =
  await import("@/lib/actions/students");

const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);

let locationId: string;
let disciplineId: string;

function baseFields(): Record<string, string> {
  return {
    firstName: "Action",
    lastName: `Kid${suffix}`,
    email: "",
    phone: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: "",
    medicalMedications: "",
    medicalConditions: "",
    medicalInjuries: "",
    addressLine: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    status: "ACTIVE",
    notes: "",
    primaryLocationId: locationId,
  };
}

function toFormData(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append("locationIds", locationId);
  form.append("disciplineIds", disciplineId);
  return form;
}

async function runAction(
  action: (state: undefined, formData: FormData) => Promise<unknown>,
  form: FormData,
) {
  try {
    await action(undefined, form);
  } catch {
    // The success path throws NEXT_REDIRECT; ignore and assert the DB.
  }
}

beforeAll(async () => {
  if (!hasTestDatabase) return;
  const location = await prisma.location.create({
    data: { name: `Action Dojo ${suffix}`, isActive: true, sortOrder: 90 },
  });
  locationId = location.id;
  const discipline = await prisma.discipline.create({
    data: { name: `Action Karate ${suffix}` },
  });
  disciplineId = discipline.id;
});

afterAll(async () => {
  if (!hasTestDatabase) return;
  await prisma.student.deleteMany({
    where: { lastName: { contains: suffix } },
  });
  await prisma.discipline
    .deleteMany({ where: { name: `Action Karate ${suffix}` } })
    .catch(() => undefined);
  await prisma.location
    .deleteMany({ where: { name: `Action Dojo ${suffix}` } })
    .catch(() => undefined);
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("student action medical-PHI gate", () => {
  it("strips submitted PHI on create without students:medical", async () => {
    mocks.permissions = [PERMISSIONS.STUDENTS_CREATE];
    const fields = baseFields();
    fields.firstName = "NoMed";
    fields.medicalMedications = "inhaler";
    fields.medicalConditions = "asthma";
    await runAction(createStudentAction, toFormData(fields));

    const student = await prisma.student.findFirst({
      where: { firstName: "NoMed", lastName: `Kid${suffix}` },
    });
    expect(student).not.toBeNull();
    expect(student?.medicalMedications).toBeNull();
    expect(student?.medicalConditions).toBeNull();
  });

  it("preserves stored PHI when a non-medical editor updates the record", async () => {
    // Seed a student WITH PHI (created with the medical permission).
    mocks.permissions = [
      PERMISSIONS.STUDENTS_CREATE,
      PERMISSIONS.STUDENTS_MEDICAL,
    ];
    const fields = baseFields();
    fields.firstName = "HasMed";
    fields.medicalMedications = "epipen";
    fields.medicalConditions = "allergy";
    await runAction(createStudentAction, toFormData(fields));
    const seeded = await prisma.student.findFirst({
      where: { firstName: "HasMed", lastName: `Kid${suffix}` },
    });
    expect(seeded?.medicalMedications).toBe("epipen");

    // A STUDENTS_EDIT-only user edits an unrelated field; the form renders no
    // medical inputs, so the submission omits them.
    mocks.permissions = [PERMISSIONS.STUDENTS_EDIT];
    const updateFields = baseFields();
    updateFields.phone = "0400 000 000";
    const form = toFormData(updateFields);
    form.append("studentId", seeded!.id);
    await runAction(updateStudentAction, form);

    const after = await prisma.student.findUnique({
      where: { id: seeded!.id },
    });
    expect(after?.phone).toBe("0400 000 000");
    // PHI survived the edit rather than being nulled out.
    expect(after?.medicalMedications).toBe("epipen");
    expect(after?.medicalConditions).toBe("allergy");
  });
});
