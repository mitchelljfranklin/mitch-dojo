import { Breadcrumbs } from "@/components/breadcrumbs";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
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
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { listAssignableLocations } from "@/lib/db/locations";
import { listHouseholdOptions } from "@/lib/db/households";
import { prisma } from "@/lib/prisma";
import { getOrganizationSettings } from "@/lib/settings";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Students");
  return { title: translate("form.editTitle") };
}

type EditStudentPageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  const user = await requirePermission(PERMISSIONS.STUDENTS_EDIT);
  const translate = await getTranslations("Students");
  const { studentId } = await params;
  const [student, locations, disciplines, households, organization] =
    await Promise.all([
      getStudent(studentId),
      listAssignableLocations(),
      prisma.discipline.findMany({
        select: { id: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      }),
      listHouseholdOptions(),
      getOrganizationSettings(),
    ]);
  if (!student) {
    notFound();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translate("title"), href: "/students" },
          {
            label: `${student.firstName} ${student.lastName}`,
            href: `/students/${student.id}`,
          },
          { label: translate("form.editCrumb") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translate("form.editTitle")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translate("form.detailsTitle")}</CardTitle>
          <CardDescription>{translate("form.editDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            action={updateStudentAction}
            studentId={student.id}
            locations={locations}
            disciplines={disciplines}
            households={households}
            defaultCountry={organization.defaultCountry}
            submitLabel={translate("form.save")}
            canViewMedical={hasPermission(
              user.permissions,
              PERMISSIONS.STUDENTS_MEDICAL,
            )}
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
              guardianRelationship: student.guardianRelationship ?? "",
              medicalMedications: student.medicalMedications ?? "",
              medicalConditions: student.medicalConditions ?? "",
              medicalInjuries: student.medicalInjuries ?? "",
              status: student.status,
              notes: student.notes ?? "",
              photoKey: student.photoKey,
              addressLine: student.addressLine ?? "",
              city: student.city ?? "",
              state: student.state ?? "",
              postcode: student.postcode ?? "",
              country: student.country ?? "",
              locationIds: student.locations.map((link) => link.locationId),
              primaryLocationId:
                student.locations.find((link) => link.isPrimary)?.locationId ??
                student.locations[0]?.locationId ??
                null,
              disciplineIds: student.disciplines.map(
                (link) => link.disciplineId,
              ),
              householdId: student.householdId ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
