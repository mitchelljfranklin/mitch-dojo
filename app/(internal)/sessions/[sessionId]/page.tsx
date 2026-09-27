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
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SessionAttendancePage({
  params,
  searchParams,
}: SessionAttendancePageProps) {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_VIEW);
  const canMark = hasPermission(user.permissions, PERMISSIONS.ATTENDANCE_MARK);

  const { sessionId } = await params;
  const sp = await searchParams;
  // Default: only students training this course's discipline. `?scope=all`
  // widens to everyone at the location for drop-ins.
  const includeAll = sp.scope === "all";
  const { session, roster } = await getSessionRoster(sessionId, {
    includeAll,
  });
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
            <Badge variant="secondary">{session.disciplineName}</Badge>
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
            <Link
              href={
                includeAll
                  ? `/sessions/${session.id}`
                  : `/sessions/${session.id}?scope=all`
              }
            >
              {includeAll ? "Show discipline only" : "Show everyone here"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`/api/sessions/${session.id}/attendance-pdf${includeAll ? "?scope=all" : ""}`}
              download
            >
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
              ? `No ${includeAll ? "students" : `${session.disciplineName} students`} at ${session.locationName} yet.`
              : canMark
                ? includeAll
                  ? "Mark each student and save. Showing everyone at this location."
                  : `Mark each student and save. Showing ${session.disciplineName} students (use “Show everyone here” for drop-ins).`
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
              Assign students to {session.disciplineName} at{" "}
              {session.locationName} to take their attendance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
