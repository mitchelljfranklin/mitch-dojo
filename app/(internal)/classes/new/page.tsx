import { Breadcrumbs } from "@/components/breadcrumbs";
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
import { listTrainers } from "@/lib/db/trainers";

export const dynamic = "force-dynamic";

export const metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requirePermission(PERMISSIONS.CLASSES_EDIT);
  const [locations, trainers] = await Promise.all([
    listAssignableLocations(),
    listTrainers(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[{ label: "Classes", href: "/classes" }, { label: "New" }]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">New course</h1>
      <Card>
        <CardHeader>
          <CardTitle>Course details</CardTitle>
          <CardDescription>
            Create a course and its recurring weekly training times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm
            action={createCourseAction}
            locations={locations}
            trainers={trainers.map((trainer) => ({
              id: trainer.id,
              name: trainer.name,
            }))}
            submitLabel="Create course"
          />
        </CardContent>
      </Card>
    </div>
  );
}
