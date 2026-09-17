import { describe, expect, it } from "vitest";

import {
  generateBreakGlassToken,
  hashBreakGlassToken,
  shouldShowLocalAuth,
  verifyBreakGlassToken,
} from "./break-glass";

describe("generateBreakGlassToken", () => {
  it("produces a 48-character hex token", () => {
    const token = generateBreakGlassToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("produces unique tokens", () => {
    const tokens = new Set(
      Array.from({ length: 20 }, () => generateBreakGlassToken()),
    );
    expect(tokens.size).toBe(20);
  });
});

describe("verifyBreakGlassToken", () => {
  it("accepts the token it hashed", async () => {
    const token = generateBreakGlassToken();
    const hash = await hashBreakGlassToken(token);
    await expect(verifyBreakGlassToken(token, hash)).resolves.toBe(true);
  });

  it("rejects a wrong token", async () => {
    const hash = await hashBreakGlassToken(generateBreakGlassToken());
    await expect(
      verifyBreakGlassToken(generateBreakGlassToken(), hash),
    ).resolves.toBe(false);
  });

  it("rejects empty input", async () => {
    const hash = await hashBreakGlassToken(generateBreakGlassToken());
    await expect(verifyBreakGlassToken("", hash)).resolves.toBe(false);
  });
});

describe("shouldShowLocalAuth", () => {
  it("shows local auth when not disabled", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: false,
        ssoProviderCount: 2,
        breakGlassValid: false,
      }),
    ).toBe(true);
  });

  it("shows local auth when disabled but zero providers are configured (anti-lock-out)", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: true,
        ssoProviderCount: 0,
        breakGlassValid: false,
      }),
    ).toBe(true);
  });

  it("hides local auth in SSO-only mode", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: true,
        ssoProviderCount: 1,
        breakGlassValid: false,
      }),
    ).toBe(false);
  });

  it("shows local auth with a valid break-glass token even in SSO-only mode", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: true,
        ssoProviderCount: 3,
        breakGlassValid: true,
      }),
    ).toBe(true);
  });
});
