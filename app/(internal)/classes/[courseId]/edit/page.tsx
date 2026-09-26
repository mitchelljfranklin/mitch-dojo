import { notFound } from "next/navigation";

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

export const metadata = { title: "Edit course" };

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
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
          { label: "Classes", href: "/classes" },
          { label: course.name, href: `/classes/${course.id}` },
          { label: "Edit" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">Edit course</h1>
      <Card>
        <CardHeader>
          <CardTitle>Course details</CardTitle>
          <CardDescription>
            Updating training times regenerates upcoming sessions from the new
            slots; sessions that already have attendance are kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={updateCourseAction}
            courseId={course.id}
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
            submitLabel="Save changes"
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
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
