import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getSessionRoster } from "@/lib/db/attendance";
import { formatDateUtc } from "@/lib/utils";
import { AttendanceForm } from "@/components/attendance-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Attendance" };

type SessionAttendancePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionAttendancePage({
  params,
}: SessionAttendancePageProps) {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_VIEW);
  const canMark = hasPermission(user.permissions, PERMISSIONS.ATTENDANCE_MARK);

  const { sessionId } = await params;
  const { session, roster } = await getSessionRoster(sessionId);
  if (!session) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Attendance", href: "/attendance" },
          { label: session.courseName, href: `/classes/${session.courseId}` },
          { label: formatDateUtc(session.date) },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {session.courseName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{session.locationName}</Badge>
            <span className="text-muted-foreground font-mono text-xs">
              {session.startTime}–{session.endTime}
            </span>
            {session.status === "CANCELLED" ? (
              <Badge variant="destructive">Cancelled</Badge>
            ) : null}
            {session.trainerName ? (
              <span className="text-muted-foreground text-xs">
                Trainer: {session.trainerName}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/api/sessions/${session.id}/attendance-pdf`} download>
              Download PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/classes/${session.courseId}`}>Back to course</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>
            {roster.length === 0
              ? "No students are assigned to this location yet."
              : canMark
                ? "Mark each student and save. Students at this location (active and trial) are listed."
                : "Read-only view. You need the attendance marking permission to record attendance."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roster.length > 0 ? (
            <AttendanceForm
              sessionId={session.id}
              canMark={canMark}
              students={roster.map((entry) => ({
                studentId: entry.studentId,
                name: `${entry.firstName} ${entry.lastName}`,
                photoKey: entry.photoKey,
                status: entry.status,
                source: entry.source,
              }))}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Assign students to {session.locationName} to take their
              attendance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
