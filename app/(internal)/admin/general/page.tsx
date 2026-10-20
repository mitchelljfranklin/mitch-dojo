import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getOrganizationSettings } from "@/lib/settings";

import { OrganizationForm } from "../organization-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — General" };

export default async function AdminGeneralPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const organization = await getOrganizationSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">General</h1>
        <p className="text-muted-foreground text-sm">
          The school identity shown across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Branding shown across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            name={organization.name}
            supportEmail={organization.supportEmail}
            defaultCountry={organization.defaultCountry}
            defaultLocale={organization.defaultLocale}
          />
        </CardContent>
      </Card>
    </div>
  );
}
