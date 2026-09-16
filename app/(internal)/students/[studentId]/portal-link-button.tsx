"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  sendPortalLinkAction,
  type PortalLinkState,
} from "@/lib/actions/portal";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type PortalLinkButtonProps = {
  studentId: string;
  studentName: string;
};

export function PortalLinkButton({
  studentId,
  studentName,
}: PortalLinkButtonProps) {
  const [state, formAction, isPending] = useActionState<
    PortalLinkState,
    FormData
  >(sendPortalLinkAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="studentId" value={studentId} />
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Sending…" : "Send portal link"}
      </Button>
      {state && "error" in state ? (
        <p
          className="text-destructive max-w-xs text-right text-xs"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p className="text-success max-w-xs text-right text-xs" role="status">
          {state.message}
        </p>
      ) : null}
      <span className="text-muted-foreground sr-only">
        Emails {studentName} a member portal magic link
      </span>
    </form>
  );
}
