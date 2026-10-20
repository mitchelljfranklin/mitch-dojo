import { redirect } from "next/navigation";

import { resolveSettingsTabHref } from "@/lib/admin-redirect";
import { buildFilterQueryString } from "@/lib/nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

// The settings area moved to /admin. Map legacy /settings?tab=<x> deep links
// (bookmarks, dashboard chips, pre-rename integrations) to their new
// sections, forwarding any remaining query params (filters, pagination,
// error toasts — the email log uses distinct names like emailStatus and
// emailLogPage, which survive untouched).
export default async function LegacySettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const target = resolveSettingsTabHref(query.tab) ?? "/admin";

  const { tab: _tab, ...rest } = query;
  const forwardQuery = buildFilterQueryString(rest);

  redirect(forwardQuery ? `${target}?${forwardQuery}` : target);
}
