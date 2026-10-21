import { describe, expect, it } from "vitest";

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
import { LOCALES } from "./config";

const CATALOGS: Record<string, unknown> = {
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

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function flattenMessages(
  value: unknown,
  prefix = "",
  out: Record<string, string> = {},
): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    out[prefix] = String(value);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenMessages(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function placeholders(value: string): string[] {
  return [
    ...new Set(
      [...value.matchAll(/\{\s*([a-zA-Z][\w]*)\s*[,}]/g)].map(
        (match) => match[1]!,
      ),
    ),
  ].sort();
}

describe("message catalogs", () => {
  it("defines a catalog entry for every configured locale", () => {
    for (const locale of LOCALES) {
      expect(CATALOGS[locale], `missing catalog for ${locale}`).toBeDefined();
    }
  });

  it("keeps every locale in sync with the default catalog", () => {
    const defaultKeys = flattenKeys(CATALOGS.en).sort();
    for (const locale of LOCALES) {
      expect(flattenKeys(CATALOGS[locale]).sort(), `${locale} keys`).toEqual(
        defaultKeys,
      );
    }
  });

  it("never uses a dot inside a message key segment", () => {
    function assertKeys(value: unknown, locale: string): void {
      if (typeof value !== "object" || value === null) return;
      for (const [key, child] of Object.entries(value)) {
        expect(key, `${locale} key "${key}"`).not.toContain(".");
        assertKeys(child, locale);
      }
    }
    for (const locale of LOCALES) {
      assertKeys(CATALOGS[locale], locale);
    }
  });

  it("keeps ICU placeholders in sync with the default catalog", () => {
    const defaultMessages = flattenMessages(CATALOGS.en);
    for (const locale of LOCALES) {
      const messages = flattenMessages(CATALOGS[locale]);
      for (const [key, text] of Object.entries(defaultMessages)) {
        expect(placeholders(messages[key] ?? ""), `${locale} ${key}`).toEqual(
          placeholders(text),
        );
      }
    }
  });
});
