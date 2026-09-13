"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/lib/db/locations";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { locationSchema } from "@/lib/schemas/location";
import { Prisma } from "../../prisma/generated/prisma/client";

export type LocationActionState =
  { error: string } | { ok: true; message: string } | undefined;

function isUniqueNameError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseLocationInput(formData: FormData) {
  return locationSchema.safeParse({
    name: getField(formData, "name"),
    address: getField(formData, "address"),
    phone: getField(formData, "phone"),
    email: getField(formData, "email"),
    isActive: getField(formData, "isActive") === "on",
    sortOrder: getField(formData, "sortOrder") || "0",
  });
}

export async function createLocationAction(
  previousState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  await requirePermission(PERMISSIONS.LOCATIONS_EDIT);

  const parsed = parseLocationInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createLocation(parsed.data);
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: "A location with this name already exists." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_LOCATION,
      "Location",
      parsed.data.name,
    );
  }
  revalidatePath("/settings");
  return { ok: true, message: "Location created." };
}

export async function updateLocationAction(
  previousState: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  await requirePermission(PERMISSIONS.LOCATIONS_EDIT);
  const locationId = getField(formData, "locationId");

  const parsed = parseLocationInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateLocation(locationId, parsed.data);
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: "A location with this name already exists." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_LOCATION,
      "Location",
      locationId,
    );
  }
  revalidatePath("/settings");
  return { ok: true, message: "Location updated." };
}

export async function deleteLocationAction(formData: FormData) {
  await requirePermission(PERMISSIONS.LOCATIONS_EDIT);
  const locationId = getField(formData, "locationId");

  try {
    await deleteLocation(locationId);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("This location")) {
      redirect(
        `/settings?tab=locations&locationError=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_LOCATION,
      "Location",
      locationId,
    );
  }
  revalidatePath("/settings");
}
