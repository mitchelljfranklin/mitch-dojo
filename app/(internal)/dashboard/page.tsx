import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getOrganizationSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The dashboard is the landing page every signed-in staff member reaches —
  // requiring a permission here would redirect to /dashboard in a loop for
  // roles without it. Gate content, not the page itself.
  const user = await requireUser();
  const organization = await getOrganizationSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          {organization.name} — dojo management overview.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your dojo starts here</CardTitle>
          <CardDescription>
            Students, classes, attendance, and belt progress will appear here as
            each module lands. Student management (Phase 1) is up next.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            The scaffold is live: authentication, roles, settings, audit log,
            and the scheduler are running. Use the command palette (
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              Ctrl K
            </kbd>{" "}
            or{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>
            ) to jump between pages.
          </p>
          <Link
            href="/style-guide"
            className="text-muted-foreground hover:text-primary mt-2 inline-block text-xs"
          >
            View the component style guide →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
