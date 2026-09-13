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
import { WEEKDAY_LABELS } from "@/lib/schemas/course";
import { formatDate } from "@/lib/utils";

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
  const upcoming = await listSessions({ courseId: course.id, pageSize: 12 });
  const attendanceCounts = await getAttendanceCountsBySession(
    upcoming.sessions.map((session) => session.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Classes", href: "/classes" },
          { label: course.name },
        ]}
      />
      {sp.created ? (
        <FlashToast variant="success" message="Course created." />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {course.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{course.location.name}</Badge>
            {course.trainer ? (
              <Badge variant="secondary">{course.trainer.name}</Badge>
            ) : (
              <span className="text-muted-foreground text-xs">
                No trainer assigned
              </span>
            )}
            {course.isActive ? null : <Badge variant="outline">Inactive</Badge>}
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
                <Link href={`/classes/${course.id}/edit`}>Edit</Link>
              </Button>
              <form
                id={`delete-course-${course.id}`}
                action={deleteCourseAction}
              >
                <input type="hidden" name="courseId" value={course.id} />
                <ConfirmDialog
                  title="Delete course?"
                  description={`${course.name}, its weekly slots, and its generated sessions will be permanently removed. This cannot be undone.`}
                  confirmLabel="Delete"
                  formId={`delete-course-${course.id}`}
                >
                  <Button type="button" variant="destructive">
                    Delete
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
            <CardTitle>Weekly training times</CardTitle>
            <CardDescription>
              Recurring slots that generate sessions on the schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {course.trainingTimes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No weekly slots yet — add them via Edit.
              </p>
            ) : (
              course.trainingTimes.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-4 rounded-md border p-2 text-sm"
                >
                  <span className="font-medium">
                    {WEEKDAY_LABELS[slot.weekday] ?? slot.weekday}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming sessions</CardTitle>
            <CardDescription>
              Generated for the next two weeks from the weekly slots.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No upcoming sessions. Add weekly slots first.
              </p>
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
                        {formatDate(session.date)} ·{" "}
                        <span className="font-mono text-xs">
                          {session.startTime}–{session.endTime}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {session.locationName}
                        {counts.total > 0
                          ? ` · ${counts.trained}/${counts.total} attended`
                          : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canViewAttendance ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sessions/${session.id}`}>
                            Attendance
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
                              ? "Restore"
                              : "Cancel"}
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
                            ? "Cancelled"
                            : "Scheduled"}
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
