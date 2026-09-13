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
import { createDisciplineAction } from "@/lib/actions/belts";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type BeltActionState =
  { error: string } | { ok: true; message: string } | undefined;

const initialState: BeltActionState = undefined;

export function AddDisciplineButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(createDisciplineAction, initialState);
  useActionFeedback(state);

  // The sheet stays open after a successful save and shows the success
  // message; closing is an explicit user action (event handler, not a
  // setState-in-effect, which the lint rules forbid).
  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New discipline
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add discipline</SheetTitle>
            <SheetDescription>
              Create a discipline with its own belt ladder (e.g. Karate,
              Jujitsu).
            </SheetDescription>
          </SheetHeader>
          <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
            <div className="grid gap-2">
              <Label htmlFor="discipline-name">Name</Label>
              <Input
                id="discipline-name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. Karate, Jujitsu"
              />
            </div>
            {state && "error" in state ? (
              <p className="text-destructive px-4 text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
            {saved && state && "message" in state ? (
              <p className="text-success px-4 text-sm" role="status">
                {state.message}
              </p>
            ) : null}
            <SheetFooter className="px-4">
              {saved ? (
                <Button type="button" onClick={() => setOpen(false)}>
                  Done
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create discipline"}
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
