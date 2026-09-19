"use server";

import { cookies, headers } from "next/headers";

import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import {
  signAgreementViaPortal,
  getAgreementDocumentById,
} from "@/lib/db/agreements";
import { verifyPortalToken } from "@/lib/db/portal";
import { logSystemAudit, AUDIT_ACTIONS } from "@/lib/db/audit";

export type PortalSignState = { ok: boolean; message: string } | undefined;

const PORTAL_COOKIE = "portal_token";
const PORTAL_SIGNS_PER_MIN = 10;

// Portal digital signing. The portal token (cookie, set by the portal page)
// authorises the write — no staff user involved. Rate-limited per IP.
export async function signPortalAgreementAction(
  _previousState: PortalSignState,
  formData: FormData,
): Promise<PortalSignState> {
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("portal-sign", clientIp, PORTAL_SIGNS_PER_MIN)) {
    return {
      ok: false,
      message: "Too many attempts — please wait a moment and try again.",
    };
  }

  const cookieStore = await cookies();
  const studentId = await verifyPortalToken(
    cookieStore.get(PORTAL_COOKIE)?.value ?? "",
  );
  if (!studentId) {
    return {
      ok: false,
      message: "Your portal link has expired — ask us for a fresh one.",
    };
  }

  const documentId = String(formData.get("documentId") ?? "");
  const signedByName = String(formData.get("signedByName") ?? "").trim();
  const confirmed = formData.get("confirmed") === "on";
  if (!documentId || !signedByName || !confirmed) {
    return {
      ok: false,
      message:
        "Tick the confirmation and type your name to sign this document.",
    };
  }

  const document = await getAgreementDocumentById(documentId);
  if (!document || !document.enabled) {
    return { ok: false, message: "That document is no longer available." };
  }

  await signAgreementViaPortal({ studentId, documentId, signedByName });
  await logSystemAudit(AUDIT_ACTIONS.RECORD_AGREEMENT, "Student", studentId, {
    documentId,
    method: "PORTAL",
    documentTitle: document.title,
  });

  return { ok: true, message: `Signed — thank you, ${signedByName}.` };
}
