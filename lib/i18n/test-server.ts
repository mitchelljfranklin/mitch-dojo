import { createFormatter, createTranslator } from "next-intl";

import ar from "../../messages/ar.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import hi from "../../messages/hi.json";
import itMessages from "../../messages/it.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import pt from "../../messages/pt.json";
import ru from "../../messages/ru.json";
import zh from "../../messages/zh.json";

// Vitest-only stand-in for `next-intl/server`. Without the `react-server`
// export condition, the package resolves to its client entry and throws
// "getTranslations is not supported in Client Components" from every server
// action exercised by the integration suites. This stub provides the same
// lookup surface using the committed catalogs; alias it in vitest.config.ts.
const MESSAGES: Record<string, Record<string, unknown>> = {
  en,
  es,
  pt,
  fr,
  de,
  it: itMessages,
  ja,
  ko,
  zh,
  ar,
  hi,
  ru,
};

type LocaleOptions = { locale?: string; namespace?: string };

function localeFrom(value?: string | LocaleOptions): string {
  if (typeof value === "string") return "en";
  return value?.locale ?? "en";
}

function namespaceFrom(value?: string | LocaleOptions): string | undefined {
  return typeof value === "string" ? value : value?.namespace;
}

export async function getTranslations(
  namespaceOrOptions?: string | LocaleOptions,
) {
  const locale = localeFrom(namespaceOrOptions);
  return createTranslator({
    locale,
    messages: MESSAGES[locale] ?? en,
    namespace: namespaceFrom(namespaceOrOptions) as never,
  });
}

export async function getFormatter(localeOrOptions?: string | LocaleOptions) {
  return createFormatter({ locale: localeFrom(localeOrOptions) });
}

export async function getLocale(): Promise<string> {
  return "en";
}

export async function getMessages(): Promise<Record<string, unknown>> {
  return en;
}

export async function getNow(): Promise<Date> {
  return new Date();
}

export async function getTimeZone(): Promise<string> {
  return "UTC";
}

export function getRequestConfig<T>(callback: T): T {
  return callback;
}
