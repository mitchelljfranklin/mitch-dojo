import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { LOCALES } from "./config";

const CATALOGS: Record<string, unknown> = { en, es };

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
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
});
