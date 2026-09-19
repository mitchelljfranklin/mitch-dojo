"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAgreementDocumentAction } from "../actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type AgreementDocFormProps = {
  type: string;
  title: string;
  bodyMarkdown: string;
  version: number;
};

type SettingsActionState = { ok: boolean; message: string } | undefined;

export function AgreementDocForm(props: AgreementDocFormProps) {
  const fingerprint = JSON.stringify(props);
  return <AgreementDocFormInner key={fingerprint} {...props} />;
}

function AgreementDocFormInner({
  type,
  title,
  bodyMarkdown,
  version,
}: AgreementDocFormProps) {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveAgreementDocumentAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-2">
        <Label htmlFor={`title-${type}`}>Title</Label>
        <Input
          id={`title-${type}`}
          name="title"
          defaultValue={title}
          maxLength={120}
          className="max-w-md"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`body-${type}`}>Document body (Markdown)</Label>
        <Textarea
          id={`body-${type}`}
          name="bodyMarkdown"
          rows={10}
          defaultValue={bodyMarkdown}
          className="font-mono text-xs"
        />
        <p className="text-muted-foreground text-xs">
          Saving creates <strong>version {version + 1}</strong> — every member
          must re-sign the new version. The previous version and its signatures
          stay as history.
        </p>
      </div>
      {state && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : `Save as version ${version + 1}`}
        </Button>
      </div>
    </form>
  );
}
