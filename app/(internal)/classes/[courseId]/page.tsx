import Link from "next/link";
import { notFound } from "next/navigation";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import {
  deleteCourseAction,
  setSessionStatusAction,
} from "@/lib/actions/courses";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getCourse } from "@/lib/db/courses";
import { ensureUpcomingSessions, listSessions } from "@/lib/db/sessions";
import { getAttendanceCountsBySession } from "@/lib/db/attendance";

export const dynamic = "force-dynamic";

type CourseDetailPageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function CourseDetailPage({
  params,
  searchParams,
}: CourseDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const t = await getTranslations("Classes");
  const d = await getTranslations("Classes.detail");
  const format = await getFormatter();
  const canViewAttendance = hasPermission(
    user.permissions,
    PERMISSIONS.ATTENDANCE_VIEW,
  );
  const canEdit = hasPermission(user.permissions, PERMISSIONS.CLASSES_EDIT);

  const { courseId } = await params;
  const sp = await searchParams;
  const course = await getCourse(courseId);
  if (!course) {
    notFound();
  }

  await ensureUpcomingSessions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = await listSessions({
    courseId: course.id,
    fromDate: today,
    pageSize: 12,
  });
  const attendanceCounts = await getAttendanceCountsBySession(
    upcoming.sessions.map((session) => session.id),
  );
  const day = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: t("title"), href: "/classes" },
          { label: course.name },
        ]}
      />
      {sp.created ? (
        <FlashToast variant="success" message={d("created")} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {course.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{course.discipline.name}</Badge>
            <Badge variant="outline">{course.location.name}</Badge>
            {course.trainer ? (
              <Badge variant="secondary">{course.trainer.name}</Badge>
            ) : (
              <span className="text-muted-foreground text-xs">
                {d("noTrainer")}
              </span>
            )}
            {course.isActive ? null : (
              <Badge variant="outline">{d("inactive")}</Badge>
            )}
          </div>
          {course.description ? (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              {course.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/classes/${course.id}/edit`}>{d("edit")}</Link>
              </Button>
              <form
                id={`delete-course-${course.id}`}
                action={deleteCourseAction}
              >
                <input type="hidden" name="courseId" value={course.id} />
                <ConfirmDialog
                  title={d("deleteTitle")}
                  description={d("deleteDescription", { name: course.name })}
                  confirmLabel={d("deleteConfirm")}
                  formId={`delete-course-${course.id}`}
                >
                  <Button type="button" variant="destructive">
                    {d("delete")}
                  </Button>
                </ConfirmDialog>
              </form>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{d("weeklyTitle")}</CardTitle>
            <CardDescription>{d("weeklyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {course.trainingTimes.length === 0 ? (
              <p className="text-muted-foreground text-sm">{d("noWeekly")}</p>
            ) : (
              course.trainingTimes.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-4 rounded-md border p-2 text-sm"
                >
                  <span className="font-medium">
                    {t(`weekdays.${slot.weekday}`)}
                  </span>
                  <span className="flex items-center gap-2">
                    {!slot.trialBookable ? (
                      <Badge variant="outline">{d("notTrial")}</Badge>
                    ) : null}
                    <span className="text-muted-foreground font-mono text-xs">
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d("upcomingTitle")}</CardTitle>
            <CardDescription>{d("upcomingDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">{d("noUpcoming")}</p>
            ) : (
              upcoming.sessions.map((session) => {
                const counts = attendanceCounts.get(session.id) ?? {
                  total: 0,
                  trained: 0,
                };
                return (
                  <div
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span>
                        {day(session.date)} ·{" "}
                        <span className="font-mono text-xs">
                          {session.startTime}–{session.endTime}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {session.locationName}
                        {counts.total > 0
                          ? ` · ${d("attended", {
                              trained: counts.trained,
                              total: counts.total,
                            })}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canViewAttendance ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sessions/${session.id}`}>
                            {d("attendance")}
                          </Link>
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <form action={setSessionStatusAction}>
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <input
                            type="hidden"
                            name="courseId"
                            value={course.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              session.status === "CANCELLED"
                                ? "SCHEDULED"
                                : "CANCELLED"
                            }
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant={
                              session.status === "CANCELLED"
                                ? "secondary"
                                : "ghost"
                            }
                            className={
                              session.status === "CANCELLED"
                                ? ""
                                : "text-destructive"
                            }
                          >
                            {session.status === "CANCELLED"
                              ? d("restore")
                              : d("cancel")}
                          </Button>
                        </form>
                      ) : (
                        <Badge
                          variant={
                            session.status === "CANCELLED"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {session.status === "CANCELLED"
                            ? d("cancelled")
                            : d("scheduled")}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
