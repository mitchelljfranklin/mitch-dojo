import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseForm } from "@/components/course-form";
import { updateCourseAction } from "@/lib/actions/courses";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCourse } from "@/lib/db/courses";
import { listAssignableLocations } from "@/lib/db/locations";
import { listDisciplines } from "@/lib/db/belts";
import { listTrainers } from "@/lib/db/trainers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Classes");
  return { title: translate("page.editTitle") };
}

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const translate = await getTranslations("Classes");
  const { courseId } = await params;
  const [course, locations, disciplines, trainers] = await Promise.all([
    getCourse(courseId),
    listAssignableLocations(),
    listDisciplines(),
    listTrainers(),
  ]);
  if (!course) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translate("title"), href: "/classes" },
          { label: course.name, href: `/classes/${course.id}` },
          { label: translate("page.editBreadcrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translate("page.editTitle")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translate("page.detailsTitle")}</CardTitle>
          <CardDescription>{translate("page.editDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={updateCourseAction}
            courseId={course.id}
            locations={locations}
            disciplines={disciplines.map((discipline) => ({
              id: discipline.id,
              name: discipline.name,
              isActive: discipline.isActive,
            }))}
            trainers={trainers.map((trainer) => ({
              id: trainer.id,
              name: trainer.name,
            }))}
            submitLabel={translate("form.save")}
            values={{
              name: course.name,
              description: course.description,
              locationId: course.locationId,
              disciplineId: course.disciplineId,
              trainerId: course.trainerId,
              isActive: course.isActive,
              trainingTimes: course.trainingTimes.map((slot) => ({
                weekday: slot.weekday,
                startTime: slot.startTime,
                endTime: slot.endTime,
                trialBookable: slot.trialBookable,
                capacity: slot.capacity,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
