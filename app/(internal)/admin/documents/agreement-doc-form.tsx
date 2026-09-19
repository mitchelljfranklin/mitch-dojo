"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAgreementDocumentAction } from "../actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type SettingsActionState = { ok: boolean; message: string } | undefined;

type AgreementDocFormProps = {
  documentId: string;
  title: string;
  bodyMarkdown: string;
  version: number;
};

export function AgreementDocForm(props: AgreementDocFormProps) {
  const fingerprint = JSON.stringify(props);
  return <AgreementDocFormInner key={fingerprint} {...props} />;
}

function AgreementDocFormInner({
  documentId,
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
      <input type="hidden" name="documentId" value={documentId} />
      <div className="grid gap-2">
        <Label htmlFor={`title-${documentId}`}>Title</Label>
        <Input
          id={`title-${documentId}`}
          name="title"
          defaultValue={title}
          maxLength={120}
          className="max-w-md"
        />
        <p className="text-muted-foreground text-xs">
          The title is the document&apos;s name everywhere — member portal,
          compliance cards, and printed forms.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`body-${documentId}`}>Document body (Markdown)</Label>
        <Textarea
          id={`body-${documentId}`}
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

export function AddDocumentForm() {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveAgreementDocumentAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="new-document-title">Title</Label>
        <Input
          id="new-document-title"
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Code of conduct"
          className="max-w-md"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-document-body">Document body (Markdown)</Label>
        <Textarea
          id="new-document-body"
          name="bodyMarkdown"
          rows={6}
          required
          className="font-mono text-xs"
        />
      </div>
      {state && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      {state && state.ok ? (
        <p className="text-success text-sm" role="status">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={isPending}
        >
          {isPending ? "Adding…" : "Add document"}
        </Button>
      </div>
    </form>
  );
}
