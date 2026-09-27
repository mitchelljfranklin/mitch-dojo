"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getClientIp } from "@/lib/client-ip";
import { checkInStudent, getLocationIdByCheckinToken } from "@/lib/db/checkin";
import { rateLimit } from "@/lib/rate-limit";

const CHECKIN_ATTEMPTS_PER_MIN = 20;

// Plain form action (not useActionState) so revalidating the path after a
// successful check-in re-renders the updated roster state. A suspended
// membership redirects back with an error flag the page displays.
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

  const outcome = await checkInStudent(locationId, sessionId, studentId);
  if (outcome === "suspended") {
    redirect(`/checkin/${token}?error=suspended`);
  }
  if (outcome === "agreements") {
    redirect(`/checkin/${token}?error=agreements`);
  }
  revalidatePath(`/checkin/${token}`);
}
