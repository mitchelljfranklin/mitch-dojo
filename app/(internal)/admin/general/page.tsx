import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAppearanceSettings, getOrganizationSettings } from "@/lib/settings";

import { AppearanceForm } from "../appearance-form";
import { OrganizationForm } from "../organization-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — General" };

export default async function AdminGeneralPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const [organization, appearance] = await Promise.all([
    getOrganizationSettings(),
    getAppearanceSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">General</h1>
        <p className="text-muted-foreground text-sm">
          Branding, defaults, and the look of the platform.
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
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customise the logo, colours, booking page copy, and layout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceForm
            primaryHex={appearance.primaryHex}
            secondaryHex={appearance.secondaryHex}
            hasLogo={Boolean(appearance.logoKey)}
            logoKey={appearance.logoKey ?? ""}
            borderRadius={appearance.borderRadius}
            pageWidth={appearance.pageWidth}
            bookingHeadline={appearance.bookingHeadline}
            bookingDescription={appearance.bookingDescription}
          />
        </CardContent>
      </Card>
    </div>
  );
}
