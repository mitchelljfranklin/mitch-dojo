import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

import { EnrollmentImportForm } from "./enrollment-import-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import enrollments" };

export default async function ImportEnrollmentsPage() {
  await requirePermission(PERMISSIONS.MEMBERSHIPS_EDIT);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import enrollments
          </h1>
          <p className="text-muted-foreground text-sm">
            Bulk-enroll existing students onto membership plans from a CSV.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/memberships">Back to memberships</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV format</CardTitle>
          <CardDescription>
            One row per student, with a header row. The plan must match an
            existing plan name exactly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="overflow-x-auto rounded-md border p-3 font-mono text-xs">
            Email,FirstName,LastName,Plan,StartDate
            <br />
            jane@example.com,Jane,Doe,Adult monthly,2026-09-01
            <br />
            ,Sam,Smith,Kids monthly,
          </div>
          <ul className="text-muted-foreground list-disc pl-5 text-xs">
            <li>
              Identify the student by <strong>Email</strong>, or by{" "}
              <strong>FirstName + LastName</strong> when no email is given.
            </li>
            <li>
              <strong>Plan</strong> must match a plan name exactly (see the
              Memberships page).
            </li>
            <li>
              <strong>StartDate</strong> is optional (YYYY-MM-DD); blank =
              today.
            </li>
            <li>
              Students already enrolled on the plan are skipped, not duplicated.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
