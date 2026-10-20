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
import { createStudentAction } from "@/lib/actions/students";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listAssignableLocations } from "@/lib/db/locations";
import { listHouseholdOptions } from "@/lib/db/households";
import { prisma } from "@/lib/prisma";
import { getOrganizationSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Students");
  return { title: t("actions.new") };
}

export default async function NewStudentPage() {
  const user = await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const t = await getTranslations("Students");
  const [locations, disciplines, households, organization] = await Promise.all([
    listAssignableLocations(),
    prisma.discipline.findMany({
      where: { isActive: true },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    listHouseholdOptions(),
    getOrganizationSettings(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: t("title"), href: "/students" },
          { label: t("actions.new") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("actions.new")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("form.detailsTitle")}</CardTitle>
          <CardDescription>{t("form.createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm
            action={createStudentAction}
            locations={locations}
            disciplines={disciplines}
            households={households}
            defaultCountry={organization.defaultCountry}
            submitLabel={t("form.create")}
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
