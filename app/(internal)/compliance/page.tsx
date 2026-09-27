import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { listOutstandingAgreements } from "@/lib/db/agreements";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Compliance" };

export default async function CompliancePage() {
  await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const students = await listOutstandingAgreements();

  const outstandingSignatures = students.reduce(
    (total, student) => total + student.outstanding.length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground text-sm">
          Agreements still waiting on a signature. A document counts as
          outstanding when it has never been signed, or when it has been updated
          since the last signature.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students with work to do</CardDescription>
            <CardTitle className="text-3xl">{students.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding signatures</CardDescription>
            <CardTitle className="text-3xl">{outstandingSignatures}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding agreements</CardTitle>
          <CardDescription>
            Open a student to record a paper signature or have them sign in the
            member portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Every active student is up to date. Nothing to chase.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {students.map((student) => (
                <div
                  key={student.studentId}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <Link
                    href={`/students/${student.studentId}`}
                    className="font-medium hover:underline"
                  >
                    {student.lastName}, {student.firstName}
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    {student.outstanding.map((document) => (
                      <Badge
                        key={document.documentId}
                        variant={
                          document.reSignRequired ? "secondary" : "outline"
                        }
                      >
                        {document.title}
                        {document.reSignRequired ? " (re-sign)" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
