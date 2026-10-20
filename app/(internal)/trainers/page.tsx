import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listTrainers } from "@/lib/db/trainers";
import { getVerificationSummaries } from "@/lib/db/verifications";

import { TrainersManager } from "./trainers-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Trainers");
  return { title: translate("metaTitle") };
}

export default async function TrainersPage() {
  const user = await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.CLASSES_EDIT);
  const translate = await getTranslations("Trainers");

  const [trainers, summaries] = await Promise.all([
    listTrainers(),
    getVerificationSummaries(),
  ]);
  const empty = { expired: 0, expiring: 0, missing: 0 };
  const trainersWithVerifications = trainers.map((trainer) => ({
    ...trainer,
    verifications: summaries.get(trainer.id) ?? empty,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/classes">{translate("actions.viewCourses")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/classes/schedule">
              {translate("actions.schedule")}
            </Link>
          </Button>
        </div>
      </div>

      <TrainersManager trainers={trainersWithVerifications} canEdit={canEdit} />
    </div>
  );
}
