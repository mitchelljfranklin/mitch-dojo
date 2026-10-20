"use client";

import { ActionForm } from "@/components/action-form";
import { useState } from "react";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

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
  currency: string;
};

export function ConvertTrialSheet({
  studentId,
  studentName,
  plans,
  canBill,
  currency,
}: ConvertTrialSheetProps) {
  const translate = useTranslations("Trials.convert");
  const translateMemberships = useTranslations("Memberships");
  const formatter = useFormatter();
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
        {translate("button")}
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
            <SheetTitle>{translate("title", { name: studentName })}</SheetTitle>
            <SheetDescription>{translate("description")}</SheetDescription>
          </SheetHeader>
          <ActionForm action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="studentId" value={studentId} />

            {canBill && plans.length > 0 ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor={`convert-plan-${studentId}`}>
                    {translate("plan")}
                  </Label>
                  <Select
                    name="planId"
                    value={planId}
                    onValueChange={setPlanId}
                  >
                    <SelectTrigger id={`convert-plan-${studentId}`}>
                      <SelectValue placeholder={translate("noEnrollment")} />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} —{" "}
                          {formatter.number(plan.priceCents / 100, {
                            style: "currency",
                            currency,
                          })}
                          {plan.billingPeriod
                            ? translate("periodSuffix", {
                                period: translateMemberships(
                                  `billingPeriod.${plan.billingPeriod}`,
                                ).toLowerCase(),
                              })
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex w-fit items-center gap-2 text-sm">
                  <Checkbox name="createFirstInvoice" disabled={!planId} />
                  {translate("createInvoice")}
                </label>
              </>
            ) : null}

            {canBill && plans.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {translate("noPlans")}
              </p>
            ) : null}

            {state && !state.ok ? (
              <p className="text-destructive text-sm" role="alert">
                {state.message}
              </p>
            ) : null}

            <SheetFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? translate("converting") : translate("submit")}
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
