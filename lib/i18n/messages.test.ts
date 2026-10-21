import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
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

function collectArguments(value: string): string[] {
  const argumentsByName = new Set<string>();

  function collectFromElements(elements: ReturnType<typeof parse>): void {
    for (const element of elements) {
      if (
        element.type === TYPE.argument ||
        element.type === TYPE.number ||
        element.type === TYPE.date ||
        element.type === TYPE.time ||
        element.type === TYPE.select ||
        element.type === TYPE.plural
      ) {
        argumentsByName.add(element.value);
      }

      if (element.type === TYPE.plural || element.type === TYPE.select) {
        for (const option of Object.values(element.options)) {
          collectFromElements(option.value);
        }
      }

      if (element.type === TYPE.tag) {
        collectFromElements(element.children);
      }
    }
  }

  collectFromElements(parse(value));
  return [...argumentsByName].sort();
}

function collectControls(value: string): Map<string, Set<string>> {
  const controls = new Map<string, Set<string>>();

  function collectFromElements(elements: ReturnType<typeof parse>): void {
    for (const element of elements) {
      if (element.type === TYPE.plural || element.type === TYPE.select) {
        const controlKey = `${element.type}:${element.value}`;
        if (!controls.has(controlKey)) controls.set(controlKey, new Set());
        const options = controls.get(controlKey)!;
        for (const optionName of Object.keys(element.options)) {
          options.add(optionName);
        }
        for (const option of Object.values(element.options)) {
          collectFromElements(option.value);
        }
      }

      if (element.type === TYPE.tag) {
        collectFromElements(element.children);
      }
    }
  }

  collectFromElements(parse(value));
  return controls;
}

function expectControlsCovered(
  source: string,
  target: string,
  label: string,
): void {
  const sourceControls = collectControls(source);
  const targetControls = collectControls(target);

  for (const [controlKey, sourceOptions] of sourceControls) {
    const targetOptions = targetControls.get(controlKey);
    expect(targetOptions, `${label} is missing ${controlKey}`).toBeDefined();
    for (const optionName of sourceOptions) {
      expect(
        targetOptions?.has(optionName),
        `${label} is missing ${controlKey}.${optionName}`,
      ).toBe(true);
    }
  }
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

  it("parses every ICU message", () => {
    for (const locale of LOCALES) {
      const messages = flattenMessages(CATALOGS[locale]);
      for (const [key, text] of Object.entries(messages)) {
        expect(() => parse(text), `${locale} ${key}`).not.toThrow();
      }
    }
  });

  it("keeps ICU arguments in sync with the default catalog", () => {
    const defaultMessages = flattenMessages(CATALOGS.en);
    for (const locale of LOCALES) {
      const messages = flattenMessages(CATALOGS[locale]);
      for (const [key, text] of Object.entries(defaultMessages)) {
        expect(
          collectArguments(messages[key] ?? ""),
          `${locale} ${key}`,
        ).toEqual(collectArguments(text));
      }
    }
  });

  it("keeps plural and select options from the default catalog", () => {
    const defaultMessages = flattenMessages(CATALOGS.en);
    for (const locale of LOCALES) {
      const messages = flattenMessages(CATALOGS[locale]);
      for (const [key, text] of Object.entries(defaultMessages)) {
        expectControlsCovered(text, messages[key] ?? "", `${locale} ${key}`);
      }
    }
  });
});
