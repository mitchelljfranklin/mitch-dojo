"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAppearanceSettings } from "./actions";

type AppearanceFormProps = {
  primaryHex: string;
  secondaryHex: string;
  hasLogo: boolean;
  logoKey: string;
  hasLogoDark: boolean;
  logoDarkKey: string;
  emailLogoVariant: string;
  borderRadius: number;
  pageWidth: string;
  bookingHeadline: string;
  bookingDescription: string;
};

function ColorField({
  label,
  description,
  hexValue,
  defaultHex,
  name,
}: {
  label: string;
  description: string;
  hexValue: string;
  defaultHex: string;
  name: string;
}) {
  const [color, setColor] = useState(hexValue || defaultHex);

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${name}Color`}>{label}</Label>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div className="flex items-center gap-3">
        <input
          id={`${name}Color`}
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-9 w-14 cursor-pointer rounded border p-1"
        />
        <Input
          id={name}
          name={name}
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="w-32 font-mono"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setColor(defaultHex)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function AppearanceForm(props: AppearanceFormProps) {
  const fingerprint = JSON.stringify(props);
  return <AppearanceFormInner key={fingerprint} {...props} />;
}

function AppearanceFormInner({
  primaryHex,
  secondaryHex,
  hasLogo,
  logoKey,
  hasLogoDark,
  logoDarkKey,
  emailLogoVariant,
  borderRadius,
  pageWidth,
  bookingHeadline,
  bookingDescription,
}: AppearanceFormProps) {
  const [state, action, isPending] = useActionState(
    saveAppearanceSettings,
    undefined,
  );

  useActionFeedback(state);

  return (
    <form id="appearance-form" action={action} className="grid gap-6">
      <input
        id="removeLogoInput"
        name="removeLogo"
        type="hidden"
        value="false"
      />
      <input
        id="removeLogoDarkInput"
        name="removeLogoDark"
        type="hidden"
        value="false"
      />
      <div className="grid gap-2">
        <Label htmlFor="logoFile">Logo (light backgrounds)</Label>
        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/*"
          className="cursor-pointer"
        />
        {state && !state.ok ? (
          <p className="text-destructive text-xs" role="alert">
            {state.message}
          </p>
        ) : null}
        {hasLogo ? (
          <div className="flex flex-col gap-2">
            <span
              data-logo-plate
              className="inline-flex w-fit rounded-lg border bg-(--logo-plate) p-1.5"
            >
              <img
                src={`/api/brand/logo?v=${logoKey}`}
                alt="Current logo"
                width={48}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </span>
            <p className="text-muted-foreground text-xs">
              Rendered on a white plate so single-colour badges stay visible in
              dark mode and in emails.
            </p>
            <ConfirmDialog
              title="Remove logo?"
              description="The current logo will be removed from all pages. You can upload a new logo at any time."
              confirmLabel="Remove"
              formId="appearance-form"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive w-fit"
                onClick={() => {
                  const input = document.getElementById(
                    "removeLogoInput",
                  ) as HTMLInputElement | null;
                  if (input) input.value = "true";
                }}
              >
                Remove logo
              </Button>
            </ConfirmDialog>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No logo uploaded. Upload a PNG or JPG (max 2 MB).
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="logoDarkFile">
          Logo for dark backgrounds (optional)
        </Label>
        <Input
          id="logoDarkFile"
          name="logoDarkFile"
          type="file"
          accept="image/*"
          className="cursor-pointer"
        />
        <p className="text-muted-foreground text-xs">
          A light or white knockout version of your badge, shown on dark-mode
          surfaces and optionally in emails. Without one, the primary logo on
          its white plate is used everywhere.
        </p>
        {hasLogoDark ? (
          <div className="flex flex-col gap-2">
            <span
              className="inline-flex w-fit rounded-lg border p-1.5"
              style={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
            >
              <img
                src={`/api/brand/logo?variant=dark&v=${logoDarkKey}`}
                alt="Current dark-background logo"
                width={48}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </span>
            <ConfirmDialog
              title="Remove dark-background logo?"
              description="Dark-mode surfaces will fall back to the primary logo on its white plate."
              confirmLabel="Remove"
              formId="appearance-form"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive w-fit"
                onClick={() => {
                  const input = document.getElementById(
                    "removeLogoDarkInput",
                  ) as HTMLInputElement | null;
                  if (input) input.value = "true";
                }}
              >
                Remove dark logo
              </Button>
            </ConfirmDialog>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="emailLogoVariant">Email logo</Label>
        <p className="text-muted-foreground text-xs">
          Which logo appears in the header of outgoing emails. Emails always
          render on a white background, so the dark logo is shown on a dark
          plate to keep it visible.
        </p>
        <Select
          name="emailLogoVariant"
          defaultValue={emailLogoVariant}
          key={emailLogoVariant}
        >
          <SelectTrigger id="emailLogoVariant" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary logo (white plate)</SelectItem>
            <SelectItem value="dark" disabled={!hasLogoDark}>
              Dark logo (dark plate)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ColorField
        label="Primary colour"
        description="Used for main buttons, links, and active states."
        hexValue={primaryHex}
        defaultHex="#0a0a0a"
        name="primaryHex"
      />

      <ColorField
        label="Secondary colour"
        description="Used for tags, pills, badges, and secondary elements."
        hexValue={secondaryHex}
        defaultHex="#f5f5f5"
        name="secondaryHex"
      />

      <div className="border-t pt-6">
        <p className="text-sm font-medium">Layout</p>
        <p className="text-muted-foreground text-xs">
          Adjust the overall look and feel of the platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="borderRadius">Border radius (px)</Label>
          <p className="text-muted-foreground text-xs">
            Controls how rounded corners are across the app.
          </p>
          <Input
            id="borderRadius"
            name="borderRadius"
            type="number"
            min={0}
            max={16}
            key={borderRadius}
            defaultValue={borderRadius}
            className="w-32"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pageWidth">Page width</Label>
          <p className="text-muted-foreground text-xs">
            Constrain content to a readable width or use the full screen.
          </p>
          <Select name="pageWidth" defaultValue={pageWidth} key={pageWidth}>
            <SelectTrigger id="pageWidth" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constrained">Constrained</SelectItem>
              <SelectItem value="full">Full width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 border-t pt-4">
        <div className="grid gap-2">
          <Label htmlFor="bookingHeadline">Booking page headline</Label>
          <Input
            id="bookingHeadline"
            name="bookingHeadline"
            maxLength={120}
            defaultValue={bookingHeadline}
          />
          <p className="text-muted-foreground text-xs">
            Shown at the top of your public booking page ({`/book`}).
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bookingDescription">Booking page description</Label>
          <Textarea
            id="bookingDescription"
            name="bookingDescription"
            rows={2}
            maxLength={300}
            defaultValue={bookingDescription}
          />
          <p className="text-muted-foreground text-xs">
            Short pitch under the headline. The dojo name is shown above it
            automatically.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save appearance"}
        </Button>
      </div>
    </form>
  );
}
