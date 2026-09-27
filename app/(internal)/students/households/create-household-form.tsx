"use client";

import { useState } from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  createHouseholdAction,
  type HouseholdActionState,
} from "@/lib/actions/households";

export function CreateHouseholdSheet() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    HouseholdActionState,
    FormData
  >(createHouseholdAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button onClick={() => setOpen(true)}>New household</Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New household</SheetTitle>
            <SheetDescription>
              Group siblings under one family contact. Assign students to it
              from their edit form.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="household-name">Household name *</Label>
              <Input
                id="household-name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. The Smiths"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-contact-name">Contact name</Label>
              <Input
                id="household-contact-name"
                name="contactName"
                maxLength={80}
                placeholder="Parent / guardian"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-contact-email">Contact email</Label>
              <Input
                id="household-contact-email"
                name="contactEmail"
                type="email"
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="household-contact-phone">Contact phone</Label>
              <Input
                id="household-contact-phone"
                name="contactPhone"
                type="tel"
                maxLength={40}
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
                  {isPending ? "Creating..." : "Create household"}
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
