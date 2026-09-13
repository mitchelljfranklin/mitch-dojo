import { Breadcrumbs } from "@/components/breadcrumbs";
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

export const metadata = { title: "Import students" };

export default async function ImportStudentsPage() {
  await requirePermission(PERMISSIONS.STUDENTS_CREATE);
  const locations = await listLocations();
  const locationNames = locations.map((location) => location.name);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Students", href: "/students" },
          { label: "Import" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">Import students</h1>
      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
          <CardDescription>
            Bulk-create students from a CSV file. The first row must be a
            header.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-muted-foreground text-sm">
            <p className="text-foreground mb-2 font-medium">Columns</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>FirstName</code>, <code>LastName</code> — required
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
                <code>Status</code> — Trial (default), Active, Inactive, Alumni
              </li>
              <li>
                <code>Locations</code> — semicolon-separated existing location
                names, e.g. <code>Main Dojo;Northside Dojo</code>
              </li>
              <li>
                <code>PrimaryLocation</code> — optional; defaults to the first
                listed location
              </li>
              <li>
                <code>Notes</code>
              </li>
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            Available locations:{" "}
            {locationNames.length > 0 ? locationNames.join(", ") : "none yet"}
          </p>
          <StudentImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
