"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  canTransition,
  setTrialStage,
  type TrialStageValue,
} from "@/lib/db/trials";
import { addDays, createInvoice, enrollStudent } from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";

export type ConvertTrialState = { ok: boolean; message: string } | undefined;

const STAGES: TrialStageValue[] = [
  "NEW",
  "CONTACTED",
  "FIRST_CLASS",
  "CONVERTED",
  "LOST",
];

// Plain form action (stage dropdown per pipeline row) — revalidatePath is
// allowed and expected here.
export async function setTrialStageAction(formData: FormData): Promise<void> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const studentId = getField(formData, "studentId");
  const stage = getField(formData, "stage") as TrialStageValue;

  if (!STAGES.includes(stage)) {
    return;
  }

  const current = await prisma.student.findUnique({
    where: { id: studentId },
    select: { trialStage: true },
  });
  if (!current?.trialStage || !canTransition(current.trialStage, stage)) {
    return;
  }

  await setTrialStage(studentId, stage);
  await logAudit(
    user.id,
    AUDIT_ACTIONS.UPDATE_TRIAL_STAGE,
    "Student",
    studentId,
    { from: current.trialStage, to: stage },
  );
  revalidatePath("/trials");
  revalidatePath(`/students/${studentId}`);
}

// Enriched conversion from the pipeline's convert sheet: flips the trial to
// ACTIVE (audit-logged like the dropdown path) and optionally enrolls the
// new member in a plan and creates their first invoice (both require
// memberships:edit; the sheet hides them without it and the action
// re-checks). State-fed action (useActionState): no revalidatePath — the
// client refreshes via useActionFeedback.
export async function convertTrialAction(
  _previousState: ConvertTrialState,
  formData: FormData,
): Promise<ConvertTrialState> {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const studentId = getField(formData, "studentId");
  const planId = getField(formData, "planId");
  const createFirstInvoice = getField(formData, "createFirstInvoice") === "on";

  const current = await prisma.student.findUnique({
    where: { id: studentId },
    select: { trialStage: true },
  });
  if (!current?.trialStage || !canTransition(current.trialStage, "CONVERTED")) {
    return { ok: false, message: "This trial can no longer be converted." };
  }

  const canBill = hasPermission(user.permissions, PERMISSIONS.MEMBERSHIPS_EDIT);
  const usePlan = canBill && planId.length > 0;
  const createInvoiceNow = canBill && usePlan && createFirstInvoice;

  if (usePlan) {
    try {
      const enrollments = await enrollStudent({
        studentId,
        planId,
        startDate: new Date(),
      });
      if (enrollments.outcome === "created") {
        await logAudit(
          user.id,
          AUDIT_ACTIONS.CREATE_ENROLLMENT,
          "Enrollment",
          studentId,
        );
      }
      if (createInvoiceNow && enrollments.outcome === "created") {
        const settings = await getMembershipsSettings();
        const issueDate = new Date();
        const invoice = await createInvoice({
          studentId,
          planId,
          issueDate,
          dueDate: addDays(issueDate, settings.invoiceDueDays),
          notes: "First invoice — created on trial conversion.",
          createdById: user.id,
        });
        await logAudit(
          user.id,
          AUDIT_ACTIONS.CREATE_INVOICE,
          "Invoice",
          invoice.id,
        );
      }
    } catch {
      await setTrialStage(studentId, "CONVERTED");
      await logAudit(
        user.id,
        AUDIT_ACTIONS.UPDATE_TRIAL_STAGE,
        "Student",
        studentId,
        { from: current.trialStage, to: "CONVERTED" },
      );
      return {
        ok: false,
        message:
          "Converted, but the enrollment or invoice failed — enroll and bill manually from the student record.",
      };
    }
  }

  await setTrialStage(studentId, "CONVERTED");
  await logAudit(
    user.id,
    AUDIT_ACTIONS.UPDATE_TRIAL_STAGE,
    "Student",
    studentId,
    { from: current.trialStage, to: "CONVERTED" },
  );

  return {
    ok: true,
    message: createInvoiceNow
      ? "Trial converted, enrolled, and first invoice created."
      : usePlan
        ? "Trial converted and enrolled."
        : "Trial converted.",
  };
}
