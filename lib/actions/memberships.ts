"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createMembershipPlan,
  deleteMembershipPlan,
  enrollStudent,
  endEnrollment,
  generateDueInvoices,
  listMembershipPlans,
  pauseEnrollment,
  recordPayment,
  resumeEnrollment,
  setMembershipPlanActive,
  startOfToday,
  updateMembershipPlan,
  voidInvoice,
  createInvoice,
  deletePayment,
} from "@/lib/db/memberships";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getMembershipsSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { getField } from "@/lib/utils";
import {
  enrollmentSchema,
  invoiceSchema,
  membershipPlanSchema,
  paymentSchema,
} from "@/lib/schemas/membership";

export type MembershipActionState =
  { error: string } | { ok: true; message: string } | undefined;

function isUniqueNameError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Unique constraint");
}

// --------------- plans ---------------

function parsePlanInput(formData: FormData) {
  return membershipPlanSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description") ?? "",
    planType: getField(formData, "planType") ?? "RECURRING",
    billingPeriod: getField(formData, "billingPeriod") || undefined,
    price: getField(formData, "price"),
    chargeOnlyWithAttendance:
      getField(formData, "chargeOnlyWithAttendance") === "on",
  });
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function createMembershipPlanAction(
  previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);

  const parsed = parsePlanInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createMembershipPlan({
      name: parsed.data.name,
      description:
        parsed.data.description.length > 0 ? parsed.data.description : null,
      planType: parsed.data.planType,
      billingPeriod:
        parsed.data.planType === "RECURRING"
          ? (parsed.data.billingPeriod ?? null)
          : null,
      priceCents: parsed.data.price,
      chargeOnlyWithAttendance: parsed.data.chargeOnlyWithAttendance,
    });
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: "A plan with that name already exists." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_MEMBERSHIP_PLAN,
      "MembershipPlan",
      parsed.data.name,
    );
  }
  return { ok: true, message: "Plan created." };
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function updateMembershipPlanAction(
  previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const planId = getField(formData, "planId");

  const parsed = parsePlanInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateMembershipPlan(planId, {
      name: parsed.data.name,
      description:
        parsed.data.description.length > 0 ? parsed.data.description : null,
      planType: parsed.data.planType,
      billingPeriod:
        parsed.data.planType === "RECURRING"
          ? (parsed.data.billingPeriod ?? null)
          : null,
      priceCents: parsed.data.price,
      chargeOnlyWithAttendance: parsed.data.chargeOnlyWithAttendance,
    });
  } catch (error: unknown) {
    if (isUniqueNameError(error)) {
      return { error: "A plan with that name already exists." };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_MEMBERSHIP_PLAN,
      "MembershipPlan",
      planId,
    );
  }
  return { ok: true, message: "Plan updated." };
}

export async function toggleMembershipPlanActiveAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const planId = getField(formData, "planId");
  const isActive = getField(formData, "isActive") === "true";

  await setMembershipPlanActive(planId, isActive);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_MEMBERSHIP_PLAN,
      "MembershipPlan",
      planId,
      { isActive },
    );
  }
  revalidatePath("/memberships");
}

export async function deleteMembershipPlanAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const planId = getField(formData, "planId");

  try {
    await deleteMembershipPlan(planId);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("cannot be deleted")) {
      redirect(`/memberships?planError=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_MEMBERSHIP_PLAN,
      "MembershipPlan",
      planId,
    );
  }
  revalidatePath("/memberships");
}

// --------------- enrollments ---------------

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function enrollStudentAction(
  previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);

  const parsed = enrollmentSchema.safeParse({
    studentId: getField(formData, "studentId"),
    planId: getField(formData, "planId"),
    startDate: getField(formData, "startDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let outcome: "created" | "already_enrolled";
  try {
    const result = await enrollStudent({
      studentId: parsed.data.studentId,
      planId: parsed.data.planId,
      startDate: new Date(`${parsed.data.startDate}T00:00:00`),
    });
    outcome = result.outcome;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("no longer exists")) {
      return { error: error.message };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user && outcome === "created") {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.CREATE_ENROLLMENT,
      "Enrollment",
      parsed.data.planId,
      { studentId: parsed.data.studentId },
    );
  }

  return outcome === "created"
    ? { ok: true, message: "Member enrolled." }
    : { ok: true, message: "The student is already enrolled in that plan." };
}

export async function endEnrollmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const enrollmentId = getField(formData, "enrollmentId");

  await endEnrollment(enrollmentId, startOfToday());

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.END_ENROLLMENT,
      "Enrollment",
      enrollmentId,
    );
  }
  revalidatePath("/students");
  revalidatePath("/memberships/invoices");
}

// Plain form actions (no previousState) — revalidatePath is expected.
export async function pauseEnrollmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const enrollmentId = getField(formData, "enrollmentId");
  const studentId = getField(formData, "studentId");
  const reason = getField(formData, "pauseReason").trim();
  const resumeAtRaw = getField(formData, "resumeAt").trim();
  const resumeAt = resumeAtRaw ? new Date(`${resumeAtRaw}T00:00:00`) : null;

  await pauseEnrollment(enrollmentId, {
    reason: reason.length > 0 ? reason : null,
    resumeAt,
  });

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.PAUSE_ENROLLMENT,
      "Enrollment",
      enrollmentId,
      { resumeAt: resumeAtRaw || null },
    );
  }
  revalidatePath(`/students/${studentId}`);
}

export async function resumeEnrollmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const enrollmentId = getField(formData, "enrollmentId");
  const studentId = getField(formData, "studentId");

  await resumeEnrollment(enrollmentId, startOfToday());

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.RESUME_ENROLLMENT,
      "Enrollment",
      enrollmentId,
    );
  }
  revalidatePath(`/students/${studentId}`);
}

// --------------- invoices ---------------

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function createInvoiceAction(
  previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);

  const parsed = invoiceSchema.safeParse({
    studentId: getField(formData, "studentId"),
    planId: getField(formData, "planId"),
    dueDate: getField(formData, "dueDate"),
    notes: getField(formData, "notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Optional location: "SCHOOL_WIDE" is the picker's no-location value.
  const locationRaw = getField(formData, "locationId");
  const locationId =
    locationRaw && locationRaw !== "SCHOOL_WIDE" ? locationRaw : null;
  if (locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) {
      return { error: "That location no longer exists." };
    }
  }

  const invoice = await createInvoice({
    studentId: parsed.data.studentId,
    planId: parsed.data.planId,
    issueDate: startOfToday(),
    dueDate: new Date(`${parsed.data.dueDate}T00:00:00`),
    notes: parsed.data.notes.length > 0 ? parsed.data.notes : null,
    locationId,
    createdById: user.id,
  });

  await logAudit(
    user.id,
    AUDIT_ACTIONS.CREATE_INVOICE,
    "Invoice",
    `#${invoice.number}`,
    { studentId: parsed.data.studentId, planId: parsed.data.planId },
  );
  return { ok: true, message: `Invoice #${invoice.number} created.` };
}

