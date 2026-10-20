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
import { FlashToast } from "@/components/flash-toast";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getEmailLogRetention } from "@/lib/settings";

import { EmailLogContent } from "../email-log-content";
import { RetentionForm } from "../retention-form";
import { saveEmailLogRetentionSettings } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.emailLog");
  return { title: translate("metaTitle") };
}

export default async function AdminEmailLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const canRetry = hasPermission(user.permissions, PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.emailLog");
  const emailLogRetention = await getEmailLogRetention();
  const query = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {query.emailError ? (
        <FlashToast variant="error" message={query.emailError} />
      ) : null}
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
          {/* The log query is the slowest on this page — stream it so the
              shell renders immediately. */}
          <Suspense fallback={<PageSkeleton.Content height="h-72" />}>
            <EmailLogContent query={query} canRetry={canRetry} />
          </Suspense>
        </CardContent>
      </Card>

      {canRetry ? (
        <Card>
          <CardHeader>
            <CardTitle>{translate("retention.title")}</CardTitle>
            <CardDescription>
              {translate("retention.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionForm
              key={emailLogRetention}
              action={saveEmailLogRetentionSettings}
              fieldName="emailLogRetention"
              label={translate("retention.label")}
              help={translate("retention.help")}
              value={emailLogRetention}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
