"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
  regenerateCheckinTokenAction,
  type LocationActionState,
} from "@/lib/actions/locations";
import { CopyLink } from "@/components/copy-link";
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
  checkinToken: string | null;
};

type EditorTarget = LocationView | "new";

const initialState: LocationActionState = undefined;

function LocationFields({ location }: { location?: LocationView }) {
  const translate = useTranslations("Admin.locations.form");
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="location-name">{translate("name")}</Label>
        <Input
          id="location-name"
          name="name"
          defaultValue={location?.name}
          required
          maxLength={80}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="location-address">{translate("address")}</Label>
        <Input
          id="location-address"
          name="address"
          defaultValue={location?.address ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="location-phone">{translate("phone")}</Label>
          <Input
            id="location-phone"
            name="phone"
            defaultValue={location?.phone ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location-email">{translate("email")}</Label>
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
          <Label htmlFor="location-sort-order">{translate("sortOrder")}</Label>
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
          {translate("active")}
        </label>
      </div>
    </>
  );
}

function NewLocationForm({ onClose }: { onClose: () => void }) {
  const translate = useTranslations("Admin.locations.form");
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
          {isPending ? translate("creating") : translate("create")}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          {translate("cancel")}
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
  const translate = useTranslations("Admin.locations");
  const [state, formAction, isPending] = useActionState(
    updateLocationAction,
    initialState,
  );
  useActionFeedback(state);

  const [qrBust, setQrBust] = useState(0);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onClose();
    }
  }, [state, onClose]);

  const checkinUrl =
    location.checkinToken && typeof window !== "undefined"
      ? `${window.location.origin}/checkin/${location.checkinToken}`
      : null;

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

      <div className="grid gap-2 border-t pt-4">
        <Label>{translate("qr.title")}</Label>
        <p className="text-muted-foreground text-xs">{translate("qr.hint")}</p>
        <div className="flex items-start gap-4">
          <img
            key={qrBust}
            src={`/api/locations/${location.id}/checkin-qr?v=${qrBust}`}
            alt={translate("qr.alt", { name: location.name })}
            className="size-32 rounded-md border bg-white p-1"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {checkinUrl ? (
              <CopyLink value={checkinUrl} />
            ) : (
              <p className="text-muted-foreground text-xs">
                {translate("qr.notGenerated")}
              </p>
            )}
            <form action={regenerateCheckinTokenAction}>
              <input type="hidden" name="locationId" value={location.id} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                onClick={() => setQrBust(Date.now())}
              >
                {translate("qr.regenerate")}
              </Button>
            </form>
            <p className="text-muted-foreground text-xs">
              {translate("qr.regenerateHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto grid gap-2 border-t pt-4">
        <Label>{translate("danger.title")}</Label>
        <form
          id={`delete-location-${location.id}`}
          action={deleteLocationAction}
        >
          <input type="hidden" name="locationId" value={location.id} />
          <ConfirmDialog
            title={translate("danger.deleteTitle")}
            description={translate("danger.deleteDescription", {
              name: location.name,
            })}
            confirmLabel={translate("danger.delete")}
            formId={`delete-location-${location.id}`}
          >
            <Button type="button" size="sm" variant="destructive">
              {translate("danger.delete")}
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
          {isPending ? translate("form.saving") : translate("form.save")}
        </SubmitButton>
        <Button type="button" variant="outline" onClick={onClose}>
          {translate("form.cancel")}
        </Button>
      </SheetFooter>
    </div>
  );
}

export function LocationsManager({ locations }: { locations: LocationView[] }) {
  const translate = useTranslations("Admin.locations.manager");
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
          aria-label={translate("searchAria")}
          placeholder={translate("searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setEditing("new")}>
          {translate("new")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {locations.length === 0 ? translate("empty") : translate("noMatch")}
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
                  {location.address || translate("noAddress")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {translate("studentCount", {
                    count: location.studentCount,
                  })}
                </Badge>
                {location.isActive ? null : (
                  <Badge variant="outline" className="text-xs">
                    {translate("inactive")}
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
              <SheetTitle>{translate("addTitle")}</SheetTitle>
              <SheetDescription>{translate("addDescription")}</SheetDescription>
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
                {translate("assigned", {
                  count: editingLocation.studentCount,
                })}
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
