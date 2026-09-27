import { describe, expect, it } from "vitest";

import { portalContactSchema, portalPreferencesSchema } from "./portal";

describe("portalContactSchema", () => {
  it("normalises empty strings to null and lowercases emails", () => {
    const parsed = portalContactSchema.parse({
      email: "  Member@Example.COM ",
      phone: "",
      country: "au",
    });
    expect(parsed.email).toBe("member@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.country).toBe("AU");
  });

  it("rejects an invalid email", () => {
    expect(
      portalContactSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("drops an invalid country code to null", () => {
    const parsed = portalContactSchema.parse({ country: "ZZ" });
    expect(parsed.country).toBeNull();
  });
});

describe("portalPreferencesSchema", () => {
  it("defaults to opted in", () => {
    expect(portalPreferencesSchema.parse({}).emailOptOut).toBe(false);
  });

  it("accepts the opt-out flag", () => {
    expect(
      portalPreferencesSchema.parse({ emailOptOut: true }).emailOptOut,
    ).toBe(true);
  });
});
