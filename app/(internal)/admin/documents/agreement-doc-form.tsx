"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Admin.documents.form");
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveAgreementDocumentAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="documentId" value={documentId} />
      <div className="grid gap-2">
        <Label htmlFor={`title-${documentId}`}>{translate("title")}</Label>
        <Input
          id={`title-${documentId}`}
          name="title"
          defaultValue={title}
          maxLength={120}
          className="max-w-md"
        />
        <p className="text-muted-foreground text-xs">
          {translate("titleHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`body-${documentId}`}>{translate("body")}</Label>
        <Textarea
          id={`body-${documentId}`}
          name="bodyMarkdown"
          rows={10}
          defaultValue={bodyMarkdown}
          className="font-mono text-xs"
        />
        <p className="text-muted-foreground text-xs">
          {translate.rich("bodyHint", {
            version: version + 1,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </div>
      {state && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? translate("saving")
            : translate("saveVersion", { version: version + 1 })}
        </Button>
      </div>
    </form>
  );
}

export function AddDocumentForm() {
  const translate = useTranslations("Admin.documents.form");
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveAgreementDocumentAction, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="new-document-title">{translate("title")}</Label>
        <Input
          id="new-document-title"
          name="title"
          required
          maxLength={120}
          placeholder={translate("newTitlePlaceholder")}
          className="max-w-md"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-document-body">{translate("body")}</Label>
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
          {isPending ? translate("adding") : translate("add")}
        </Button>
      </div>
    </form>
  );
}
