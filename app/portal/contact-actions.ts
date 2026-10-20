"use server";

import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { logSystemAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import {
  portalHasStudent,
  updatePortalContact,
  updatePortalEmailPreference,
} from "@/lib/db/portal";
import {
  portalContactSchema,
  portalPreferencesSchema,
} from "@/lib/schemas/portal";
import { getField } from "@/lib/utils";

export type PortalContactState = { ok: boolean; message: string } | undefined;

const PORTAL_COOKIE = "portal_token";
const PORTAL_WRITES_PER_MIN = 10;

// Shared guard: rate limit, then resolve the token and confirm it grants the
// posted student. Returns the validated studentId or an error state.
async function authorizeStudent(
  formData: FormData,
): Promise<{ studentId: string } | { error: PortalContactState }> {
  const translate = await getTranslations("Portal.contact");
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("portal-write", clientIp, PORTAL_WRITES_PER_MIN)) {
    return {
      error: {
        ok: false,
        message: translate("rateLimited"),
      },
    };
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PORTAL_COOKIE)?.value ?? "";
  const studentId = getField(formData, "studentId");
  if (!studentId || !(await portalHasStudent(rawToken, studentId))) {
    return {
      error: {
        ok: false,
        message: translate("expired"),
      },
    };
  }
  return { studentId };
}

export async function updatePortalContactAction(
  _previousState: PortalContactState,
  formData: FormData,
): Promise<PortalContactState> {
  const translate = await getTranslations("Portal.contact");
  const authorized = await authorizeStudent(formData);
  if ("error" in authorized) return authorized.error;
  const { studentId } = authorized;

  const parsed = portalContactSchema.safeParse({
    email: getField(formData, "email"),
    phone: getField(formData, "phone"),
    addressLine: getField(formData, "addressLine"),
    city: getField(formData, "city"),
    state: getField(formData, "state"),
    postcode: getField(formData, "postcode"),
    country: getField(formData, "country"),
    emergencyContactName: getField(formData, "emergencyContactName"),
    emergencyContactPhone: getField(formData, "emergencyContactPhone"),
    guardianName: getField(formData, "guardianName"),
    guardianEmail: getField(formData, "guardianEmail"),
    guardianPhone: getField(formData, "guardianPhone"),
    guardianRelationship: getField(formData, "guardianRelationship"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: translate("invalid"),
    };
  }

  await updatePortalContact(studentId, parsed.data);
  await logSystemAudit(
    AUDIT_ACTIONS.UPDATE_PORTAL_CONTACT,
    "Student",
    studentId,
    { method: "PORTAL" },
  );
  return { ok: true, message: translate("saved") };
}

export async function updatePortalPreferencesAction(
  _previousState: PortalContactState,
  formData: FormData,
): Promise<PortalContactState> {
  const translate = await getTranslations("Portal.preferences");
  const authorized = await authorizeStudent(formData);
  if ("error" in authorized) return authorized.error;
  const { studentId } = authorized;

  const parsed = portalPreferencesSchema.safeParse({
    emailOptOut: getField(formData, "emailOptOut") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: translate("invalid") };
  }

  await updatePortalEmailPreference(studentId, parsed.data.emailOptOut);
  await logSystemAudit(
    AUDIT_ACTIONS.UPDATE_EMAIL_PREFERENCE,
    "Student",
    studentId,
    { method: "PORTAL", emailOptOut: parsed.data.emailOptOut },
  );
  return { ok: true, message: translate("saved") };
}
