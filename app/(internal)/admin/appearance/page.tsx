import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAppearanceSettings } from "@/lib/settings";

import { AppearanceForm } from "../appearance-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Appearance" };

export default async function AdminAppearancePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const appearance = await getAppearanceSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appearance</h1>
        <p className="text-muted-foreground text-sm">
          Logo, colours, booking-page copy, and layout.
        </p>
      </div>

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
            hasLogoDark={Boolean(appearance.logoDarkKey)}
            logoDarkKey={appearance.logoDarkKey ?? ""}
            emailLogoVariant={appearance.emailLogoVariant}
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
