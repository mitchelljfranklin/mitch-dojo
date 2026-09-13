"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
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
  createDisciplineAction,
  deleteDisciplineAction,
} from "@/lib/actions/belts";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type DisciplineView = {
  id: string;
  name: string;
  isActive: boolean;
  beltCount: number;
  courseCount: number;
};

type BeltActionState =
  { error: string } | { ok: true; message: string } | undefined;

const initialState: BeltActionState = undefined;

function NewDisciplineForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(createDisciplineAction, initialState);
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
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
      <SheetFooter className="px-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create discipline"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

function DeleteDisciplineForm({
  disciplineId,
  disciplineName,
}: {
  disciplineId: string;
  disciplineName: string;
}) {
  return (
    <form action={deleteDisciplineAction}>
      <input type="hidden" name="disciplineId" value={disciplineId} />
      <Button type="submit" size="sm" variant="destructive">
        Delete {disciplineName}
      </Button>
      <p className="text-muted-foreground mt-1 text-xs">
        Disciplines with courses must be reassigned first.
      </p>
    </form>
  );
}

export function DisciplinesManager({
  disciplines,
  canEdit,
}: {
  disciplines: DisciplineView[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            Disciplines group courses that share a belt ladder. A student&apos;s
            rank is global across all locations teaching that discipline.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            New discipline
          </Button>
        </div>
      ) : null}

      {disciplines.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No disciplines yet. Create one to set up a belt ladder.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {disciplines.map((discipline) => (
            <div
              key={discipline.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{discipline.name}</span>
                <span className="text-muted-foreground text-xs">
                  {discipline.beltCount} belt
                  {discipline.beltCount === 1 ? "" : "s"} ·{" "}
                  {discipline.courseCount} course
                  {discipline.courseCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {discipline.isActive ? null : (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
                {canEdit ? (
                  <DeleteDisciplineForm
                    disciplineId={discipline.id}
                    disciplineName={discipline.name}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

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
              Create a discipline with its own belt ladder.
            </SheetDescription>
          </SheetHeader>
          <NewDisciplineForm onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
