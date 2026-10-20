import { describe, expect, it } from "vitest";

import { localeFromAcceptLanguage, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("prefers the cookie over the browser header", () => {
    expect(
      resolveLocale({ cookieLocale: "es", acceptLanguage: "en-GB,en;q=0.9" }),
    ).toBe("es");
  });

  it("ignores an unsupported cookie and uses the header", () => {
    expect(
      resolveLocale({ cookieLocale: "de", acceptLanguage: "es-MX,es;q=0.9" }),
    ).toBe("es");
  });

  it("falls back to the default locale when nothing matches", () => {
    expect(
      resolveLocale({ cookieLocale: null, acceptLanguage: "fr-FR,fr;q=0.9" }),
    ).toBe("en");
  });
});

describe("localeFromAcceptLanguage", () => {
  it("orders candidates by quality value", () => {
    expect(localeFromAcceptLanguage("en;q=0.4, es;q=0.9, fr;q=0.2")).toBe("es");
  });

  it("treats a regional tag as its base language", () => {
    expect(localeFromAcceptLanguage("es-AR")).toBe("es");
  });

  it("skips unsupported languages and zero-quality entries", () => {
    expect(localeFromAcceptLanguage("de, es;q=0, en;q=0.5")).toBe("en");
  });

  it("returns undefined without a usable header", () => {
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
    expect(localeFromAcceptLanguage("")).toBeUndefined();
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBeUndefined();
  });
});
