import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getDisciplineProgress } from "@/lib/db/belts";
import { getDisciplineWithBelts } from "@/lib/db/belts";

import { BeltLadderManager } from "./belt-ladder-manager";
import { ProgressTable } from "./progress-table";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Belts");
  return { title: t("discipline.metaTitle") };
}

type DisciplineProgressPageProps = {
  params: Promise<{ disciplineId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function DisciplineProgressPage({
  params,
  searchParams,
}: DisciplineProgressPageProps) {
  const user = await requirePermission(PERMISSIONS.BELTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts");

  const { disciplineId } = await params;
  const sp = await searchParams;
  const [progress, withBelts] = await Promise.all([
    getDisciplineProgress(disciplineId),
    getDisciplineWithBelts(disciplineId),
  ]);
  if (!progress.discipline || !withBelts) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: t("title"), href: "/belts" },
          { label: progress.discipline.name },
        ]}
      />
      {sp.beltError ? (
        <FlashToast variant="error" message={sp.beltError} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {progress.discipline.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {t("discipline.beltsBadge", { count: progress.belts.length })}
            </Badge>
            {progress.discipline.isActive ? null : (
              <Badge variant="outline">{t("discipline.inactive")}</Badge>
            )}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/belts/${disciplineId}/gradings`}>
            {t("discipline.gradings")}
          </Link>
        </Button>
      </div>

      <BeltLadderManager
        disciplineId={disciplineId}
        belts={progress.belts.map((belt) => ({
          id: belt.id,
          name: belt.name,
          colorHex: belt.colorHex,
          order: belt.order,
          requiredTrainings: belt.requiredTrainings,
        }))}
        canEdit={canEdit}
      />

      <ProgressTable
        disciplineId={disciplineId}
        belts={progress.belts.map((belt) => ({
          id: belt.id,
          name: belt.name,
          colorHex: belt.colorHex,
          order: belt.order,
          requiredTrainings: belt.requiredTrainings,
        }))}
        rows={progress.rows}
        canEdit={canEdit}
      />
    </div>
  );
}
