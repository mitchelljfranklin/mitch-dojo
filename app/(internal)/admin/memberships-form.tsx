"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMembershipsSettings } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type MembershipsFormProps = {
  currency: string;
  invoiceDueDays: number;
  suspendAfterOverdueDays: number;
  autoGenerateInvoices: boolean;
  taxRatePercent: number;
  taxLabel: string;
  blockCheckinOnOutstandingAgreements: boolean;
};

type SettingsActionState = { ok: boolean; message: string } | undefined;

export function MembershipsForm(props: MembershipsFormProps) {
  const fingerprint = JSON.stringify(props);
  return <MembershipsFormInner key={fingerprint} {...props} />;
}

function MembershipsFormInner({
  currency,
  invoiceDueDays,
  suspendAfterOverdueDays,
  autoGenerateInvoices,
  taxRatePercent,
  taxLabel,
  blockCheckinOnOutstandingAgreements,
}: MembershipsFormProps) {
  const translate = useTranslations("Admin.memberships.form");
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveMembershipsSettings, undefined);
  useActionFeedback(state);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="currency">{translate("currency")}</Label>
        <Input
          id="currency"
          name="currency"
          defaultValue={currency}
          maxLength={3}
          placeholder={translate("currencyPlaceholder")}
        />
        <p className="text-muted-foreground text-xs">
          {translate("currencyHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="invoiceDueDays">{translate("invoiceDueDays")}</Label>
        <Input
          id="invoiceDueDays"
          name="invoiceDueDays"
          type="number"
          min={0}
          max={90}
          defaultValue={invoiceDueDays}
        />
        <p className="text-muted-foreground text-xs">
          {translate("invoiceDueDaysHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="suspendAfterOverdueDays">
          {translate("suspendAfter")}
        </Label>
        <Input
          id="suspendAfterOverdueDays"
          name="suspendAfterOverdueDays"
          type="number"
          min={0}
          max={365}
          defaultValue={suspendAfterOverdueDays}
        />
        <p className="text-muted-foreground text-xs">
          {translate("suspendAfterHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{translate("generationTitle")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("generationHint")}
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="autoGenerateInvoices"
            defaultChecked={autoGenerateInvoices}
          />
          {translate("autoGenerate")}
        </label>
      </div>
      <div className="grid gap-2">
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="blockCheckinOnOutstandingAgreements"
            defaultChecked={blockCheckinOnOutstandingAgreements}
          />
          {translate("blockCheckin")}
        </label>
        <p className="text-muted-foreground text-xs">
          {translate("blockCheckinHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="taxRatePercent">{translate("taxRate")}</Label>
        <Input
          id="taxRatePercent"
          name="taxRatePercent"
          type="number"
          min={0}
          max={100}
          step="0.01"
          defaultValue={taxRatePercent}
        />
        <Label htmlFor="taxLabel">{translate("taxLabel")}</Label>
        <Input
          id="taxLabel"
          name="taxLabel"
          maxLength={20}
          defaultValue={taxLabel}
          placeholder={translate("taxLabelPlaceholder")}
        />
        <p className="text-muted-foreground text-xs">{translate("taxHint")}</p>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </form>
  );
}
