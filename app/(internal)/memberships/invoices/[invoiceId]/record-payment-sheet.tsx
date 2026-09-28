"use client";

import { ActionForm } from "@/components/action-form";
import { useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  recordPaymentAction,
  type MembershipActionState,
} from "@/lib/actions/memberships";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
} from "@/lib/schemas/membership";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type RecordPaymentSheetProps = {
  currency: string;
  invoiceId: string;
  invoiceNumber: number;
  balanceCents: number;
};

function todayIsoDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function RecordPaymentSheet({
  currency,
  invoiceId,
  invoiceNumber,
  balanceCents,
}: RecordPaymentSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(recordPaymentAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button onClick={() => setOpen(true)}>Record payment</Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Record payment — #{invoiceNumber}</SheetTitle>
            <SheetDescription>
              Outstanding balance: {(balanceCents / 100).toFixed(2)} {currency}
            </SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <div className="grid gap-2">
              <Label htmlFor="payment-amount">Amount ({currency})</Label>
              <Input
                id="payment-amount"
                name="amount"
                required
                inputMode="decimal"
                defaultValue={(balanceCents / 100).toFixed(2)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-method">Method</Label>
              <Select name="method" defaultValue="CASH">
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-date">Payment date</Label>
              <Input
                id="payment-date"
                name="paidAt"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                name="reference"
                maxLength={120}
                placeholder="Optional — e.g. bank transfer reference"
              />
            </div>
            {state && "error" in state ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
            {saved && state && "message" in state ? (
              <p className="text-success text-sm" role="status">
                {state.message}
              </p>
            ) : null}
            <SheetFooter>
              {saved ? (
                <Button type="button" onClick={() => setOpen(false)}>
                  Done
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Recording..." : "Record payment"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
