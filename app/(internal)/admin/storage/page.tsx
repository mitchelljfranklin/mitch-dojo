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
import { getStorageSettingsView } from "@/lib/settings";

import { StorageForm } from "../storage-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.storage");
  return { title: translate("metaTitle") };
}

export default async function AdminStoragePage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.storage");
  const storageSettings = await getStorageSettingsView();

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
          <StorageForm defaults={storageSettings} />
        </CardContent>
      </Card>
    </div>
  );
}
