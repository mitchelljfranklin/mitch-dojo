"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction,
  type LocationActionState,
} from "@/lib/actions/locations";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type LocationView = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  sortOrder: number;
  studentCount: number;
};

type EditorTarget = LocationView | "new";

const initialState: LocationActionState = undefined;

function LocationFields({ location }: { location?: LocationView }) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="location-name">Name</Label>
        <Input
          id="location-name"
          name="name"
          defaultValue={location?.name}
          required
          maxLength={80}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="location-address">Address</Label>
        <Input
          id="location-address"
          name="address"
          defaultValue={location?.address ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="location-phone">Phone</Label>
          <Input
            id="location-phone"
            name="phone"
            defaultValue={location?.phone ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location-email">Email</Label>
          <Input
            id="location-email"
            name="email"
            type="email"
            defaultValue={location?.email ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="location-sort-order">Sort order</Label>
          <Input
            id="location-sort-order"
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={location?.sortOrder ?? 0}
          />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <Checkbox
            name="isActive"
            defaultChecked={location ? location.isActive : true}
          />
          Active
        </label>
      </div>
    </>
  );
}

function NewLocationForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(
    createLocationAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
      <LocationFields />
      {state && "error" in state ? (
        <p className="text-destructive px-4 text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <SheetFooter className="px-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create location"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditLocationForm({
  location,
  onClose,
}: {
  location: LocationView;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateLocationAction,
    initialState,
  );
  useActionFeedback(state);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4">
      <form
        id={`edit-location-${location.id}`}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="locationId" value={location.id} />
        <LocationFields location={location} />
      </form>
      {state && "error" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-auto grid gap-2 border-t pt-4">
        <Label>Danger zone</Label>
        <form
          id={`delete-location-${location.id}`}
          action={deleteLocationAction}
        >
          <input type="hidden" name="locationId" value={location.id} />
          <ConfirmDialog
            title="Delete location?"
            description={`${location.name} will be permanently removed. Locations with students assigned must be deactivated instead.`}
            confirmLabel="Delete"
            formId={`delete-location-${location.id}`}
          >
            <Button type="button" size="sm" variant="destructive">
              Delete
            </Button>
          </ConfirmDialog>
        </form>
      </div>

      <SheetFooter className="px-4">
        <SubmitButton
          type="submit"
          form={`edit-location-${location.id}`}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save"}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </SheetFooter>
    </div>
  );
}

export function LocationsManager({ locations }: { locations: LocationView[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditorTarget | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return locations;
    return locations.filter((location) =>
      location.name.toLowerCase().includes(term),
    );
  }, [locations, query]);

  const editingLocation =
    editing && editing !== "new"
      ? (locations.find((location) => location.id === editing.id) ?? null)
      : null;

  const isOpen = editing === "new" || editingLocation !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          aria-label="Search locations"
          placeholder="Search locations…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setEditing("new")}>
          New location
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {locations.length === 0
            ? "No locations yet."
            : "No locations match your search."}
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {filtered.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => setEditing(location)}
              className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-3 text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{location.name}</span>
                <span className="text-muted-foreground text-xs">
                  {location.address || "No address"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {location.studentCount}{" "}
                  {location.studentCount === 1 ? "student" : "students"}
                </Badge>
                {location.isActive ? null : (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
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
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Add location</SheetTitle>
              <SheetDescription>
                Create a dojo location students can be assigned to.
              </SheetDescription>
            </SheetHeader>
            <NewLocationForm onClose={() => setEditing(null)} />
          </SheetContent>
        ) : editingLocation ? (
          <SheetContent
            key={editingLocation.id}
            className="w-full overflow-y-auto sm:max-w-lg"
          >
            <SheetHeader>
              <SheetTitle>{editingLocation.name}</SheetTitle>
              <SheetDescription>
                {editingLocation.studentCount}{" "}
                {editingLocation.studentCount === 1 ? "student" : "students"}{" "}
                assigned
              </SheetDescription>
            </SheetHeader>
            <EditLocationForm
              location={editingLocation}
              onClose={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  );
}
