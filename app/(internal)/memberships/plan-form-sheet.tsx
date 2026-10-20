"use client";

import { ActionForm } from "@/components/action-form";
import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BILLING_PERIODS } from "@/lib/schemas/membership";

type PlanFormValues = {
  id: string;
  name: string;
  description: string;
  planType: "RECURRING" | "ITEM";
  billingPeriod: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | null;
  price: string;
  isActive: boolean;
  chargeOnlyWithAttendance: boolean;
};

type PlanFormSheetProps =
  | { mode: "create"; currency: string; plan?: undefined }
  | { mode: "edit"; currency: string; plan: PlanFormValues };

export function PlanFormSheet({ mode, currency, plan }: PlanFormSheetProps) {
  const translate = useTranslations("Memberships");
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
        {mode === "create" ? translate("plan.new") : translate("plan.edit")}
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
              {mode === "create"
                ? translate("plan.new")
                : translate("plan.editTitle", { name: plan?.name ?? "" })}
            </SheetTitle>
            <SheetDescription>{translate("plan.description")}</SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            {plan ? (
              <input type="hidden" name="planId" value={plan.id} />
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="plan-name">{translate("plan.name")}</Label>
              <Input
                id="plan-name"
                name="name"
                required
                maxLength={80}
                defaultValue={plan?.name}
                placeholder={translate("plan.namePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-description">
                {translate("plan.descriptionLabel")}
              </Label>
              <Textarea
                id="plan-description"
                name="description"
                maxLength={500}
                rows={2}
                defaultValue={plan?.description}
                placeholder={translate("plan.descriptionPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-type">{translate("plan.type")}</Label>
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
                  <SelectItem value="RECURRING">
                    {translate("planType.recurring")}
                  </SelectItem>
                  <SelectItem value="ITEM">
                    {translate("planType.oneOffItem")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planType === "RECURRING" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="plan-billing-period">
                    {translate("plan.billingPeriod")}
                  </Label>
                  <Select
                    name="billingPeriod"
                    defaultValue={plan?.billingPeriod ?? "MONTHLY"}
                  >
                    <SelectTrigger id="plan-billing-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_PERIODS.map((period) => (
                        <SelectItem key={period} value={period}>
                          {translate(`billingPeriod.${period}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Checkbox
                      name="chargeOnlyWithAttendance"
                      defaultChecked={plan?.chargeOnlyWithAttendance ?? false}
                    />
                    <span className="font-medium">
                      {translate("plan.chargeOnly")}
                    </span>
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {translate("plan.chargeOnlyHint")}
                  </span>
                </label>
              </>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="plan-price">
                {translate("plan.price", { currency })}
              </Label>
              <Input
                id="plan-price"
                name="price"
                required
                inputMode="decimal"
                defaultValue={plan?.price}
                placeholder={translate("plan.pricePlaceholder")}
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
                  {translate("plan.done")}
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? translate("plan.saving")
                    : mode === "create"
                      ? translate("plan.create")
                      : translate("plan.save")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {translate("plan.cancel")}
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
