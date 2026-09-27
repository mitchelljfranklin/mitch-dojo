"use client";

import { useActionState, useState } from "react";

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
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  createGradingEventAction,
  type GradingActionState,
} from "@/lib/actions/gradings";

type NewGradingEventSheetProps = {
  disciplineId: string;
  disciplineName: string;
  locations: { id: string; name: string }[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewGradingEventSheet({
  disciplineId,
  disciplineName,
  locations,
}: NewGradingEventSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    GradingActionState,
    FormData
  >(createGradingEventAction, undefined);
  useActionFeedback(state);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New grading
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New grading — {disciplineName}</SheetTitle>
            <SheetDescription>
              Eligible students are added automatically with their next belt as
              the target.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="disciplineId" value={disciplineId} />
            <div className="grid gap-2">
              <Label htmlFor="grading-name">Name</Label>
              <Input
                id="grading-name"
                name="name"
                required
                maxLength={80}
                defaultValue={`${disciplineName} grading`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grading-date">Date</Label>
              <Input
                id="grading-date"
                name="date"
                type="date"
                required
                defaultValue={todayIso()}
              />
            </div>
            {locations.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="grading-location">Location (optional)</Label>
                <Select name="locationId">
                  <SelectTrigger id="grading-location">
                    <SelectValue placeholder="No location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="grading-notes">Notes (optional)</Label>
              <Textarea id="grading-notes" name="notes" rows={2} />
            </div>
            {state && "error" in state ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
            <SheetFooter className="px-0">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create grading"}
              </Button>
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