export async function voidInvoiceAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const invoiceId = getField(formData, "invoiceId");

  try {
    await voidInvoice(invoiceId);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("cannot be voided")) {
      redirect(
        `/memberships/invoices/${invoiceId}?invoiceError=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.VOID_INVOICE, "Invoice", invoiceId);
  }
  revalidatePath("/memberships/invoices");
  revalidatePath(`/memberships/invoices/${invoiceId}`);
}

// Feeds useActionState — must not revalidatePath (see AGENTS.md).
export async function recordPaymentAction(
  previousState: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const invoiceId = getField(formData, "invoiceId");

  const parsed = paymentSchema.safeParse({
    amount: getField(formData, "amount"),
    method: getField(formData, "method") ?? "CASH",
    paidAt: getField(formData, "paidAt"),
    reference: getField(formData, "reference") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await recordPayment({
      invoiceId,
      amountCents: parsed.data.amount,
      method: parsed.data.method,
      paidAt: new Date(`${parsed.data.paidAt}T00:00:00`),
      reference:
        parsed.data.reference.length > 0 ? parsed.data.reference : null,
      recordedById: user.id,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Invoice")) {
      return { error: error.message };
    }
    throw error;
  }

  await logAudit(user.id, AUDIT_ACTIONS.RECORD_PAYMENT, "Payment", invoiceId, {
    amountCents: parsed.data.amount,
    method: parsed.data.method,
  });
  return { ok: true, message: "Payment recorded." };
}

export async function deletePaymentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);
  const paymentId = getField(formData, "paymentId");
  const invoiceId = getField(formData, "invoiceId");

  await deletePayment(paymentId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.DELETE_PAYMENT,
      "Payment",
      paymentId,
      { invoiceId },
    );
  }
  revalidatePath(`/memberships/invoices/${invoiceId}`);
  revalidatePath("/memberships/invoices");
}

// --------------- invoice generation (manual run) ---------------

// Feeds useActionState — must not revalidatePath (see AGENTS.md). Lets an
// admin trigger the same generation the scheduler runs without waiting for
// the next tick.
export async function generateInvoicesNowAction(
  previousState: MembershipActionState,
  _formData: FormData,
): Promise<MembershipActionState> {
  const user = await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);

  const { autoGenerateInvoices, invoiceDueDays } =
    await getMembershipsSettings();
  if (!autoGenerateInvoices) {
    return {
      error:
        "Automatic invoice generation is disabled in Settings → Memberships.",
    };
  }

  const { generated, skipped } = await generateDueInvoices(
    new Date(),
    invoiceDueDays,
  );
  await logAudit(
    user.id,
    AUDIT_ACTIONS.GENERATE_INVOICES,
    "Invoice",
    `${generated} invoice(s)`,
    { skipped, reason: skipped > 0 ? "no attendance (gated plans)" : null },
  );

  if (generated === 0 && skipped === 0) {
    return {
      ok: true,
      message: "Nothing to generate — all cycles are current.",
    };
  }
  const parts: string[] = [];
  if (generated > 0) parts.push(`Generated ${generated} invoice(s)`);
  if (skipped > 0) {
    parts.push(
      `skipped ${skipped} cycle(s) with no attendance (attendance-gated plans)`,
    );
  }
  return { ok: true, message: `${parts.join("; ")}.` };
}
