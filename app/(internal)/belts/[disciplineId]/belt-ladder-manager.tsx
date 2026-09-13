"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createBeltLevelAction,
  deleteBeltLevelAction,
  updateBeltLevelAction,
  type BeltActionState,
} from "@/lib/actions/belts";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type BeltRangeView = {
  id: string;
  name: string;
  colorHex: string;
  order: number;
  requiredTrainings: number;
};

type EditorTarget = BeltRangeView | "new";

const initialState: BeltActionState = undefined;

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
  belt?: BeltRangeView;
  defaultOrder: number;
}) {
  const [color, setColor] = useState(belt?.colorHex ?? "#FFFFFF");

  return (
    <>
      <input type="hidden" name="colorHex" value={color} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="belt-name">Name</Label>
          <Input
            id="belt-name"
            name="name"
            defaultValue={belt?.name}
            required
            maxLength={40}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="belt-color">Colour</Label>
          <div className="flex items-center gap-2">
            <input
              id="belt-color"
              type="color"
              value={normalizeHexForPicker(color)}
              onChange={(event) => setColor(event.target.value.toUpperCase())}
              className="h-9 w-14 cursor-pointer rounded border p-1"
              aria-label="Colour palette"
            />
            <Input
              id="belt-color-hex"
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              onBlur={(event) =>
                setColor(normalizeHexForPicker(event.target.value))
              }
              className="w-28 font-mono"
              aria-label="Colour hex value"
              pattern="^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"
              required
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="belt-order">Order (0 = entry rank)</Label>
          <Input
            id="belt-order"
            name="order"
            type="number"
            min={0}
            max={99}
            defaultValue={belt?.order ?? defaultOrder}
            required
            className="w-24"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="belt-required">Required trainings</Label>
          <Input
            id="belt-required"
            name="requiredTrainings"
            type="number"
            min={0}
            max={9999}
            defaultValue={belt?.requiredTrainings ?? 0}
            required
            className="w-24"
          />
          <p className="text-muted-foreground text-xs">
            Cumulative total of trained sessions (across all courses of this
            discipline) needed to be awarded this belt.
          </p>
        </div>
      </div>
    </>
  );
}

function NewBeltForm({
  disciplineId,
  nextOrder,
  onClose,
}: {
  disciplineId: string;
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
      <input type="hidden" name="disciplineId" value={disciplineId} />
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
  disciplineId,
  belt,
  onClose,
}: {
  disciplineId: string;
  belt: BeltRangeView;
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
        <Label>Danger zone</Label>
        <form id={`delete-belt-${belt.id}`} action={deleteBeltLevelAction}>
          <input type="hidden" name="beltLevelId" value={belt.id} />
          <input type="hidden" name="disciplineId" value={disciplineId} />
          <ConfirmDialog
            title="Remove belt level?"
            description={`${belt.name} will be removed from this discipline. Belts that have been awarded cannot be removed.`}
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

export function BeltLadderManager({
  disciplineId,
  belts,
  canEdit,
}: {
  disciplineId: string;
  belts: BeltRangeView[];
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Belt ladder</h3>
          <p className="text-muted-foreground text-xs">
            Ranks for this discipline, lowest order first.
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            Add belt
          </Button>
        ) : null}
      </div>

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
                Define a rank for this discipline.
              </SheetDescription>
            </SheetHeader>
            <NewBeltForm
              disciplineId={disciplineId}
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
              disciplineId={disciplineId}
              belt={editingBelt}
              onClose={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
