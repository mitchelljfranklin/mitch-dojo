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
import { getAppearanceSettings } from "@/lib/settings";

import { AppearanceForm } from "../appearance-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.appearance");
  return { title: translate("metaTitle") };
}

export default async function AdminAppearancePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.appearance");
  const appearance = await getAppearanceSettings();

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
