"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMembershipsSettings } from "./actions";

type MembershipsFormProps = {
  currency: string;
  invoiceDueDays: number;
  suspendAfterOverdueDays: number;
  autoGenerateInvoices: boolean;
};

type SettingsActionState = { ok: boolean; message: string } | undefined;

export function MembershipsForm({
  currency,
  invoiceDueDays,
  suspendAfterOverdueDays,
  autoGenerateInvoices,
}: MembershipsFormProps) {
  const [state, formAction, isPending] = useActionState<
    SettingsActionState,
    FormData
  >(saveMembershipsSettings, undefined);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          name="currency"
          defaultValue={currency}
          maxLength={3}
          placeholder="e.g. USD, EUR, GBP"
        />
        <p className="text-muted-foreground text-xs">
          ISO 4217 code used to display plan prices and invoice totals.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="invoiceDueDays">Invoice due days</Label>
        <Input
          id="invoiceDueDays"
          name="invoiceDueDays"
          type="number"
          min={0}
          max={90}
          defaultValue={invoiceDueDays}
        />
        <p className="text-muted-foreground text-xs">
          Generated invoices are due this many days after issue.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="suspendAfterOverdueDays">
          Suspend check-in after overdue days
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
          Members with an unpaid invoice this many days past due cannot use QR
          check-in. Set 0 to never suspend.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Invoice generation</Label>
        <p className="text-muted-foreground text-xs">
          The scheduler creates invoices at the start of each billing cycle.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            name="autoGenerateInvoices"
            defaultChecked={autoGenerateInvoices}
          />
          Generate recurring invoices automatically
        </label>
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
          {isPending ? "Saving..." : "Save membership settings"}
        </Button>
      </div>
    </form>
  );
}
