import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudentForm } from "@/components/student-form";
import { updateStudentAction } from "@/lib/actions/students";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { listAssignableLocations } from "@/lib/db/locations";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit student" };

type EditStudentPageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const { studentId } = await params;
  const [student, locations] = await Promise.all([
    getStudent(studentId),
    listAssignableLocations(),
  ]);
  if (!student) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Students", href: "/students" },
          {
            label: `${student.firstName} ${student.lastName}`,
            href: `/students/${student.id}`,
          },
          { label: "Edit" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">Edit student</h1>
      <Card>
        <CardHeader>
          <CardTitle>Student details</CardTitle>
          <CardDescription>Update profile and dojo locations.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            action={updateStudentAction}
            studentId={student.id}
            locations={locations}
            submitLabel="Save changes"
            values={{
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email ?? "",
              phone: student.phone ?? "",
              dateOfBirth: student.dateOfBirth
                ? student.dateOfBirth.toISOString().slice(0, 10)
                : "",
              emergencyContactName: student.emergencyContactName ?? "",
              emergencyContactPhone: student.emergencyContactPhone ?? "",
              guardianName: student.guardianName ?? "",
              guardianEmail: student.guardianEmail ?? "",
              guardianPhone: student.guardianPhone ?? "",
              status: student.status,
              notes: student.notes ?? "",
              photoKey: student.photoKey,
              locationIds: student.locations.map((link) => link.locationId),
              primaryLocationId:
                student.locations.find((link) => link.isPrimary)?.locationId ??
                student.locations[0]?.locationId ??
                null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
