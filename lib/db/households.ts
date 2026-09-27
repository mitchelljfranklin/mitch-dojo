import { prisma } from "@/lib/prisma";

// A family grouping — siblings share a household and its contact details.
// Purely organisational; invoices stay per student.
export type HouseholdInput = {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
};

export async function listHouseholds() {
  const households = await prisma.household.findMany({
    orderBy: { name: "asc" },
    include: {
      students: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  return households.map((household) => ({
    id: household.id,
    name: household.name,
    contactName: household.contactName,
    contactEmail: household.contactEmail,
    contactPhone: household.contactPhone,
    notes: household.notes,
    members: household.students,
  }));
}

export function listHouseholdOptions() {
  return prisma.household.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createHousehold(input: HouseholdInput): Promise<string> {
  const household = await prisma.household.create({
    data: input,
    select: { id: true },
  });
  return household.id;
}

export async function updateHousehold(
  id: string,
  input: HouseholdInput,
): Promise<void> {
  await prisma.household.update({ where: { id }, data: input });
}

export async function deleteHousehold(id: string): Promise<void> {
  // Students keep their record — the FK sets householdId null.
  await prisma.household.delete({ where: { id } });
}

// The household a student belongs to, for the record card (members + contact).
export async function getStudentHousehold(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      household: {
        include: {
          students: {
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  return student?.household ?? null;
}
