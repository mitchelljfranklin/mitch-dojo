"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getClientIp } from "@/lib/client-ip";
import { checkInStudent, getLocationIdByCheckinToken } from "@/lib/db/checkin";
import { rateLimit } from "@/lib/rate-limit";

const CHECKIN_ATTEMPTS_PER_MIN = 20;

// Plain form action (not useActionState) so revalidating the path after a
// successful check-in re-renders the updated roster state.
export async function checkInAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("checkin-action", clientIp, CHECKIN_ATTEMPTS_PER_MIN)) {
    return;
  }

  const locationId = await getLocationIdByCheckinToken(token);
  if (!locationId) return;

  await checkInStudent(locationId, sessionId, studentId);
  revalidatePath(`/checkin/${token}`);
}
