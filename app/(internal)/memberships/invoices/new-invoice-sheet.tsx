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

type NewInvoiceSheetProps = {
  currency: string;
  students: StudentOption[];
  plans: PlanOption[];
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
}: NewInvoiceSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(createInvoiceAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button onClick={() => setOpen(true)}>New invoice</Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New invoice</SheetTitle>
            <SheetDescription>
              Bill a plan manually — one-off items or a recurring cycle run
              early.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="invoice-student">Student</Label>
              <Select name="studentId" required>
                <SelectTrigger id="invoice-student">
                  <SelectValue placeholder="Choose a student" />
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
              <Label htmlFor="invoice-plan">Plan</Label>
              <Select name="planId" required>
                <SelectTrigger id="invoice-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({(plan.priceCents / 100).toFixed(2)}{" "}
                      {currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-due">Due date</Label>
              <Input
                id="invoice-due"
                name="dueDate"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-notes">Notes</Label>
              <Textarea
                id="invoice-notes"
                name="notes"
                maxLength={500}
                rows={2}
                placeholder="Optional"
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
                  {isPending ? "Creating..." : "Create invoice"}
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
