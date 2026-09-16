import { describe, expect, it } from "vitest";

import {
  countryName,
  isValidCountryCode,
  resolveCountryCode,
} from "./countries";

describe("countries", () => {
  it("validates alpha-2 codes case-insensitively", () => {
    expect(isValidCountryCode("AU")).toBe(true);
    expect(isValidCountryCode("gb")).toBe(true);
    expect(isValidCountryCode("XX")).toBe(false);
    expect(isValidCountryCode("")).toBe(false);
  });

  it("names countries from codes", () => {
    expect(countryName("AU")).toBe("Australia");
    expect(countryName("GB")).toBe("United Kingdom");
  });

  it("resolves names and codes to alpha-2", () => {
    expect(resolveCountryCode("Australia")).toBe("AU");
    expect(resolveCountryCode("australia")).toBe("AU");
    expect(resolveCountryCode("gb")).toBe("GB");
    expect(resolveCountryCode("  Japan  ")).toBe("JP");
    expect(resolveCountryCode("Atlantis")).toBeNull();
    expect(resolveCountryCode("")).toBeNull();
  });
});
