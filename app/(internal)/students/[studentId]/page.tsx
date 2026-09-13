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
import { StudentAttachments } from "@/components/student-attachments";
import { PastAttendanceSheet } from "@/components/past-attendance-sheet";
import { deleteStudentAction } from "@/lib/actions/students";
import { deletePromotionAction } from "@/lib/actions/belts";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { getStudentRecentAttendance } from "@/lib/db/attendance";
import { getStudentBeltHistory } from "@/lib/db/belts";
import { listCoursesForStudent } from "@/lib/db/courses";
import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";
import {
  STUDENT_STATUS_LABELS,
  type StudentStatus,
} from "@/lib/schemas/student";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StudentDetailPageProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: StudentDetailPageProps) {
  const user = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.STUDENTS_EDIT);
  const canDelete = hasPermission(
    user.permissions,
    PERMISSIONS.STUDENTS_DELETE,
  );
  const canDeleteBelts = hasPermission(
    user.permissions,
    PERMISSIONS.BELTS_EDIT,
  );
  const canMarkAttendance = hasPermission(
    user.permissions,
    PERMISSIONS.ATTENDANCE_MARK,
  );

  const { studentId } = await params;
  const sp = await searchParams;
  const [student, attachments, recentAttendance, beltHistory, backfillCourses] =
    await Promise.all([
      getStudent(studentId),
      prisma.attachment.findMany({
        where: { entityType: "Student", entityId: studentId },
        orderBy: { createdAt: "desc" },
      }),
      getStudentRecentAttendance(studentId),
      getStudentBeltHistory(studentId),
      canMarkAttendance
        ? listCoursesForStudent(studentId)
        : Promise.resolve([]),
    ]);
  if (!student) {
    notFound();
  }

  const primaryLink = student.locations.find((link) => link.isPrimary);
  const otherLinks = student.locations.filter((link) => !link.isPrimary);
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Students", href: "/students" },
          { label: fullName },
        ]}
      />
      {sp.created ? (
        <FlashToast variant="success" message="Student created." />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {student.photoKey ? (
            <img
              src={`/api/students/${student.id}/photo?v=${student.photoKey}`}
              alt={fullName}
              className="size-16 rounded-md border object-cover"
            />
          ) : (
            <span className="bg-muted text-muted-foreground size-16 rounded-md border text-center text-xl leading-16">
              {student.firstName.charAt(0)}
              {student.lastName.charAt(0)}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {fullName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {STUDENT_STATUS_LABELS[student.status]}
              </Badge>
              {primaryLink ? (
                <Badge variant="outline">{primaryLink.location.name}</Badge>
              ) : (
                <span className="text-muted-foreground text-xs">
                  No location assigned
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                Joined {formatDate(student.joinedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/students/${student.id}/edit`}>Edit</Link>
            </Button>
          ) : null}
          {canDelete ? (
            <form
              id={`delete-student-${student.id}`}
              action={deleteStudentAction}
            >
              <input type="hidden" name="studentId" value={student.id} />
              <ConfirmDialog
                title="Delete student?"
                description={`${fullName} and their attachments will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                formId={`delete-student-${student.id}`}
              >
                <Button type="button" variant="destructive">
                  Delete
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow label="Email" value={student.email} />
            <DetailRow label="Phone" value={student.phone} />
            <DetailRow
              label="Date of birth"
              value={
                student.dateOfBirth
                  ? student.dateOfBirth.toISOString().slice(0, 10)
                  : null
              }
            />
            <div className="mt-2" />
            <DetailRow
              label="Guardian"
              value={
                student.guardianName
                  ? [
                      student.guardianName,
                      student.guardianPhone ?? student.guardianEmail ?? "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
            <DetailRow
              label="Emergency contact"
              value={
                student.emergencyContactName
                  ? [
                      student.emergencyContactName,
                      student.emergencyContactPhone ?? "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dojo locations</CardTitle>
            <CardDescription>Locations this student trains at.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {primaryLink ? (
              <Badge>{primaryLink.location.name} (home)</Badge>
            ) : null}
            {otherLinks.map((link) => (
              <Badge key={link.locationId} variant="outline">
                {link.location.name}
              </Badge>
            ))}
            {student.locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No locations assigned yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canEdit ? (
        <StudentAttachments
          studentId={student.id}
          attachments={attachments.map((attachment) => ({
            id: attachment.id,
            displayName: attachment.displayName ?? attachment.fileName,
            fileName: attachment.fileName,
            sizeBytes: attachment.sizeBytes,
            createdAt: attachment.createdAt,
          }))}
        />
      ) : null}

      {student.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
          </CardContent>
        </Card>
      ) : null}
      {beltHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Belt progression</CardTitle>
            <CardDescription>
              Grading history across all courses. Records can be deleted to
              correct inaccuracies.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {beltHistory.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-3 w-6 shrink-0 rounded-full border border-black/20"
                    style={{ backgroundColor: record.colorHex }}
                  />
                  <span className="text-sm font-medium">{record.beltName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {record.beltLevel?.course.name ?? "Course removed"} ·{" "}
                    {formatDate(record.awardedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {record.notes ? (
                    <span className="text-muted-foreground max-w-[16rem] truncate text-xs">
                      {record.notes}
                    </span>
                  ) : null}
                  {canDeleteBelts ? (
                    <form
                      id={`delete-promotion-${record.id}`}
                      action={deletePromotionAction}
                    >
                      <input
                        type="hidden"
                        name="promotionId"
                        value={record.id}
                      />
                      <ConfirmDialog
                        title="Delete promotion record?"
                        description={`${record.beltName} (${formatDate(record.awardedAt)}) will be permanently removed from ${fullName}'s history.`}
                        confirmLabel="Delete"
                        formId={`delete-promotion-${record.id}`}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </ConfirmDialog>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {recentAttendance.length > 0 || canMarkAttendance ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Recent attendance</CardTitle>
              <CardDescription>
                Last {recentAttendance.length} recorded classes.
              </CardDescription>
            </div>
            <PastAttendanceSheet
              studentId={student.id}
              studentName={fullName}
              courses={backfillCourses.map((course) => ({
                id: course.id,
                name: course.name,
                locationName: course.locationName,
                isActive: course.isActive,
              }))}
              canMark={canMarkAttendance}
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentAttendance.map((row) => (
              <div
                key={row.sessionId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div className="flex min-w-0 flex-col">
                  <span>{row.courseName}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(row.date)} · {row.locationName}
                  </span>
                </div>
                <Badge
                  variant={
                    row.status === "ABSENT" ? "destructive" : "secondary"
                  }
                >
                  {
                    ATTENDANCE_STATUS_LABELS[
                      row.status as AttendanceStatusValue
                    ]
                  }
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
