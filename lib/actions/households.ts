"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createHousehold,
  deleteHousehold,
  updateHousehold,
} from "@/lib/db/households";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";

export type HouseholdActionState =
  { error: string } | { ok: true; message: string } | undefined;

function parseHousehold(formData: FormData) {
  const name = getField(formData, "name").trim();
  const contactName = getField(formData, "contactName").trim();
  const contactEmail = getField(formData, "contactEmail").trim();
  const contactPhone = getField(formData, "contactPhone").trim();
  if (name.length === 0) return null;
  if (contactEmail.length > 0 && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return null;
  }
  return {
    name,
    contactName: contactName || null,
    contactEmail: contactEmail || null,
    contactPhone: contactPhone || null,
    notes: null,
  };
}

export async function createHouseholdAction(
  _previousState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const actor = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const input = parseHousehold(formData);
  if (!input) {
    return { error: "Enter a household name and a valid contact email." };
  }

  const id = await createHousehold(input);
  await logAudit(actor.id, AUDIT_ACTIONS.UPDATE_STUDENT, "Household", id, {
    created: input.name,
  });
  return { ok: true, message: "Household created." };
}

export async function updateHouseholdAction(formData: FormData) {
  const actor = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const householdId = getField(formData, "householdId");
  const input = parseHousehold(formData);
  if (!input) return;

  await updateHousehold(householdId, input);
  await logAudit(
    actor.id,
    AUDIT_ACTIONS.UPDATE_STUDENT,
    "Household",
    householdId,
  );

  revalidatePath("/students/households");
}

export async function deleteHouseholdAction(formData: FormData) {
  const actor = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const householdId = getField(formData, "householdId");

  await deleteHousehold(householdId);
  await logAudit(
    actor.id,
    AUDIT_ACTIONS.UPDATE_STUDENT,
    "Household",
    householdId,
    {
      deleted: true,
    },
  );
  revalidatePath("/students/households");
}
