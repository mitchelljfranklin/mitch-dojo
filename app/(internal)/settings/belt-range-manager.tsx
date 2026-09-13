"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import {
  createBeltRangeEntryAction,
  deleteBeltRangeEntryAction,
  updateBeltRangeEntryAction,
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

function RangeFields({
  entry,
  defaultOrder,
}: {
  entry?: BeltRangeView;
  defaultOrder: number;
}) {
  const [color, setColor] = useState(entry?.colorHex ?? "#FFFFFF");

  return (
    <>
      <input type="hidden" name="colorHex" value={color} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="range-name">Name</Label>
          <Input
            id="range-name"
            name="name"
            defaultValue={entry?.name}
            required
            maxLength={40}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="range-color">Colour</Label>
          <div className="flex items-center gap-2">
            <input
              id="range-color"
              type="color"
              value={normalizeHexForPicker(color)}
              onChange={(event) => setColor(event.target.value.toUpperCase())}
              className="h-9 w-14 cursor-pointer rounded border p-1"
              aria-label="Colour palette"
            />
            <Input
              id="range-color-hex"
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
          <Label htmlFor="range-order">Order (0 = entry rank)</Label>
          <Input
            id="range-order"
            name="order"
            type="number"
            min={0}
            max={99}
            defaultValue={entry?.order ?? defaultOrder}
            required
            className="w-24"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="range-required">Required trainings</Label>
          <Input
            id="range-required"
            name="requiredTrainings"
            type="number"
            min={0}
            max={9999}
            defaultValue={entry?.requiredTrainings ?? 0}
            required
            className="w-24"
          />
        </div>
      </div>
    </>
  );
}

function NewRangeForm({
  nextOrder,
  onClose,
}: {
  nextOrder: number;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(createBeltRangeEntryAction, undefined);
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
      <RangeFields defaultOrder={nextOrder} />
      {state && "error" in state ? (
        <p className="text-destructive px-4 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <SheetFooter className="px-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add belt"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditRangeForm({
  entry,
  onClose,
}: {
  entry: BeltRangeView;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(updateBeltRangeEntryAction, undefined);
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <form
        id={`edit-range-${entry.id}`}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="entryId" value={entry.id} />
        <RangeFields entry={entry} defaultOrder={entry.order} />
      </form>
      {state && "error" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-auto grid gap-2 border-t pt-4">
        <Label>Danger zone</Label>
        <form
          id={`delete-range-${entry.id}`}
          action={deleteBeltRangeEntryAction}
        >
          <input type="hidden" name="entryId" value={entry.id} />
          <ConfirmDialog
            title="Remove belt from range?"
            description={`${entry.name} will be removed from the standard range. Courses that already loaded it keep their copy.`}
            confirmLabel="Remove"
            formId={`delete-range-${entry.id}`}
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
          form={`edit-range-${entry.id}`}
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

export function BeltRangeManager({ entries }: { entries: BeltRangeView[] }) {
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const editingEntry =
    editing && editing !== "new"
      ? (entries.find((entry) => entry.id === editing.id) ?? null)
      : null;
  const isOpen = editing === "new" || editingEntry !== null;
  const nextOrder =
    entries.length > 0
      ? Math.max(...entries.map((entry) => entry.order)) + 1
      : 0;

  const ordered = useMemo(
    () => [...entries].sort((a, b) => a.order - b.order),
    [entries],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          The school&apos;s standard ladder. Courses load it via &quot;Load
          standard range&quot; and can customise afterwards.
        </p>
        <Button size="sm" onClick={() => setEditing("new")}>
          Add belt
        </Button>
      </div>

      {ordered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          The standard belt range is empty. Add the entry belt first (0 required
          trainings).
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {ordered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setEditing(entry)}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 p-3 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-4 w-8 shrink-0 rounded-full border border-black/20"
                  style={{ backgroundColor: entry.colorHex }}
                />
                <span className="truncate text-sm font-medium">
                  {entry.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  order {entry.order}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {entry.requiredTrainings} training
                {entry.requiredTrainings === 1 ? "" : "s"}
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
              <SheetTitle>Add belt to range</SheetTitle>
              <SheetDescription>
                Define a rank in the school&apos;s standard ladder.
              </SheetDescription>
            </SheetHeader>
            <NewRangeForm
              nextOrder={nextOrder}
              onClose={() => setEditing(null)}
            />
          </SheetContent>
        ) : editingEntry ? (
          <SheetContent
            key={editingEntry.id}
            className="w-full overflow-y-auto sm:max-w-md"
          >
            <SheetHeader>
              <SheetTitle>{editingEntry.name}</SheetTitle>
              <SheetDescription>
                Update the standard belt definition.
              </SheetDescription>
            </SheetHeader>
            <EditRangeForm
              entry={editingEntry}
              onClose={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
