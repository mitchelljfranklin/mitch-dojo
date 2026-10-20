"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  closeGradingEvent,
  createGradingEvent,
  sendGradingInvites,
  setGradingOutcome,
} from "@/lib/db/gradings";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField, isValidIsoDateString } from "@/lib/utils";

export type GradingActionState =
  { error: string } | { ok: true; message: string } | undefined;

// Create flows that navigate end with redirect() (FlashToast pattern).
export async function createGradingEventAction(
  _previousState: GradingActionState,
  formData: FormData,
): Promise<GradingActionState> {
  const actor = await requirePermission(PERMISSIONS.BELTS_EDIT);
  const translate = await getTranslations("Belts.gradings");
  const disciplineId = getField(formData, "disciplineId");
  const name = getField(formData, "name").trim();
  const date = getField(formData, "date").trim();
  const locationId = getField(formData, "locationId").trim();
  const notes = getField(formData, "notes").trim();

  if (name.length === 0) {
    return { error: translate("errors.nameRequired") };
  }
  if (!isValidIsoDateString(date)) {
    return { error: translate("errors.invalidDate") };
  }

  const { id } = await createGradingEvent({
    disciplineId,
    name,
    date: new Date(date),
    locationId: locationId.length > 0 ? locationId : null,
    notes: notes.length > 0 ? notes : null,
    createdById: actor.id,
  });

  await logAudit(
    actor.id,
    AUDIT_ACTIONS.CREATE_GRADING_EVENT,
    "GradingEvent",
    id,
    { disciplineId },
  );

  redirect(`/belts/${disciplineId}/gradings/${id}?created=1`);
}

export async function recordGradingOutcomeAction(formData: FormData) {
  const actor = await requirePermission(PERMISSIONS.BELTS_EDIT);
  const eventId = getField(formData, "eventId");
  const studentId = getField(formData, "studentId");
  const rawOutcome = getField(formData, "outcome");
  const outcome =
    rawOutcome === "PROMOTED" || rawOutcome === "ABSENT"
      ? rawOutcome
      : "PENDING";

  await setGradingOutcome(eventId, studentId, outcome, actor.id);

  if (outcome === "PROMOTED") {
    await logAudit(
      actor.id,
      AUDIT_ACTIONS.RECORD_PROMOTION,
      "GradingEvent",
      eventId,
      { studentId },
    );
  }
  revalidatePath(`/belts`);
}

export async function closeGradingEventAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const eventId = getField(formData, "eventId");

  await closeGradingEvent(eventId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_GRADING_EVENT,
      "GradingEvent",
      eventId,
      { status: "CLOSED" },
    );
  }
  revalidatePath(`/belts`);
}

export async function sendGradingInvitesAction(formData: FormData) {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const eventId = getField(formData, "eventId");

  const sent = await sendGradingInvites(eventId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.SEND_GRADING_INVITES,
      "GradingEvent",
      eventId,
      { sent },
    );
  }
  revalidatePath(`/belts`);
}
