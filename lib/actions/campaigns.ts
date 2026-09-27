"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createCampaign } from "@/lib/db/campaigns";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { campaignSchema } from "@/lib/schemas/campaign";

export type CampaignActionState =
  { error: string } | { ok: true; message: string } | undefined;

// Feeds useActionState — no revalidatePath (see AGENTS.md); the client
// refreshes via useActionFeedback.
export async function createCampaignAction(
  _previousState: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const actor = await requirePermission(PERMISSIONS.COMMUNICATIONS_EDIT);

  const parsed = campaignSchema.safeParse({
    subject: getField(formData, "subject"),
    body: getField(formData, "body"),
    audienceType: getField(formData, "audienceType") || "ALL",
    audienceRefId: getField(formData, "audienceRefId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { audienceType } = parsed.data;
  const needsRef =
    audienceType === "LOCATION" ||
    audienceType === "DISCIPLINE" ||
    audienceType === "COURSE";
  if (needsRef && !parsed.data.audienceRefId) {
    return { error: "Choose a target for this audience." };
  }

  const { id, recipientCount, label } = await createCampaign({
    subject: parsed.data.subject,
    body: parsed.data.body,
    audienceType,
    audienceRefId: needsRef ? parsed.data.audienceRefId : null,
    createdById: actor.id,
  });

  await logAudit(actor.id, AUDIT_ACTIONS.CREATE_CAMPAIGN, "EmailCampaign", id, {
    audience: label,
    recipients: recipientCount,
  });

  if (recipientCount === 0) {
    return {
      ok: true,
      message: "Queued — but no reachable recipients matched that audience.",
    };
  }
  return {
    ok: true,
    message: `Queued to ${recipientCount} recipient(s) — sending within a few minutes.`,
  };
}
