import { describe, expect, it } from "vitest";

import {
  SETTINGS_TAB_REDIRECTS,
  resolveSettingsTabHref,
} from "@/lib/admin-redirect";
import { ALL_ADMIN_SECTIONS } from "@/lib/admin-nav";

describe("settings tab redirect map", () => {
  it("maps every old tab slug to an existing admin section", () => {
    const adminHrefs = new Set(
      ALL_ADMIN_SECTIONS.map((section) => section.href),
    );
    for (const [tab, href] of Object.entries(SETTINGS_TAB_REDIRECTS)) {
      expect(adminHrefs.has(href), `tab "${tab}" targets missing ${href}`).toBe(
        true,
      );
    }
  });

  it("covers all 12 former tab slugs", () => {
    expect(Object.keys(SETTINGS_TAB_REDIRECTS).sort()).toEqual(
      [
        "audit",
        "communications",
        "email",
        "emailLog",
        "general",
        "health",
        "locations",
        "memberships",
        "operations",
        "roles",
        "storage",
        "users",
      ].sort(),
    );
  });

  it("sends the old grab-bag operations tab to sign-in", () => {
    expect(resolveSettingsTabHref("operations")).toBe("/admin/sign-in");
  });

  it("sends the email log tab to the email log section", () => {
    expect(resolveSettingsTabHref("emailLog")).toBe("/admin/email-log");
  });

  it("returns null for unknown tabs and when absent", () => {
    expect(resolveSettingsTabHref("api")).toBeNull();
    expect(resolveSettingsTabHref(undefined)).toBeNull();
  });
});
