"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  applyBeltRangeAction,
  createBeltLevelAction,
  deleteBeltLevelAction,
  updateBeltLevelAction,
  type BeltActionState,
} from "@/lib/actions/belts";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type BeltLevelView = {
  id: string;
  name: string;
  colorHex: string;
  order: number;
  requiredTrainings: number;
};

type EditorTarget = BeltLevelView | "new";

const initialState: BeltActionState = undefined;

// Maps any valid hex (#RGB or #RRGGBB) to a #RRGGBB string the colour
// picker accepts; falls back to white for non-hex input while typing.
function normalizeHexForPicker(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "#FFFFFF";
}

function BeltFields({
  belt,
  defaultOrder,
}: {
  belt?: BeltLevelView;
  defaultOrder: number;
}) {
  // Single source of truth for the colour so typing a hex code updates the
  // picker and picking from the palette updates the hex field.
  const [color, setColor] = useState(belt?.colorHex ?? "#FFFFFF");

  return (
    <>
      <input type="hidden" name="colorHex" value={color} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="belt-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="belt-name"
            name="name"
            defaultValue={belt?.name}
            required
            maxLength={40}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="belt-color" className="text-sm font-medium">
            Colour
          </label>
          <div className="flex items-center gap-2">
            <input
              id="belt-color"
              type="color"
              value={normalizeHexForPicker(color)}
              onChange={(event) => setColor(event.target.value.toUpperCase())}
              className="h-9 w-14 cursor-pointer rounded border p-1"
              aria-label="Colour palette"
            />
            <input
              id="belt-color-hex"
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              onBlur={(event) =>
                setColor(normalizeHexForPicker(event.target.value))
              }
              className="border-input bg-background h-9 w-28 rounded-md border px-3 font-mono text-sm"
              aria-label="Colour hex value"
              pattern="^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
              required
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Pick a colour or type a hex code (e.g. #FFD700) — both stay in sync.
          </p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="belt-order" className="text-sm font-medium">
            Order (0 = entry rank)
          </label>
          <input
            id="belt-order"
            name="order"
            type="number"
            min={0}
            max={99}
            defaultValue={belt?.order ?? defaultOrder}
            required
            className="border-input bg-background h-9 w-24 rounded-md border px-3 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="belt-required" className="text-sm font-medium">
            Required trainings
          </label>
          <input
            id="belt-required"
            name="requiredTrainings"
            type="number"
            min={0}
            max={9999}
            defaultValue={belt?.requiredTrainings ?? 0}
            required
            className="border-input bg-background h-9 w-24 rounded-md border px-3 text-sm"
          />
          <p className="text-muted-foreground text-xs">
            Trainings (present/late) needed in total on this course to be
            awarded this belt — counted from the student&apos;s first class.
          </p>
        </div>
      </div>
    </>
  );
}

function NewBeltForm({
  courseId,
  nextOrder,
  onClose,
}: {
  courseId: string;
  nextOrder: number;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(createBeltLevelAction, undefined);
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
      <input type="hidden" name="courseId" value={courseId} />
      <BeltFields defaultOrder={nextOrder} />
      {state && "error" in state ? (
        <p className="text-destructive px-4 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <SheetFooter className="px-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add belt level"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditBeltForm({
  courseId,
  belt,
  onClose,
}: {
  courseId: string;
  belt: BeltLevelView;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(updateBeltLevelAction, undefined);
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <form
        id={`edit-belt-${belt.id}`}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="beltLevelId" value={belt.id} />
        <BeltFields belt={belt} defaultOrder={belt.order} />
      </form>
      {state && "error" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-auto grid gap-2 border-t pt-4">
        <p className="text-sm font-medium">Danger zone</p>
        <form id={`delete-belt-${belt.id}`} action={deleteBeltLevelAction}>
          <input type="hidden" name="beltLevelId" value={belt.id} />
          <input type="hidden" name="courseId" value={courseId} />
          <ConfirmDialog
            title="Remove belt level?"
            description={`${belt.name} will be removed from this course. Belts that have been awarded cannot be removed.`}
            confirmLabel="Remove"
            formId={`delete-belt-${belt.id}`}
          >
            <Button type="button" size="sm" variant="destructive">
              Remove
            </Button>
          </ConfirmDialog>
        </form>
      </div>

      <SheetFooter className="px-4">
        <Button
          type="submit"
          form={`edit-belt-${belt.id}`}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </div>
  );
}

export function BeltLevelsManager({
  courseId,
  belts,
  canEdit,
}: {
  courseId: string;
  belts: BeltLevelView[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const editingBelt =
    editing && editing !== "new"
      ? (belts.find((belt) => belt.id === editing.id) ?? null)
      : null;
  const isOpen = editing === "new" || editingBelt !== null;
  const nextOrder =
    belts.length > 0 ? Math.max(...belts.map((belt) => belt.order)) + 1 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Belt levels</CardTitle>
          <CardDescription>
            Ranks for this course, lowest order first.
          </CardDescription>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <form action={applyBeltRangeAction}>
              <input type="hidden" name="courseId" value={courseId} />
              <Button type="submit" variant="secondary" size="sm">
                Load standard range
              </Button>
            </form>
            <Button size="sm" onClick={() => setEditing("new")}>
              Add belt
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {belts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No belt levels yet. Add the entry belt first (0 required trainings).
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {belts.map((belt) => (
              <button
                key={belt.id}
                type="button"
                onClick={() => canEdit && setEditing(belt)}
                disabled={!canEdit}
                className="hover:bg-muted/50 flex items-center justify-between gap-3 p-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-4 w-8 shrink-0 rounded-full border border-black/20"
                    style={{ backgroundColor: belt.colorHex }}
                  />
                  <span className="truncate text-sm font-medium">
                    {belt.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    order {belt.order}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {belt.requiredTrainings} training
                  {belt.requiredTrainings === 1 ? "" : "s"}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing === "new" ? (
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Add belt level</SheetTitle>
              <SheetDescription>
                Define a rank for this course.
              </SheetDescription>
            </SheetHeader>
            <NewBeltForm
              courseId={courseId}
              nextOrder={nextOrder}
              onClose={() => setEditing(null)}
            />
          </SheetContent>
        ) : editingBelt ? (
          <SheetContent
            key={editingBelt.id}
            className="w-full overflow-y-auto sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle>{editingBelt.name}</SheetTitle>
              <SheetDescription>Update the belt definition.</SheetDescription>
            </SheetHeader>
            <EditBeltForm
              courseId={courseId}
              belt={editingBelt}
              onClose={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </Card>
  );
}
