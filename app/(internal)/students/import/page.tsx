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
import { StudentImportForm } from "./import-form";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listLocations } from "@/lib/db/locations";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Students.import");
  return { title: t("metaTitle") };
}

export default async function ImportStudentsPage() {
  await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const t = await getTranslations("Students.import");
  const studentsT = await getTranslations("Students");
  const locations = await listLocations();
  const locationNames = locations.map((location) => location.name);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: studentsT("title"), href: "/students" },
          { label: t("submit") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-muted-foreground text-sm">
            <p className="text-foreground mb-2 font-medium">{t("columns")}</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>FirstName</code>, <code>LastName</code> — {t("required")}
              </li>
              <li>
                <code>Email</code>, <code>Phone</code>, <code>DateOfBirth</code>{" "}
                (YYYY-MM-DD)
              </li>
              <li>
                <code>GuardianName</code>, <code>GuardianEmail</code>,{" "}
                <code>GuardianPhone</code>
              </li>
              <li>
                <code>EmergencyContactName</code>,{" "}
                <code>EmergencyContactPhone</code>
              </li>
              <li>
                <code>Status</code> — {t("statusLine")}
              </li>
              <li>
                <code>Locations</code> — {t("locationsLine")}{" "}
                <code>Main Dojo;Northside Dojo</code>
              </li>
              <li>
                <code>PrimaryLocation</code> — {t("primaryLine")}
              </li>
              <li>
                <code>Notes</code>
              </li>
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("available")}{" "}
            {locationNames.length > 0 ? locationNames.join(", ") : t("noneYet")}
          </p>
          <StudentImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
