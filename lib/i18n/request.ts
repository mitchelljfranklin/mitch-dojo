import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { getOrganizationSettings } from "@/lib/settings";

import { LOCALE_COOKIE, type Locale } from "./config";
import { resolveLocale } from "./locale";

const MESSAGE_LOADERS: Record<
  Locale,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
  pt: () => import("../../messages/pt.json"),
  fr: () => import("../../messages/fr.json"),
  de: () => import("../../messages/de.json"),
  it: () => import("../../messages/it.json"),
  ja: () => import("../../messages/ja.json"),
  ko: () => import("../../messages/ko.json"),
  zh: () => import("../../messages/zh.json"),
  ar: () => import("../../messages/ar.json"),
  hi: () => import("../../messages/hi.json"),
  ru: () => import("../../messages/ru.json"),
};

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

  // The school's default language lives in Settings; a database that is not
  // ready yet (first boot, setup screen) must not break locale resolution.
  let organizationDefault: string | null = null;
  try {
    organizationDefault = (await getOrganizationSettings()).defaultLocale;
  } catch (error) {
    console.error(
      "[i18n] failed to read the default language setting; using the browser fallback.",
      error instanceof Error ? error.message : String(error),
    );
  }

  const locale = resolveLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value,
    organizationDefault,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return {
    locale,
    messages: (await MESSAGE_LOADERS[locale]()).default,
  };
});
