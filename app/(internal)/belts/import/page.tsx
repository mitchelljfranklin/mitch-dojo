import { Breadcrumbs } from "@/components/breadcrumbs";
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

export const metadata = { title: "Import belt history" };

export default async function ImportBeltHistoryPage() {
  await requirePermission(PERMISSIONS.BELTS_EDIT);
  const disciplines = await listDisciplines();
  const activeDisciplines = disciplines.filter((d) => d.isActive);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Belts & gradings", href: "/belts" },
          { label: "Import history" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        Import belt history
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
          <CardDescription>
            Import your students&apos; existing grading history. Promotions are
            appended to each student&apos;s history — their current belt is the
            latest dated row.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="mb-2 font-medium">Columns</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>Email</code> — student email, or <code>FirstName</code> +{" "}
                <code>LastName</code>
              </li>
              <li>
                <code>Belt</code> — required, exact belt name in the selected
                discipline&apos;s ladder (belts are not auto-created)
              </li>
              <li>
                <code>AwardedAt</code> — required, YYYY-MM-DD (today or earlier)
              </li>
              <li>
                <code>Notes</code> — optional
              </li>
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">
              Students are matched school-wide (rank is global per discipline).
              Rows referring to unknown belts or students are reported as errors
              and skipped. Duplicate student+belt+date rows are skipped so
              re-running an import is safe.
            </p>
          </div>
          {activeDisciplines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No disciplines exist yet — create one on the Belts & gradings page
              first.
            </p>
          ) : (
            <BeltImportForm
              disciplines={activeDisciplines.map((d) => ({
                id: d.id,
                name: d.name,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
