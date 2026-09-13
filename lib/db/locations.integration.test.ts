import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
} from "@/lib/db/locations";

// Integration suite: requires TEST_DATABASE_URL (see vitest.setup.ts);
// a bare `npm run test` without a database skips it.
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Date.now().toString(36);
const createdIds: string[] = [];

beforeAll(async () => {
  await prisma.studentLocation.deleteMany({});
});

afterAll(async () => {
  await prisma.studentLocation.deleteMany({});
  for (const id of createdIds) {
    await prisma.location.deleteMany({ where: { id } });
  }
  await prisma.$disconnect();
});

describe.skipIf(!hasTestDatabase)("locations data layer", () => {
  it("creates and lists locations ordered by sort order then name", async () => {
    const second = await createLocation({
      name: `B Dojo ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 1,
    });
    const first = await createLocation({
      name: `A Dojo ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 0,
    });
    createdIds.push(second.id, first.id);

    const names = (await listLocations()).map((location) => location.name);
    expect(names.indexOf(`A Dojo ${suffix}`)).toBeLessThan(
      names.indexOf(`B Dojo ${suffix}`),
    );
  });

  it("updates a location", async () => {
    const location = await createLocation({
      name: `Updatable ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 0,
    });
    createdIds.push(location.id);

    const updated = await updateLocation(location.id, {
      name: `Renamed ${suffix}`,
      address: "1 Dojo St",
      phone: null,
      email: null,
      isActive: false,
      sortOrder: 5,
    });
    expect(updated.name).toBe(`Renamed ${suffix}`);
    expect(updated.isActive).toBe(false);
    expect(updated.address).toBe("1 Dojo St");
  });

  it("refuses to delete a location that has students", async () => {
    const location = await createLocation({
      name: `Occupied ${suffix}`,
      address: null,
      phone: null,
      email: null,
      isActive: true,
      sortOrder: 0,
    });
    createdIds.push(location.id);

    const student = await prisma.student.create({
      data: { firstName: "Occupant", lastName: "Student" },
    });

    // Link via createStudent-equivalent path
    await prisma.studentLocation.create({
      data: { studentId: student.id, locationId: location.id },
    });

    await expect(deleteLocation(location.id)).rejects.toThrow(/deactivate/i);

    await prisma.student.delete({ where: { id: student.id } });
    await deleteLocation(location.id);
    const index = createdIds.indexOf(location.id);
    if (index >= 0) createdIds.splice(index, 1);
  });
});
