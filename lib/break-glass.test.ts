import { describe, expect, it } from "vitest";

import {
  countConfiguredSsoProviders,
  isSsoOnlyActive,
  shouldAllowLocalCredentials,
  shouldShowLocalAuth,
} from "@/lib/break-glass";

function settings(overrides: Record<string, unknown> = {}) {
  return {
    entraIdEnabled: false,
    entraIdClientId: "",
    entraIdSecretConfigured: false,
    googleEnabled: false,
    googleClientId: "",
    googleSecretConfigured: false,
    oidcEnabled: false,
    oidcIssuer: "",
    oidcClientId: "",
    oidcSecretConfigured: false,
    ...overrides,
  };
}

describe("countConfiguredSsoProviders", () => {
  it("counts only fully configured providers (enabled + id + secret)", () => {
    expect(countConfiguredSsoProviders(settings())).toBe(0);
    expect(
      countConfiguredSsoProviders(
        settings({ googleEnabled: true, googleClientId: "id" }),
      ),
    ).toBe(0); // no secret
    expect(
      countConfiguredSsoProviders(
        settings({
          googleEnabled: true,
          googleClientId: "id",
          googleSecretConfigured: true,
        }),
      ),
    ).toBe(1);
    expect(
      countConfiguredSsoProviders(
        settings({
          oidcEnabled: true,
          oidcIssuer: "https://idp.example",
          oidcClientId: "id",
          oidcSecretConfigured: true,
        }),
      ),
    ).toBe(1);
  });
});

describe("shouldAllowLocalCredentials (SSO-only write gate)", () => {
  it("allows local sign-in when local auth is not disabled", () => {
    expect(shouldAllowLocalCredentials(false, 1, false)).toBe(true);
  });

  it("allows local sign-in when no provider is usable (anti-lock-out)", () => {
    expect(shouldAllowLocalCredentials(true, 0, false)).toBe(true);
  });

  it("blocks local sign-in in SSO-only mode without a break-glass grant", () => {
    expect(shouldAllowLocalCredentials(true, 1, false)).toBe(false);
  });

  it("allows local sign-in in SSO-only mode WITH a break-glass grant", () => {
    expect(shouldAllowLocalCredentials(true, 1, true)).toBe(true);
  });

  it("keeps the page-render rule consistent with the write gate", () => {
    // The form is shown exactly when the credentials callback would accept.
    for (const disableLocalAuth of [false, true]) {
      for (const count of [0, 1]) {
        for (const grant of [false, true]) {
          expect(
            shouldShowLocalAuth({
              disableLocalAuth,
              ssoProviderCount: count,
              breakGlassValid: grant,
            }),
          ).toBe(shouldAllowLocalCredentials(disableLocalAuth, count, grant));
        }
      }
    }
  });

  it("isSsoOnlyActive only with local auth off AND a usable provider", () => {
    expect(isSsoOnlyActive(true, 1)).toBe(true);
    expect(isSsoOnlyActive(true, 0)).toBe(false);
    expect(isSsoOnlyActive(false, 1)).toBe(false);
  });
});
