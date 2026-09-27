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
  updateHouseholdAction,
  type HouseholdActionState,
} from "@/lib/actions/households";

export function EditHouseholdSheet({
  household,
}: {
  household: {
    id: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    HouseholdActionState,
    FormData
  >(updateHouseholdAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit household</SheetTitle>
            <SheetDescription>
              Update the family contact. Blank guardian details on a member are
              inherited from here.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="householdId" value={household.id} />
            <div className="grid gap-2">
              <Label htmlFor="edit-household-name">Household name *</Label>
              <Input
                id="edit-household-name"
                name="name"
                required
                maxLength={80}
                defaultValue={household.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-household-contact-name">Contact name</Label>
              <Input
                id="edit-household-contact-name"
                name="contactName"
                maxLength={80}
                defaultValue={household.contactName ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-household-contact-email">
                Contact email
              </Label>
              <Input
                id="edit-household-contact-email"
                name="contactEmail"
                type="email"
                maxLength={120}
                defaultValue={household.contactEmail ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-household-contact-phone">
                Contact phone
              </Label>
              <Input
                id="edit-household-contact-phone"
                name="contactPhone"
                type="tel"
                maxLength={40}
                defaultValue={household.contactPhone ?? ""}
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
                  {isPending ? "Saving..." : "Save changes"}
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
