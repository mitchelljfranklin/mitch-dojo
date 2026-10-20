import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

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
import { getFailedEmailCount } from "@/lib/db/email-log";
import { listOverdueStudents } from "@/lib/db/memberships";
import {
  getMembershipsSettings,
  getOrganizationSettings,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("metaTitle") };
}

export default async function DashboardPage() {
  // The dashboard is the landing page every signed-in staff member reaches —
  // requiring a permission here would redirect to /dashboard in a loop for
  // roles without it. Gate content, not the page itself.
  const user = await requireUser();
  const t = await getTranslations("Dashboard");
  const format = await getFormatter();
  const organization = await getOrganizationSettings();
  const canViewMemberships = hasPermission(
    user.permissions,
    PERMISSIONS.MEMBERSHIPS_VIEW,
  );
  const canViewAudit = hasPermission(user.permissions, PERMISSIONS.AUDIT_VIEW);
  const overdue = canViewMemberships ? await listOverdueStudents(5) : [];
  const { currency } = canViewMemberships
    ? await getMembershipsSettings()
    : { currency: "USD" };
  const failedEmails = canViewAudit ? await getFailedEmailCount() : 0;

  const money = (cents: number) => {
    try {
      return format.number(cents / 100, { style: "currency", currency });
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  };
  const formatDueDate = (date: Date) =>
    format.dateTime(date, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user.name ? t("welcomeNamed", { name: user.name }) : t("welcome")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("overview", { org: organization.name })}
        </p>
      </div>

      {canViewAudit && failedEmails > 0 ? (
        <Link
          href="/admin/email-log?emailStatus=FAILED"
          className="bg-destructive/10 border-destructive/30 hover:bg-destructive/15 flex items-center justify-between gap-4 rounded-md border p-4 transition-colors"
        >
          <div>
            <p className="text-sm font-medium">
              {t("failedEmails", { count: failedEmails })}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("failedEmailsHint")}
            </p>
          </div>
          <Badge variant="destructive">{t("actionNeeded")}</Badge>
        </Link>
      ) : null}

      {canViewMemberships ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t("overdueTitle")}</CardTitle>
              <CardDescription>
                {t("overdueSummary", { count: overdue.length })}
              </CardDescription>
            </div>
            <Link
              href="/memberships/invoices?status=OVERDUE"
              className="text-sm hover:underline"
            >
              {t("viewAll")}
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
                    {t("invoiceDue", {
                      number: row.invoiceNumber,
                      date: formatDueDate(row.dueDate),
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {t("daysOverdue", { days: row.daysOverdue })}
                    </Badge>
                    <span className="text-right">
                      {money(row.balanceCents)}
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
          <CardTitle>{t("startsTitle")}</CardTitle>
          <CardDescription>{t("startsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            {t("startsBodyBefore")}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              Ctrl K
            </kbd>{" "}
            {t("or")}{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>
            {t("startsBodyAfter")}
          </p>
          <Link
            href="/style-guide"
            className="text-muted-foreground hover:text-primary mt-2 inline-block text-xs"
          >
            {t("styleGuide")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
