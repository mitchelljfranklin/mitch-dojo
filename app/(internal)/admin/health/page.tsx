import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

import { HealthTab } from "../health-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.health");
  return { title: translate("metaTitle") };
}

export default async function AdminHealthPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.health");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>
      <HealthTab />
    </div>
  );
}
