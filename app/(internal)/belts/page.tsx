import Link from "next/link";

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

export const metadata = { title: "Belts & gradings" };

type BeltsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BeltsPage({ searchParams }: BeltsPageProps) {
  const user = await requirePermission(PERMISSIONS.BELTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.BELTS_EDIT);
  const disciplines = await listDisciplines();
  const sp = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: "Belts & gradings" }]} />
      {sp.disciplineError ? (
        <FlashToast variant="error" message={sp.disciplineError} />
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Belts & gradings
          </h1>
          <p className="text-muted-foreground text-sm">
            Belt ladders and student progression per discipline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/classes">View courses</Link>
          </Button>
          {canEdit ? (
            <>
              <AddDisciplineButton />
              <Button asChild variant="outline">
                <Link href="/belts/import">Import history</Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {disciplines.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No disciplines yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Create a discipline (e.g. Karate, Jujitsu) to set up its belt
              ladder. Courses are linked to a discipline so progression is
              shared across all locations teaching it.
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
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    {discipline._count.beltRangeEntries} belt
                    {discipline._count.beltRangeEntries === 1 ? "" : "s"} ·{" "}
                    {discipline._count.courses} course
                    {discipline._count.courses === 1 ? "" : "s"}
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
                    title={`Delete ${discipline.name}?`}
                    description="The discipline and its belt ladder will be permanently removed."
                    confirmLabel="Delete"
                  >
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="text-destructive h-7 px-2 text-xs"
                    >
                      Delete
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
