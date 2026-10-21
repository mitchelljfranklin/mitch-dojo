import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCronSettings } from "@/lib/settings";

import { SchedulingForm } from "../scheduling-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.scheduling");
  return { title: translate("metaTitle") };
}

export default async function AdminSchedulingPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.scheduling");
  const [cronLastRunRow, cronSettings] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "cron.lastRun" } }),
    getCronSettings(),
  ]);
  const cronLastRun =
    cronLastRunRow && typeof cronLastRunRow.value === "string"
      ? cronLastRunRow.value
      : null;

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
          <SchedulingForm
            cronLastRun={cronLastRun}
            internalSchedulerEnabled={cronSettings.internalSchedulerEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
