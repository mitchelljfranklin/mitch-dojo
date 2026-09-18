"use client";

import { useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  convertTrialAction,
  type ConvertTrialState,
} from "@/lib/actions/trials";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type PlanOption = {
  id: string;
  name: string;
  planType: string;
  billingPeriod: string | null;
  priceCents: number;
};

type ConvertTrialSheetProps = {
  studentId: string;
  studentName: string;
  plans: PlanOption[];
  canBill: boolean;
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ConvertTrialSheet({
  studentId,
  studentName,
  plans,
  canBill,
}: ConvertTrialSheetProps) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [state, formAction, isPending] = useActionState<
    ConvertTrialState,
    FormData
  >(convertTrialAction, undefined);
  useActionFeedback(state);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Convert
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        {/* Keyed on open state: reopening picks up fresh data after the
            refresh triggered by useActionFeedback. */}
        <SheetContent
          key={open ? "open" : "closed"}
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Convert {studentName}</SheetTitle>
            <SheetDescription>
              Flips the trial to an active member. Optionally enroll them in a
              plan and create the first invoice in the same step.
            </SheetDescription>
          </SheetHeader>
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="studentId" value={studentId} />

            {canBill && plans.length > 0 ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`convert-plan-${studentId}`}>
                    Plan (optional)
                  </Label>
                  <Select
                    name="planId"
                    value={planId}
                    onValueChange={setPlanId}
                  >
                    <SelectTrigger id={`convert-plan-${studentId}`}>
                      <SelectValue placeholder="No enrollment now" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} — {formatPrice(plan.priceCents)}
                          {plan.billingPeriod
                            ? `/${plan.billingPeriod.toLowerCase()}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex w-fit items-center gap-2 text-sm">
                  <Checkbox name="createFirstInvoice" disabled={!planId} />
                  Create the first invoice now (standard due window)
                </label>
              </>
            ) : null}

            {canBill && plans.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No active plans yet — create one under Memberships to enroll on
                conversion.
              </p>
            ) : null}

            {state && !state.ok ? (
              <p className="text-destructive text-sm" role="alert">
                {state.message}
              </p>
            ) : null}

            <SheetFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Converting…" : "Convert trial"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
