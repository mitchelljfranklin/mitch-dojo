"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const translate = useTranslations("Common");
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: string) {
    if (nextLocale === selectedLocale) return;
    setSelectedLocale(nextLocale);

    startTransition(async () => {
      await setLocaleAction(nextLocale);
      // Soft refresh: server components and translations re-render in the new
      // locale, but the booking form keeps its mounted state (typed values,
      // chosen location/class) instead of being reset by a full navigation.
      router.refresh();
    });
  }

  return (
    <Select
      value={selectedLocale}
      onValueChange={changeLocale}
      disabled={isPending}
    >
      <SelectTrigger aria-label={translate("changeLanguage")} className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((availableLocale) => (
          <SelectItem key={availableLocale} value={availableLocale}>
            {LOCALE_LABELS[availableLocale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
