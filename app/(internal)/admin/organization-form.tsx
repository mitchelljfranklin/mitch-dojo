"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveOrganizationSettings, type SettingsActionState } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { COUNTRIES, countryName } from "@/lib/countries";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/config";

type OrganizationFormProps = {
  name: string;
  supportEmail: string;
  defaultCountry: string;
  defaultLocale: Locale;
};

const initialState: SettingsActionState = undefined;

export function OrganizationForm(props: OrganizationFormProps) {
  const fingerprint = JSON.stringify([
    props.name,
    props.supportEmail,
    props.defaultCountry,
    props.defaultLocale,
  ]);
  return <OrganizationFormInner key={fingerprint} {...props} />;
}

function OrganizationFormInner({
  name,
  supportEmail,
  defaultCountry,
  defaultLocale,
}: OrganizationFormProps) {
  const translate = useTranslations("Admin.general");
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(
    saveOrganizationSettings,
    initialState,
  );
  useActionFeedback(state);

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="org-name">{translate("name")}</Label>
        <Input id="org-name" name="name" defaultValue={name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-support-email">{translate("supportEmail")}</Label>
        <Input
          id="org-support-email"
          name="supportEmail"
          type="email"
          defaultValue={supportEmail}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-default-locale">
          {translate("defaultLanguage")}
        </Label>
        <select
          id="org-default-locale"
          name="defaultLocale"
          defaultValue={defaultLocale}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          {LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {LOCALE_LABELS[locale]}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          {translate("languageHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="org-default-country">
          {translate("defaultCountry")}
        </Label>
        <select
          id="org-default-country"
          name="defaultCountry"
          defaultValue={defaultCountry}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">{translate("none")}</option>
          {COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {countryName(code, locale)}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          {translate("countryHint")}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? translate("saving") : translate("save")}
        </Button>
      </div>
    </form>
  );
}
