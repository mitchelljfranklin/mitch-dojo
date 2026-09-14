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
import {
  enrollStudentAction,
  type MembershipActionState,
} from "@/lib/actions/memberships";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type PlanOption = { id: string; name: string; planType: string };

type StudentMembershipsSheetProps = {
  studentId: string;
  plans: PlanOption[];
};

function todayIsoDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function EnrollStudentSheet({
  studentId,
  plans,
}: StudentMembershipsSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(enrollStudentAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Enroll in plan
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Enroll in plan</SheetTitle>
            <SheetDescription>
              Memberships are school-wide — one subscription covers all of the
              student&apos;s training.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="studentId" value={studentId} />
            <div className="grid gap-2">
              <Label htmlFor="enroll-plan">Plan</Label>
              <Select name="planId" required>
                <SelectTrigger id="enroll-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                      {plan.planType === "ITEM" ? " (one-off)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="enroll-start">Start date</Label>
              <Input
                id="enroll-start"
                name="startDate"
                type="date"
                required
                defaultValue={todayIsoDate()}
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
                  {isPending ? "Enrolling..." : "Enroll"}
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
