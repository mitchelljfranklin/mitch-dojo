"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  sendHouseholdPortalLinkAction,
  type PortalLinkState,
} from "@/lib/actions/portal";

// State-fed (no revalidatePath) — toast + refresh via useActionFeedback.
export function SendPortalLinkButton({ householdId }: { householdId: string }) {
  const t = useTranslations("Students.portalLink");
  const [state, formAction, isPending] = useActionState<
    PortalLinkState,
    FormData
  >(sendHouseholdPortalLinkAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="householdId" value={householdId} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
