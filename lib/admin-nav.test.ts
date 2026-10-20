import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import es from "../messages/es.json";
import {
  ADMIN_SECTION_GROUPS,
  ALL_ADMIN_SECTIONS,
  ADMIN_AREA_PERMISSIONS,
  canAccessAdminArea,
  firstAccessibleAdminHref,
  findAdminSectionByHref,
  listAccessibleAdminSections,
} from "@/lib/admin-nav";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";

describe("admin nav definition", () => {
  it("exposes every former settings tab as a section", () => {
    const hrefs = ALL_ADMIN_SECTIONS.map((section) => section.href);
    expect(hrefs).toEqual([
      "/admin/general",
      "/admin/appearance",
      "/admin/storage",
      "/admin/memberships",
      "/admin/communications",
      "/admin/documents",
      "/admin/verifications",
      "/admin/email",
      "/admin/templates",
      "/admin/campaigns",
      "/admin/email-log",
      "/admin/locations",
      "/admin/users",
      "/admin/roles",
      "/admin/sign-in",
      "/admin/audit",
      "/admin/scheduling",
      "/admin/health",
    ]);
  });

  it("resolves every section by its own href", () => {
    for (const section of ALL_ADMIN_SECTIONS) {
      expect(findAdminSectionByHref(section.href)?.labelKey).toBe(
        section.labelKey,
      );
    }
  });

  it("shows a full admin every section", () => {
    const accessible = listAccessibleAdminSections([...ALL_PERMISSIONS]);
    expect(accessible).toHaveLength(ALL_ADMIN_SECTIONS.length);
    expect(firstAccessibleAdminHref([...ALL_PERMISSIONS])).toBe(
      "/admin/general",
    );
  });

  it("shows an audit-only role only the audit sections", () => {
    const accessible = listAccessibleAdminSections([PERMISSIONS.AUDIT_VIEW]);
    expect(accessible.map((section) => section.href)).toEqual([
      "/admin/email-log",
      "/admin/audit",
    ]);
    expect(firstAccessibleAdminHref([PERMISSIONS.AUDIT_VIEW])).toBe(
      "/admin/email-log",
    );
  });

  it("shows a locations-manager only the locations section", () => {
    const accessible = listAccessibleAdminSections([
      PERMISSIONS.LOCATIONS_EDIT,
    ]);
    expect(accessible.map((section) => section.href)).toEqual([
      "/admin/locations",
    ]);
  });

  it("shows a users-manager only the users section", () => {
    const accessible = listAccessibleAdminSections([PERMISSIONS.USERS_MANAGE]);
    expect(accessible.map((section) => section.href)).toEqual(["/admin/users"]);
  });

  it("denies the whole area with no admin permissions", () => {
    expect(
      listAccessibleAdminSections([PERMISSIONS.PROFILE_VIEW]),
    ).toHaveLength(0);
    expect(firstAccessibleAdminHref([])).toBeNull();
    expect(canAccessAdminArea([PERMISSIONS.PROFILE_VIEW])).toBe(false);
  });

  it("derives the area gate from the sections themselves", () => {
    const expected = [
      ...new Set(ALL_ADMIN_SECTIONS.map((section) => section.permission)),
    ];
    expect(ADMIN_AREA_PERMISSIONS).toEqual(expected);
    expect(canAccessAdminArea([expected[0]])).toBe(true);
  });

  it("keeps group labels unique", () => {
    const labels = ADMIN_SECTION_GROUPS.map((group) => group.labelKey);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("has a translated group and section label in every catalog", () => {
    const groupLabels = en.Nav.admin.groups as Record<string, string>;
    const sectionLabels = en.Nav.admin.sections as Record<string, string>;
    const spanishGroupLabels = es.Nav.admin.groups as Record<string, string>;
    const spanishSectionLabels = es.Nav.admin.sections as Record<
      string,
      string
    >;

    for (const group of ADMIN_SECTION_GROUPS) {
      expect(groupLabels[group.labelKey], group.labelKey).toBeTruthy();
      expect(spanishGroupLabels[group.labelKey], group.labelKey).toBeTruthy();
      for (const section of group.sections) {
        expect(sectionLabels[section.labelKey], section.labelKey).toBeTruthy();
        expect(
          spanishSectionLabels[section.labelKey],
          section.labelKey,
        ).toBeTruthy();
      }
    }
  });
});
