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

export const metadata = { title: "Admin — Memberships" };

export default async function AdminMembershipsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const membershipsSettings = await getMembershipsSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
        <p className="text-muted-foreground text-sm">
          Currency display, invoice due dates, and overdue behaviour.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Memberships & payments</CardTitle>
          <CardDescription>
            Plans are managed on the Memberships page; these are the school-wide
            billing rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembershipsForm
            currency={membershipsSettings.currency}
            invoiceDueDays={membershipsSettings.invoiceDueDays}
            suspendAfterOverdueDays={
              membershipsSettings.suspendAfterOverdueDays
            }
            autoGenerateInvoices={membershipsSettings.autoGenerateInvoices}
          />
        </CardContent>
      </Card>
    </div>
  );
}
