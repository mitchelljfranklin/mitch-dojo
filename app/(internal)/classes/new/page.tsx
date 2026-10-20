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
import { CourseForm } from "@/components/course-form";
import { createCourseAction } from "@/lib/actions/courses";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listAssignableLocations } from "@/lib/db/locations";
import { listDisciplines } from "@/lib/db/belts";
import { listTrainers } from "@/lib/db/trainers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Classes");
  return { title: t("page.newTitle") };
}

export default async function NewCoursePage() {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const t = await getTranslations("Classes");
  const [locations, disciplines, trainers] = await Promise.all([
    listAssignableLocations(),
    listDisciplines(),
    listTrainers(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: t("title"), href: "/classes" },
          { label: t("page.newBreadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("page.newTitle")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("page.detailsTitle")}</CardTitle>
          <CardDescription>{t("page.createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={createCourseAction}
            locations={locations}
            disciplines={disciplines.map((d) => ({
              id: d.id,
              name: d.name,
              isActive: d.isActive,
            }))}
            trainers={trainers.map((trainer) => ({
              id: trainer.id,
              name: trainer.name,
            }))}
            submitLabel={t("form.create")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
