"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createCourse, deleteCourse, updateCourse } from "@/lib/db/courses";
import { setSessionStatus } from "@/lib/db/sessions";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { courseFormSchema } from "@/lib/schemas/course";
import { Prisma } from "../../prisma/generated/prisma/client";

export type CourseFormState =
  { error: string } | { ok: true; message: string } | undefined;

function parseCourseInput(formData: FormData) {
  const rawSlots: {
    weekday: string;
    startTime: string;
    endTime: string;
    trialBookable: boolean;
    capacity: string;
  }[] = [];
  const weekdays = formData.getAll("slotWeekday").map(String);
  const starts = formData.getAll("slotStartTime").map(String);
  const ends = formData.getAll("slotEndTime").map(String);
  const trialBookable = formData.getAll("slotTrialBookable").map(String);
  const capacities = formData.getAll("slotCapacity").map(String);
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    if (!starts[i] && !ends[i]) continue;
    rawSlots.push({
      weekday: weekdays[i] ?? "",
      startTime: starts[i] ?? "",
      endTime: ends[i] ?? "",
      // Radix checkboxes post no native value; the hidden twin posts
      // "on"/"off" per row. "off" (or absent) means opted out.
      trialBookable: trialBookable[i] === "on",
      capacity: capacities[i] ?? "",
    });
  }

  // Identical repeated rows collapse; conflicting rows (same day + start,
  // different end) are left for the schema/DB to reject with a clear error.
  const seenSlots = new Set<string>();
  const slots = rawSlots.filter((slot) => {
    const key = `${slot.weekday}|${slot.startTime}|${slot.endTime}`;
    if (seenSlots.has(key)) return false;
    seenSlots.add(key);
    return true;
  });

  return courseFormSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
    locationId: getField(formData, "locationId"),
    disciplineId: getField(formData, "disciplineId"),
    trainerId: getField(formData, "trainerId"),
    isActive: getField(formData, "isActive") === "on",
    trainingTimes: slots,
  });
}

function isDuplicateSlotError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createCourseAction(
  previousState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);

  const parsed = parseCourseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let courseId: string;
  try {
    courseId = await createCourse(parsed.data);
  } catch (error: unknown) {
    if (isDuplicateSlotError(error)) {
      return {
        error: "A weekly slot with that day and start time already exists.",
      };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.CREATE_COURSE, "Course", courseId);
  }
  // No revalidatePath: this feeds useActionState — the redirect target is
  // force-dynamic (see AGENTS.md).
  redirect(`/classes/${courseId}?created=1`);
}

export async function updateCourseAction(
  previousState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const courseId = getField(formData, "courseId");

  const parsed = parseCourseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCourse(courseId, parsed.data);
  } catch (error: unknown) {
    if (isDuplicateSlotError(error)) {
      return {
        error: "A weekly slot with that day and start time already exists.",
      };
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_COURSE, "Course", courseId);
  }
  // No revalidatePath: this feeds useActionState — the client refreshes via
  // useActionFeedback (see AGENTS.md).
  return { ok: true, message: "Course updated." };
}

export async function deleteCourseAction(formData: FormData) {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const courseId = getField(formData, "courseId");

  await deleteCourse(courseId);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.DELETE_COURSE, "Course", courseId);
  }
  redirect("/classes");
}

export async function setSessionStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const sessionId = getField(formData, "sessionId");
  const courseId = getField(formData, "courseId");
  const status =
    getField(formData, "status") === "CANCELLED" ? "CANCELLED" : "SCHEDULED";

  await setSessionStatus(sessionId, status);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SESSION_STATUS,
      "Course",
      courseId,
      {
        sessionId,
        status,
      },
    );
  }
  revalidatePath(`/classes/${courseId}`);
}
