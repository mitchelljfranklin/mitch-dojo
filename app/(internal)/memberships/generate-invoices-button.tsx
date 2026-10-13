"use client";

import { useActionState } from "react";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  generateInvoicesNowAction,
  type MembershipActionState,
} from "@/lib/actions/memberships";

// Manual trigger for the same invoice generation the scheduler runs, so an
// admin doesn't have to wait for the next tick (and can see how many gated
// cycles were skipped for lack of attendance).
export function GenerateInvoicesButton() {
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(generateInvoicesNowAction, undefined);
  useActionFeedback(state);

  return (
    <ActionForm action={formAction}>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Generating…" : "Generate now"}
      </Button>
    </ActionForm>
  );
}
