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
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listAssignableLocations } from "@/lib/db/locations";
import { prisma } from "@/lib/prisma";
import { getOrganizationSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "New student" };

export default async function NewStudentPage() {
  const user = await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const [locations, disciplines, organization] = await Promise.all([
    listAssignableLocations(),
    prisma.discipline.findMany({
      where: { isActive: true },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    getOrganizationSettings(),
  ]);

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
            disciplines={disciplines}
            defaultCountry={organization.defaultCountry}
            submitLabel="Create student"
            canViewMedical={hasPermission(
              user.permissions,
              PERMISSIONS.STUDENTS_MEDICAL,
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
