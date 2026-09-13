import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getCourseProgress } from "@/lib/db/belts";
import { notFound } from "next/navigation";

import { BeltLevelsManager } from "./belt-levels-manager";
import { ProgressTable } from "./progress-table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Belt progression" };

type BeltsCoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function BeltsCoursePage({
  params,
  searchParams,
}: BeltsCoursePageProps) {
  const user = await requirePermission(PERMISSIONS.BELTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.BELTS_EDIT);

  const { courseId } = await params;
  const sp = await searchParams;
  const { course, belts, rows } = await getCourseProgress(courseId);
  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Belts & gradings", href: "/belts" },
          { label: course.name },
        ]}
      />
      {sp.beltError ? (
        <FlashToast variant="error" message={sp.beltError} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {course.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs">
              {course.locationName}
            </span>
            {course.trainerName ? (
              <span className="text-muted-foreground text-xs">
                Trainer: {course.trainerName}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <BeltLevelsManager
        courseId={course.id}
        belts={belts.map((belt) => ({
          id: belt.id,
          name: belt.name,
          colorHex: belt.colorHex,
          order: belt.order,
          requiredTrainings: belt.requiredTrainings,
        }))}
        canEdit={canEdit}
      />

      <ProgressTable
        courseId={course.id}
        belts={belts.map((belt) => ({
          id: belt.id,
          name: belt.name,
          colorHex: belt.colorHex,
          order: belt.order,
          requiredTrainings: belt.requiredTrainings,
        }))}
        rows={rows}
        canEdit={canEdit}
      />
    </div>
  );
}
