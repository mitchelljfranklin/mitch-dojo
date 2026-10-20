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
