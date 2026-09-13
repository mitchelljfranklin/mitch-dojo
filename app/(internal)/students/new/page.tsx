import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentForm } from "@/components/student-form";
import { createStudentAction } from "@/lib/actions/students";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listAssignableLocations } from "@/lib/db/locations";

export const dynamic = "force-dynamic";

export const metadata = { title: "New student" };

export default async function NewStudentPage() {
  await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const locations = await listAssignableLocations();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[{ label: "Students", href: "/students" }, { label: "New" }]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">New student</h1>
      <Card>
        <CardHeader>
          <CardTitle>Student details</CardTitle>
          <CardDescription>
            Add a new student and assign them to dojo locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            action={createStudentAction}
            locations={locations}
            submitLabel="Create student"
          />
        </CardContent>
      </Card>
    </div>
  );
}
