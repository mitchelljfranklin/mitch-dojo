"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Admin.appearance");
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
          {translate("colors.reset")}
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
  const translate = useTranslations("Admin.appearance");
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
        <Label htmlFor="logoFile">{translate("logo.label")}</Label>
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
            <img
              src={`/api/brand/logo?v=${logoKey}`}
              alt={translate("logo.currentAlt")}
              width={48}
              height={48}
              className="h-10 w-auto rounded-md border object-contain"
            />
            <p className="text-muted-foreground text-xs">
              {translate("logo.hint")}
            </p>
            <ConfirmDialog
              title={translate("logo.removeTitle")}
              description={translate("logo.removeDescription")}
              confirmLabel={translate("logo.confirmRemove")}
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
                {translate("logo.remove")}
              </Button>
            </ConfirmDialog>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {translate("logo.none")}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="logoDarkFile">{translate("logoDark.label")}</Label>
        <Input
          id="logoDarkFile"
          name="logoDarkFile"
          type="file"
          accept="image/*"
          className="cursor-pointer"
        />
        <p className="text-muted-foreground text-xs">
          {translate("logoDark.hint")}
        </p>
        {hasLogoDark ? (
          <div className="flex flex-col gap-2">
            <span
              className="inline-flex w-fit rounded-lg border p-1.5"
              style={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }}
            >
              <img
                src={`/api/brand/logo?variant=dark&v=${logoDarkKey}`}
                alt={translate("logoDark.currentAlt")}
                width={48}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </span>
            <ConfirmDialog
              title={translate("logoDark.removeTitle")}
              description={translate("logoDark.removeDescription")}
              confirmLabel={translate("logoDark.confirmRemove")}
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
                {translate("logoDark.remove")}
              </Button>
            </ConfirmDialog>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="emailLogoVariant">{translate("emailLogo.label")}</Label>
        <p className="text-muted-foreground text-xs">
          {translate("emailLogo.hint")}
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
            <SelectItem value="primary">
              {translate("emailLogo.primary")}
            </SelectItem>
            <SelectItem value="dark" disabled={!hasLogoDark}>
              {translate("emailLogo.dark")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ColorField
        label={translate("colors.primaryLabel")}
        description={translate("colors.primaryHint")}
        hexValue={primaryHex}
        defaultHex="#0a0a0a"
        name="primaryHex"
      />

      <ColorField
        label={translate("colors.secondaryLabel")}
        description={translate("colors.secondaryHint")}
        hexValue={secondaryHex}
        defaultHex="#f5f5f5"
        name="secondaryHex"
      />

      <div className="border-t pt-6">
        <p className="text-sm font-medium">{translate("layout.title")}</p>
        <p className="text-muted-foreground text-xs">
          {translate("layout.hint")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="borderRadius">{translate("layout.radius")}</Label>
          <p className="text-muted-foreground text-xs">
            {translate("layout.radiusHint")}
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
          <Label htmlFor="pageWidth">{translate("layout.width")}</Label>
          <p className="text-muted-foreground text-xs">
            {translate("layout.widthHint")}
          </p>
          <Select name="pageWidth" defaultValue={pageWidth} key={pageWidth}>
            <SelectTrigger id="pageWidth" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constrained">
                {translate("layout.constrained")}
              </SelectItem>
              <SelectItem value="full">{translate("layout.full")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 border-t pt-4">
        <div className="grid gap-2">
          <Label htmlFor="bookingHeadline">
            {translate("booking.headline")}
          </Label>
          <Input
            id="bookingHeadline"
            name="bookingHeadline"
            maxLength={120}
            defaultValue={bookingHeadline}
          />
          <p className="text-muted-foreground text-xs">
            {translate("booking.headlineHint")}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bookingDescription">
            {translate("booking.description")}
          </Label>
          <Textarea
            id="bookingDescription"
            name="bookingDescription"
            rows={2}
            maxLength={300}
            defaultValue={bookingDescription}
          />
          <p className="text-muted-foreground text-xs">
            {translate("booking.descriptionHint")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </form>
  );
}
