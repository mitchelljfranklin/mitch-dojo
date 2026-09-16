import { Suspense } from "react";

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

export const metadata = { title: "Admin — Audit log" };

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
  const auditRetention = await getAuditRetention();
  const sp = await searchParams;
  const users = (await listStaffAccounts()).map((account) => ({
    id: account.id,
    name: account.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Administrative and system activity across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>
            Filter by action, user, or date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* The audit query is the slowest on this page — stream it so the
              shell renders immediately. */}
          <Suspense fallback={<PageSkeleton.Content height="h-72" />}>
            <AuditContent sp={sp} users={users} />
          </Suspense>
        </CardContent>
      </Card>

      {canManageSettings ? (
        <Card>
          <CardHeader>
            <CardTitle>Retention</CardTitle>
            <CardDescription>
              Audit rows older than this are pruned by the scheduler. Set 0 to
              keep them forever.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionForm
              action={saveAuditRetentionSettings}
              fieldName="auditRetention"
              label="Keep audit logs for (days)"
              help="Default 0 (keep forever)."
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
  sp,
  users,
}: {
  sp: Record<string, string | undefined>;
  users: { id: string; name: string }[];
}) {
  const auditLogs = await listAuditLogs({
    action: sp.action,
    userId: sp.userId,
    fromDate: sp.fromDate,
    toDate: sp.toDate,
    page: sp.auditPage ? parseInt(sp.auditPage) : 1,
    pageSize: sp.auditPageSize ? parseInt(sp.auditPageSize) : undefined,
  });

  const filterEntries = Object.entries(sp).filter(
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
