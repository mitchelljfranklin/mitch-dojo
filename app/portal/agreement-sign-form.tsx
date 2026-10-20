"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signPortalAgreementAction } from "./sign-action";

type PortalAgreementSignFormProps = {
  documentId: string;
  documentLabel: string;
};

type PortalSignState = { ok: boolean; message: string } | undefined;

// Digital signing: the member (or guardian) confirms they read the document
// and types their name. The portal token authorises the write. On success
// the form triggers a refresh so the status badges update without a manual
// reload.
export function PortalAgreementSignForm({
  documentId,
  documentLabel,
}: PortalAgreementSignFormProps) {
  const router = useRouter();
  const translate = useTranslations("Portal.sign");
  const [state, formAction, isPending] = useActionState<
    PortalSignState,
    FormData
  >(signPortalAgreementAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="documentId" value={documentId} />
      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="confirmed" required />
        <span>{translate("confirmation")}</span>
      </label>
      <div className="grid gap-2">
        <Label htmlFor={`signer-${documentId}`}>{translate("nameLabel")}</Label>
        <Input
          id={`signer-${documentId}`}
          name="signedByName"
          required
          maxLength={60}
          placeholder={translate("namePlaceholder")}
        />
      </div>
      {state && !state.ok ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? translate("submitting")
            : translate("submit", { document: documentLabel })}
        </Button>
      </div>
    </form>
  );
}
