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

export const metadata = { title: "Admin — Scheduling" };

export default async function AdminSchedulingPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
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
        <h1 className="text-2xl font-semibold tracking-tight">Scheduling</h1>
        <p className="text-muted-foreground text-sm">
          The built-in scheduler and its reminders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduler</CardTitle>
          <CardDescription>
            Class, payment, birthday, and trial reminders; recurring invoice
            generation; log pruning; the orphaned-file sweep.
          </CardDescription>
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
