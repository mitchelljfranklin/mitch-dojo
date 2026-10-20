import { Breadcrumbs } from "@/components/breadcrumbs";
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
import { listDisciplines } from "@/lib/db/belts";

import { BeltImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Belts.import");
  return { title: t("metaTitle") };
}

export default async function ImportBeltHistoryPage() {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts.import");
  const beltsT = await getTranslations("Belts");
  const disciplines = await listDisciplines();
  const activeDisciplines = disciplines.filter((d) => d.isActive);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: beltsT("title"), href: "/belts" },
          { label: t("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="mb-2 font-medium">{t("columns")}</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>Email</code> — {t("studentLine")}
              </li>
              <li>
                <code>Belt</code> — {t("beltLine")}
              </li>
              <li>
                <code>AwardedAt</code> — {t("dateLine")}
              </li>
              <li>
                <code>Notes</code> — {t("notesLine")}
              </li>
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">{t("note")}</p>
          </div>
          {activeDisciplines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("noDisciplines")}
            </p>
          ) : (
            <BeltImportForm
              disciplines={activeDisciplines.map((discipline) => ({
                id: discipline.id,
                name: discipline.name,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
