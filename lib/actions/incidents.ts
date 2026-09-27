"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createIncident,
  deleteIncident,
  setIncidentStatus,
  updateIncident,
} from "@/lib/db/incidents";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { incidentFormSchema } from "@/lib/schemas/incident";

export type IncidentActionState =
  { error: string } | { ok: true; message: string } | undefined;

function parseIncidentInput(formData: FormData) {
  const studentId = getField(formData, "studentId");
  const locationId = getField(formData, "locationId");
  return incidentFormSchema.safeParse({
    title: getField(formData, "title"),
    occurredAt: getField(formData, "occurredAt"),
    studentId: studentId === "none" ? "" : studentId,
    locationId: locationId === "none" ? "" : locationId,
    severity: getField(formData, "severity") || "MINOR",
    description: getField(formData, "description"),
    injuryDescription: getField(formData, "injuryDescription"),
    treatmentGiven: getField(formData, "treatmentGiven"),
    medicalAttentionRequired:
      getField(formData, "medicalAttentionRequired") === "on",
    actionsTaken: getField(formData, "actionsTaken"),
  });
}

export async function createIncidentAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.INCIDENTS_MANAGE);

  const parsed = parseIncidentInput(formData);
  if (!parsed.success) {
    redirect(
      `/incidents?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid input.",
      )}`,
    );
  }

  const user = await getCurrentUser();
  const incident = await createIncident({
    ...parsed.data,
    occurredAt: new Date(`${parsed.data.occurredAt}T00:00:00.000Z`),
    reportedById: user?.id ?? null,
  });

  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_INCIDENT,
      "Incident",
      incident.id,
      { title: parsed.data.title },
    );
  }
  // Create flows that navigate end with a redirect; the target page shows a
  // FlashToast from the search param.
  redirect(`/incidents/${incident.id}?created=1`);
}

export async function updateIncidentAction(
  previousState: IncidentActionState,
  formData: FormData,
): Promise<IncidentActionState> {
  await requirePermission(PERMISSIONS.INCIDENTS_MANAGE);
  const incidentId = getField(formData, "incidentId");

  const parsed = parseIncidentInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await updateIncident(incidentId, {
    ...parsed.data,
    occurredAt: new Date(`${parsed.data.occurredAt}T00:00:00.000Z`),
  });

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_INCIDENT,
      "Incident",
      incidentId,
    );
  }
  // State-fed action — must not revalidatePath (see AGENTS.md).
  return { ok: true, message: "Incident updated." };
}

export async function setIncidentStatusAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.INCIDENTS_MANAGE);
  const incidentId = getField(formData, "incidentId");
  const status = getField(formData, "status") === "CLOSED" ? "CLOSED" : "OPEN";

  await setIncidentStatus(incidentId, status);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      status === "CLOSED"
        ? AUDIT_ACTIONS.CLOSE_INCIDENT
        : AUDIT_ACTIONS.UPDATE_INCIDENT,
      "Incident",
      incidentId,
      { status },
    );
  }
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
}

export async function deleteIncidentAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.INCIDENTS_MANAGE);
  const incidentId = getField(formData, "incidentId");

  await deleteIncident(incidentId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_INCIDENT,
      "Incident",
      incidentId,
    );
  }
  revalidatePath("/incidents");
  redirect("/incidents");
}
