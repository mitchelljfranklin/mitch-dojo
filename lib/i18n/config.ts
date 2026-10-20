export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

// Language names are always shown in their own language, so they are not
// part of the translated catalogs.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}
