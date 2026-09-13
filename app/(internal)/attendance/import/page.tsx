import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

import { AttendanceImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import attendance" };

export default async function ImportAttendancePage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_MARK);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Classes", href: "/classes" },
          { label: "Import attendance" },
        ]}
      />
      <h1 className="text-2xl font-semibold tracking-tight">
        Import attendance history
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>CSV import</CardTitle>
          <CardDescription>
            Backfill past trainings from your previous system. Missing class
            sessions are created automatically; already-recorded rows are
            skipped, so re-running an import is safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm">
            <p className="mb-2 font-medium">Columns</p>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>
                <code>Date</code> — required, YYYY-MM-DD (today or earlier)
              </li>
              <li>
                <code>Course</code> — required, exact existing course name
              </li>
              <li>
                <code>Email</code> — student email, or <code>FirstName</code> +{" "}
                <code>LastName</code>
              </li>
              <li>
                <code>Status</code> — optional: Present (default), Late,
                Excused, Absent
              </li>
            </ul>
            <p className="text-muted-foreground mt-2 text-xs">
              Students are matched within the course&apos;s location. Rows
              referring to unknown courses or students are reported as errors
              and skipped — nothing is auto-created.
            </p>
          </div>
          <AttendanceImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
