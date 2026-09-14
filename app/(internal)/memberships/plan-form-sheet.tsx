"use client";

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
import { Textarea } from "@/components/ui/textarea";
import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
  type MembershipActionState,
} from "@/lib/actions/memberships";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type PlanFormValues = {
  id: string;
  name: string;
  description: string;
  planType: "RECURRING" | "ITEM";
  billingPeriod: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | null;
  price: string;
  isActive: boolean;
};

type PlanFormSheetProps =
  | { mode: "create"; currency: string; plan?: undefined }
  | { mode: "edit"; currency: string; plan: PlanFormValues };

export function PlanFormSheet({ mode, currency, plan }: PlanFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [planType, setPlanType] = useState<"RECURRING" | "ITEM">(
    plan?.planType ?? "RECURRING",
  );
  const action =
    mode === "create" ? createMembershipPlanAction : updateMembershipPlanAction;
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(action, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button
        size={mode === "create" ? "default" : "sm"}
        variant={mode === "create" ? "default" : "ghost"}
        className={mode === "edit" ? "h-8 px-2 text-xs" : undefined}
        onClick={() => setOpen(true)}
      >
        {mode === "create" ? "New plan" : "Edit"}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {mode === "create" ? "New plan" : `Edit ${plan?.name}`}
            </SheetTitle>
            <SheetDescription>
              Recurring plans generate invoices each cycle. One-off items
              (grading fees, gear) are invoiced manually.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            {plan ? (
              <input type="hidden" name="planId" value={plan.id} />
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                name="name"
                required
                maxLength={80}
                defaultValue={plan?.name}
                placeholder="e.g. Monthly training"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                name="description"
                maxLength={500}
                rows={2}
                defaultValue={plan?.description}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-type">Type</Label>
              <input type="hidden" name="planType" value={planType} />
              <Select
                value={planType}
                onValueChange={(value) => {
                  setPlanType(value as "RECURRING" | "ITEM");
                }}
              >
                <SelectTrigger id="plan-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECURRING">Recurring</SelectItem>
                  <SelectItem value="ITEM">One-off item</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planType === "RECURRING" ? (
              <div className="grid gap-2">
                <Label htmlFor="plan-billing-period">Billing period</Label>
                <Select
                  name="billingPeriod"
                  defaultValue={plan?.billingPeriod ?? "MONTHLY"}
                >
                  <SelectTrigger id="plan-billing-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="plan-price">Price ({currency})</Label>
              <Input
                id="plan-price"
                name="price"
                required
                inputMode="decimal"
                defaultValue={plan?.price}
                placeholder="e.g. 89.50"
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
                  {isPending
                    ? "Saving..."
                    : mode === "create"
                      ? "Create plan"
                      : "Save changes"}
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
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
