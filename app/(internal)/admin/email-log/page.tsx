import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageSkeleton } from "@/components/page-skeleton";
import { FlashToast } from "@/components/flash-toast";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getEmailLogRetention } from "@/lib/settings";

import { EmailLogContent } from "../email-log-content";
import { RetentionForm } from "../retention-form";
import { saveEmailLogRetentionSettings } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Email log" };

type AdminEmailLogPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminEmailLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const canRetry = hasPermission(user.permissions, PERMISSIONS.SETTINGS_MANAGE);
  const emailLogRetention = await getEmailLogRetention();
  const sp = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {sp.emailError ? (
        <FlashToast variant="error" message={sp.emailError} />
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email log</h1>
        <p className="text-muted-foreground text-sm">
          Every email the platform sent, with delivery status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email log</CardTitle>
          <CardDescription>
            Failed emails can be retried with the current templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* The log query is the slowest on this page — stream it so the
              shell renders immediately. */}
          <Suspense fallback={<PageSkeleton.Content height="h-72" />}>
            <EmailLogContent sp={sp} canRetry={canRetry} />
          </Suspense>
        </CardContent>
      </Card>

      {canRetry ? (
        <Card>
          <CardHeader>
            <CardTitle>Retention</CardTitle>
            <CardDescription>
              Email log rows older than this are pruned by the scheduler. Set 0
              to keep them forever.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionForm
              action={saveEmailLogRetentionSettings}
              fieldName="emailLogRetention"
              label="Keep email logs for (days)"
              help="Default 14 days."
              value={emailLogRetention}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
