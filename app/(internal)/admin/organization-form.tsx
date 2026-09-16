"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveOrganizationSettings, type SettingsActionState } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { COUNTRIES, countryName } from "@/lib/countries";

type OrganizationFormProps = {
  name: string;
  supportEmail: string;
  defaultCountry: string;
};

const initialState: SettingsActionState = undefined;

export function OrganizationForm(props: OrganizationFormProps) {
  const fingerprint = JSON.stringify([
    props.name,
    props.supportEmail,
    props.defaultCountry,
  ]);
  return <OrganizationFormInner key={fingerprint} {...props} />;
}

function OrganizationFormInner({
  name,
  supportEmail,
  defaultCountry,
}: OrganizationFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveOrganizationSettings,
    initialState,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input id="org-name" name="name" defaultValue={name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-support-email">Support email</Label>
        <Input
          id="org-support-email"
          name="supportEmail"
          type="email"
          defaultValue={supportEmail}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-default-country">Default country</Label>
        <select
          id="org-default-country"
          name="defaultCountry"
          defaultValue={defaultCountry}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">None</option>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {countryName(code)}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Preselected in the address section of the student form.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
