import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listOverdueStudents } from "@/lib/db/memberships";
import {
  getMembershipsSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The dashboard is the landing page every signed-in staff member reaches —
  // requiring a permission here would redirect to /dashboard in a loop for
  // roles without it. Gate content, not the page itself.
  const user = await requireUser();
  const organization = await getOrganizationSettings();
  const canViewMemberships = hasPermission(
    user.permissions,
    PERMISSIONS.MEMBERSHIPS_VIEW,
  );
  const overdue = canViewMemberships ? await listOverdueStudents(5) : [];
  const { currency } = canViewMemberships
    ? await getMembershipsSettings()
    : { currency: "USD" };

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

      {canViewMemberships ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Overdue payments</CardTitle>
              <CardDescription>
                {overdue.length === 0
                  ? "No overdue invoices — all memberships are current."
                  : `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"}.`}
              </CardDescription>
            </div>
            <Link
              href="/memberships/invoices?status=OVERDUE"
              className="text-sm hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          {overdue.length > 0 ? (
            <CardContent className="flex flex-col gap-2">
              {overdue.map((row) => (
                <Link
                  key={row.invoiceId}
                  href={`/memberships/invoices/${row.invoiceId}`}
                  className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="font-medium">{row.studentName}</span>
                  <span className="text-muted-foreground text-xs">
                    #{row.invoiceNumber} · due {formatDate(row.dueDate)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {row.daysOverdue}d overdue
                    </Badge>
                    <span className="text-right">
                      {formatMoney(row.balanceCents, currency)}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your dojo starts here</CardTitle>
          <CardDescription>
            Use the sidebar to manage students, classes, attendance, belts, and
            memberships.
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
