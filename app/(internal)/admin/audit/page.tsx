import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageSkeleton } from "@/components/page-skeleton";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getAuditRetention } from "@/lib/settings";
import { listStaffAccounts } from "@/lib/db/users";

import { AuditForm } from "../audit-form";
import { RetentionForm } from "../retention-form";
import { listAuditLogs, listAuditActions } from "@/lib/db/audit";
import { saveAuditRetentionSettings } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.audit");
  return { title: translate("metaTitle") };
}

type AdminAuditPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminAuditPage({
  searchParams,
}: AdminAuditPageProps) {
  const user = await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const canManageSettings = hasPermission(
    user.permissions,
    PERMISSIONS.SETTINGS_MANAGE,
  );
  const translate = await getTranslations("Admin.audit");
  const auditRetention = await getAuditRetention();
  const query = await searchParams;
  const users = (await listStaffAccounts()).map((account) => ({
    id: account.id,
    name: account.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* The audit query is the slowest on this page — stream it so the
              shell renders immediately. */}
          <Suspense fallback={<PageSkeleton.Content height="h-72" />}>
            <AuditContent query={query} users={users} />
          </Suspense>
        </CardContent>
      </Card>

      {canManageSettings ? (
        <Card>
          <CardHeader>
            <CardTitle>{translate("retention.title")}</CardTitle>
            <CardDescription>
              {translate("retention.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionForm
              key={auditRetention}
              action={saveAuditRetentionSettings}
              fieldName="auditRetention"
              label={translate("retention.label")}
              help={translate("retention.help")}
              value={auditRetention}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// Streams the audit log separately so the heavy listAuditLogs query never
// blocks the page shell.
async function AuditContent({
  query,
  users,
}: {
  query: Record<string, string | undefined>;
  users: { id: string; name: string }[];
}) {
  const auditLogs = await listAuditLogs({
    action: query.action,
    userId: query.userId,
    fromDate: query.fromDate,
    toDate: query.toDate,
    page: query.auditPage ? parseInt(query.auditPage) : 1,
    pageSize: query.auditPageSize ? parseInt(query.auditPageSize) : undefined,
  });

  const filterEntries = Object.entries(query).filter(
    ([key, value]) =>
      ["action", "userId", "fromDate", "toDate"].includes(key) && value,
  ) as [string, string][];
  const filterQuery = new URLSearchParams(filterEntries).toString();

  return (
    <AuditForm
      result={auditLogs}
      actions={listAuditActions()}
      users={users}
      filterQuery={filterQuery}
    />
  );
}
