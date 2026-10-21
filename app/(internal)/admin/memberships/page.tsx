import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getMembershipsSettings } from "@/lib/settings";

import { MembershipsForm } from "../memberships-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.memberships");
  return { title: translate("metaTitle") };
}

export default async function AdminMembershipsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.memberships");
  const membershipsSettings = await getMembershipsSettings();

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
          <MembershipsForm
            currency={membershipsSettings.currency}
            invoiceDueDays={membershipsSettings.invoiceDueDays}
            suspendAfterOverdueDays={
              membershipsSettings.suspendAfterOverdueDays
            }
            autoGenerateInvoices={membershipsSettings.autoGenerateInvoices}
            taxRatePercent={membershipsSettings.taxRatePercent}
            taxLabel={membershipsSettings.taxLabel}
            blockCheckinOnOutstandingAgreements={
              membershipsSettings.blockCheckinOnOutstandingAgreements
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
