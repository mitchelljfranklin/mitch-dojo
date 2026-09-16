// Back-compat mapping from the old /settings?tab=<value> URLs to their new
// /admin/<section> routes. The /settings shim page uses this to redirect
// deep links (bookmarks, dashboard chips, older integrations) without
// breaking them.

export const SETTINGS_TAB_REDIRECTS: Readonly<Record<string, string>> = {
  general: "/admin/general",
  memberships: "/admin/memberships",
  communications: "/admin/communications",
  // The old grab-bag "operations" tab: session/login limits are its
  // largest, most targeted group and now live on Sign-in. The audit and
  // email-log retention knobs moved to their feature pages, and the
  // scheduler toggle to Scheduling.
  operations: "/admin/sign-in",
  storage: "/admin/storage",
  email: "/admin/email",
  health: "/admin/health",
  locations: "/admin/locations",
  users: "/admin/users",
  roles: "/admin/roles",
  audit: "/admin/audit",
  emailLog: "/admin/email-log",
};

export function resolveSettingsTabHref(tab: string | undefined): string | null {
  if (!tab) return null;
  return SETTINGS_TAB_REDIRECTS[tab] ?? null;
}
