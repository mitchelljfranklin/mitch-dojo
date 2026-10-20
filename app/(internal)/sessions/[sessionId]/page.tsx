import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

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
import { AttendanceForm } from "@/components/attendance-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Attendance");
  return { title: translate("metaTitle") };
}

type SessionAttendancePageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SessionAttendancePage({
  params,
  searchParams,
}: SessionAttendancePageProps) {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_VIEW);
  const translate = await getTranslations("Attendance.session");
  const translateAttendance = await getTranslations("Attendance");
  const formatter = await getFormatter();
  const canMark = hasPermission(user.permissions, PERMISSIONS.ATTENDANCE_MARK);

  const { sessionId } = await params;
  const query = await searchParams;
  // Default: only students training this course's discipline. `?scope=all`
  // widens to everyone at the location for drop-ins.
  const includeAll = query.scope === "all";
  const { session, roster } = await getSessionRoster(sessionId, {
    includeAll,
  });
  if (!session) {
    notFound();
  }
  const formattedDate = formatter.dateTime(session.date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateAttendance("title"), href: "/attendance" },
          { label: session.courseName, href: `/classes/${session.courseId}` },
          { label: formattedDate },
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
              <Badge variant="destructive">{translate("cancelled")}</Badge>
            ) : null}
            {session.trainerName ? (
              <span className="text-muted-foreground text-xs">
                {translate("trainer", { name: session.trainerName })}
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
              {includeAll
                ? translate("showDiscipline")
                : translate("showEveryone")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`/api/sessions/${session.id}/attendance-pdf${includeAll ? "?scope=all" : ""}`}
              download
            >
              {translate("downloadPdf")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/classes/${session.courseId}`}>
              {translate("backToCourse")}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("attendanceTitle")}</CardTitle>
          <CardDescription>
            {roster.length === 0
              ? includeAll
                ? translate("emptyAll", { location: session.locationName })
                : translate("emptyDiscipline", {
                    discipline: session.disciplineName,
                    location: session.locationName,
                  })
              : canMark
                ? includeAll
                  ? translate("markAll")
                  : translate("markDiscipline", {
                      discipline: session.disciplineName,
                    })
                : translate("readOnly")}
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
              {translate("assignHint", {
                discipline: session.disciplineName,
                location: session.locationName,
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
