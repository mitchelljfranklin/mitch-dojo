export const LOCALES = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "it",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
  "ru",
] as const;

export type Locale = (typeof LOCALES)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

// Language names are always shown in their own language, so they are not
// part of the translated catalogs.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  ar: "العربية",
  hi: "हिन्दी",
  ru: "Русский",
};

const RTL_LOCALES: readonly Locale[] = ["ar"];

export function localeDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.some((rtlLocale) => rtlLocale === locale) ? "rtl" : "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}
