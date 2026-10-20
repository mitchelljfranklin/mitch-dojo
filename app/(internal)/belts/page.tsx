import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import { AddDisciplineButton } from "./add-discipline-button";
import { deleteDisciplineAction } from "@/lib/actions/belts";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listDisciplines } from "@/lib/db/belts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Belts");
  return { title: translate("metaTitle") };
}

type BeltsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BeltsPage({ searchParams }: BeltsPageProps) {
  const user = await requirePermission(PERMISSIONS.BELTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.BELTS_EDIT);
  const disciplines = await listDisciplines();
  const query = await searchParams;
  const translate = await getTranslations("Belts");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: translate("title") }]} />
      {query.disciplineError ? (
        <FlashToast variant="error" message={query.disciplineError} />
      ) : null}
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
          {canEdit ? (
            <>
              <AddDisciplineButton />
              <Button asChild variant="outline">
                <Link href="/belts/import">
                  {translate("actions.importHistory")}
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {disciplines.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{translate("empty.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {translate("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disciplines.map((discipline) => (
            <div key={discipline.id} className="relative">
              <Link href={`/belts/${discipline.id}`}>
                <Card className="hover:bg-accent/40 h-full transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate">
                        {discipline.name}
                      </CardTitle>
                      {discipline.isActive ? null : (
                        <Badge variant="outline" className="shrink-0">
                          {translate("card.inactive")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    {translate("card.beltCount", {
                      count: discipline._count.beltRangeEntries,
                    })}{" "}
                    ·{" "}
                    {translate("card.courseCount", {
                      count: discipline._count.courses,
                    })}
                  </CardContent>
                </Card>
              </Link>
              {canEdit && discipline._count.courses === 0 ? (
                <form
                  id={`delete-discipline-${discipline.id}`}
                  action={deleteDisciplineAction}
                  className="absolute top-2 right-2"
                >
                  <input
                    type="hidden"
                    name="disciplineId"
                    value={discipline.id}
                  />
                  <ConfirmDialog
                    title={translate("delete.title", { name: discipline.name })}
                    description={translate("delete.description")}
                    confirmLabel={translate("delete.confirm")}
                  >
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="text-destructive h-7 px-2 text-xs"
                    >
                      {translate("delete.confirm")}
                    </Button>
                  </ConfirmDialog>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
