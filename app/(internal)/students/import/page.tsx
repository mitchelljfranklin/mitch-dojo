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
  const translate = await getTranslations("Students.import");
  return { title: translate("metaTitle") };
}

export default async function ImportStudentsPage() {
  await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const translate = await getTranslations("Students.import");
  const translateStudents = await getTranslations("Students");
  const locations = await listLocations();
  const locationNames = locations.map((location) => location.name);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateStudents("title"), href: "/students" },
          { label: translate("submit") },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        {translate("title")}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{translate("cardTitle")}</CardTitle>
          <CardDescription>{translate("cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-muted-foreground text-sm">
            <p className="text-foreground mb-2 font-medium">
              {translate("columns")}
            </p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>FirstName</code>, <code>LastName</code> —{" "}
                {translate("required")}
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
                <code>Status</code> — {translate("statusLine")}
              </li>
              <li>
                <code>Locations</code> — {translate("locationsLine")}{" "}
                <code>Main Dojo;Northside Dojo</code>
              </li>
              <li>
                <code>PrimaryLocation</code> — {translate("primaryLine")}
              </li>
              <li>
                <code>Notes</code>
              </li>
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            {translate("available")}{" "}
            {locationNames.length > 0
              ? locationNames.join(", ")
              : translate("noneYet")}
          </p>
          <StudentImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
