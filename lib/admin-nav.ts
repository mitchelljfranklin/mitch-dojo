import { type Permission, PERMISSIONS, hasPermission } from "@/lib/permissions";

// The admin area's sections and groups, in display order. This is the single
// source of truth for the admin sidebar, the header gear icon's landing
// target, and the /admin index redirect — all three must agree on which
// sections exist and who can see them.
//
// Sections carry the same permission keys the old settings tabs enforced.
// A section the user cannot access is hidden, never greyed out. Labels live in
// the message catalogs under Nav.admin, keyed by labelKey.

export type AdminSection = {
  labelKey: string;
  href: string;
  permission: Permission;
};

export type AdminSectionGroup = {
  labelKey: string;
  sections: AdminSection[];
};

export const ADMIN_SECTION_GROUPS: readonly AdminSectionGroup[] = [
  {
    labelKey: "workspace",
    sections: [
      {
        labelKey: "general",
        href: "/admin/general",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        labelKey: "appearance",
        href: "/admin/appearance",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    labelKey: "storage",
    sections: [
      {
        labelKey: "storage",
        href: "/admin/storage",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    labelKey: "programs",
    sections: [
      {
        labelKey: "memberships",
        href: "/admin/memberships",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        labelKey: "communications",
        href: "/admin/communications",
        permission: PERMISSIONS.COMMUNICATIONS_EDIT,
      },
      {
        labelKey: "documents",
        href: "/admin/documents",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        labelKey: "verifications",
        href: "/admin/verifications",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    labelKey: "email",
    sections: [
      {
        labelKey: "email",
        href: "/admin/email",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        labelKey: "templates",
        href: "/admin/templates",
        permission: PERMISSIONS.COMMUNICATIONS_EDIT,
      },
      {
        labelKey: "campaigns",
        href: "/admin/campaigns",
        permission: PERMISSIONS.COMMUNICATIONS_EDIT,
      },
      {
        labelKey: "emailLog",
        href: "/admin/email-log",
        permission: PERMISSIONS.AUDIT_VIEW,
      },
    ],
  },
  {
    labelKey: "locations",
    sections: [
      {
        labelKey: "locations",
        href: "/admin/locations",
        permission: PERMISSIONS.LOCATIONS_EDIT,
      },
    ],
  },
  {
    labelKey: "access",
    sections: [
      {
        labelKey: "users",
        href: "/admin/users",
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        labelKey: "roles",
        href: "/admin/roles",
        permission: PERMISSIONS.ROLES_MANAGE,
      },
      {
        labelKey: "signIn",
        href: "/admin/sign-in",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
  {
    labelKey: "platform",
    sections: [
      {
        labelKey: "audit",
        href: "/admin/audit",
        permission: PERMISSIONS.AUDIT_VIEW,
      },
      {
        labelKey: "scheduling",
        href: "/admin/scheduling",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
      {
        labelKey: "health",
        href: "/admin/health",
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
];

export const ALL_ADMIN_SECTIONS: readonly AdminSection[] =
  ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);

export function findAdminSectionByHref(href: string): AdminSection | undefined {
  return ALL_ADMIN_SECTIONS.find((section) => section.href === href);
}

export function canAccessAdminSection(
  permissions: readonly string[],
  section: AdminSection,
): boolean {
  return hasPermission(permissions, section.permission);
}

export function listAccessibleAdminSections(
  permissions: readonly string[],
): AdminSection[] {
  return ALL_ADMIN_SECTIONS.filter((section) =>
    canAccessAdminSection(permissions, section),
  );
}

export function firstAccessibleAdminHref(
  permissions: readonly string[],
): string | null {
  return listAccessibleAdminSections(permissions)[0]?.href ?? null;
}

// Permissions that grant any visibility of the admin area — gates the header
// gear icon and the /admin route guard.
export const ADMIN_AREA_PERMISSIONS: readonly Permission[] = [
  ...new Set(ALL_ADMIN_SECTIONS.map((section) => section.permission)),
];

export function canAccessAdminArea(permissions: readonly string[]): boolean {
  return ADMIN_AREA_PERMISSIONS.some((permission) =>
    hasPermission(permissions, permission),
  );
}
