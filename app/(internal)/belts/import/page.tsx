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
  const translate = await getTranslations("Belts.import");
  return { title: translate("metaTitle") };
}

export default async function ImportBeltHistoryPage() {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const translate = await getTranslations("Belts.import");
  const translateBelts = await getTranslations("Belts");
  const disciplines = await listDisciplines();
  const activeDisciplines = disciplines.filter(
    (discipline) => discipline.isActive,
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateBelts("title"), href: "/belts" },
          { label: translate("breadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translate("title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="mb-2 font-medium">{translate("columns")}</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>Email</code> — {translate("studentLine")}
              </li>
              <li>
                <code>Belt</code> — {translate("beltLine")}
              </li>
              <li>
                <code>AwardedAt</code> — {translate("dateLine")}
              </li>
              <li>
                <code>Notes</code> — {translate("notesLine")}
              </li>
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">
              {translate("note")}
            </p>
          </div>
          {activeDisciplines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("noDisciplines")}
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
