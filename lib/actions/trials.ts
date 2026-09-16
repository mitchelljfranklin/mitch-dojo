"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  canTransition,
  setTrialStage,
  type TrialStageValue,
} from "@/lib/db/trials";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";

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
