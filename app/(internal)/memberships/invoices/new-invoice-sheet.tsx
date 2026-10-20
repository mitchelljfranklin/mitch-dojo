"use client";

import { ActionForm } from "@/components/action-form";
import { useState } from "react";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

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
  createInvoiceAction,
  type MembershipActionState,
} from "@/lib/actions/memberships";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type PlanOption = {
  id: string;
  name: string;
  planType: string;
  priceCents: number;
};

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type LocationOption = {
  id: string;
  name: string;
};

type NewInvoiceSheetProps = {
  currency: string;
  students: StudentOption[];
  plans: PlanOption[];
  locations: LocationOption[];
};

function todayIsoDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function NewInvoiceSheet({
  currency,
  students,
  plans,
  locations,
}: NewInvoiceSheetProps) {
  const translate = useTranslations("Memberships.invoices.new");
  const formatter = useFormatter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(createInvoiceAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button onClick={() => setOpen(true)}>{translate("button")}</Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{translate("title")}</SheetTitle>
            <SheetDescription>{translate("description")}</SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="invoice-student">{translate("student")}</Label>
              <Select name="studentId" required>
                <SelectTrigger id="invoice-student">
                  <SelectValue placeholder={translate("chooseStudent")} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-plan">{translate("plan")}</Label>
              <Select name="planId" required>
                <SelectTrigger id="invoice-plan">
                  <SelectValue placeholder={translate("choosePlan")} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (
                      {formatter.number(plan.priceCents / 100, {
                        style: "currency",
                        currency,
                      })}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-due">{translate("due")}</Label>
              <Input
                id="invoice-due"
                name="dueDate"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-location">{translate("location")}</Label>
              <Select name="locationId" defaultValue="SCHOOL_WIDE">
                <SelectTrigger id="invoice-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHOOL_WIDE">
                    {translate("schoolWide")}
                  </SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {translate("locationHint")}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-notes">{translate("notes")}</Label>
              <Textarea
                id="invoice-notes"
                name="notes"
                maxLength={500}
                rows={2}
                placeholder={translate("notesPlaceholder")}
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
                  {translate("done")}
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? translate("creating") : translate("create")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {translate("cancel")}
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
