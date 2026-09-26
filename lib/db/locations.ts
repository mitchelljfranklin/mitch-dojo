import { type Location } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { type LocationInput } from "@/lib/schemas/location";

export type LocationWithCounts = Location & {
  _count: { studentLocations: number };
};

export function listLocations(): Promise<Location[]> {
  return prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function listLocationsWithCounts(): Promise<LocationWithCounts[]> {
  return prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { studentLocations: true } } },
  });
}

export function getLocation(id: string): Promise<Location | null> {
  return prisma.location.findUnique({ where: { id } });
}

export function getLocationByName(name: string): Promise<Location | null> {
  return prisma.location.findUnique({ where: { name } });
}

export async function createLocation(input: LocationInput): Promise<Location> {
  return prisma.location.create({ data: input });
}

export async function updateLocation(
  id: string,
  input: LocationInput,
): Promise<Location> {
  return prisma.location.update({ where: { id }, data: input });
}

export async function deleteLocation(id: string): Promise<void> {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: { select: { studentLocations: true, courses: true } },
    },
  });
  if (!location) {
    throw new Error("Location not found.");
  }
  if (location._count.studentLocations > 0) {
    throw new Error(
      "This location has students assigned. Deactivate it instead of deleting.",
    );
  }
  // Courses (and their sessions) reference the location with Restrict, so a
  // delete would fail with a raw FK error — guard it with the same advice.
  if (location._count.courses > 0) {
    throw new Error(
      "This location has courses assigned. Deactivate it instead of deleting.",
    );
  }

  await prisma.location.delete({ where: { id } });
}

export function countActiveLocations(): Promise<number> {
  return prisma.location.count({ where: { isActive: true } });
}

// Locations available for student assignment pickers: active ones first, but
// inactive ones stay selectable so history (imports, edits) never breaks.
export async function listAssignableLocations(): Promise<
  { id: string; name: string; isActive: boolean }[]
> {
  const locations = await prisma.location.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    isActive: location.isActive,
  }));
}

export function buildLocationNameMap(
  locations: Location[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const location of locations) map.set(location.id, location.name);
  return map;
}
