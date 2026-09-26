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
import { getStudentAgreementStatuses } from "@/lib/db/agreements";
import { RecordSignatureSheet } from "./record-signature-sheet";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { getStudentRecentAttendance } from "@/lib/db/attendance";
import { getStudentBeltHistory } from "@/lib/db/belts";
import { listCoursesForStudent } from "@/lib/db/courses";
import { countryName } from "@/lib/countries";
import { endEnrollmentAction } from "@/lib/actions/memberships";
import {
  getStudentSuspension,
  listActivePlansForSelection,
  listStudentEnrollments,
} from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_STATUS_LABELS,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";
import {
  STUDENT_STATUS_LABELS,
  type StudentStatus,
} from "@/lib/schemas/student";
import { formatDate, formatDateUtc, formatMoney } from "@/lib/utils";

import { EnrollStudentSheet } from "./enroll-student-sheet";
import { PortalLinkButton } from "./portal-link-button";

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
  const canViewMedical = hasPermission(
    user.permissions,
    PERMISSIONS.STUDENTS_MEDICAL,
  );
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
  const canManageMemberships = hasPermission(
    user.permissions,
    PERMISSIONS.MEMBERSHIPS_EDIT,
  );

  const { studentId } = await params;
  const sp = await searchParams;
  const [
    student,
    attachments,
    recentAttendance,
    beltHistory,
    backfillCourses,
    agreementStatuses,
  ] = await Promise.all([
    getStudent(studentId),
    prisma.attachment.findMany({
      where: { entityType: "Student", entityId: studentId },
      orderBy: { createdAt: "desc" },
    }),
    getStudentRecentAttendance(studentId),
    getStudentBeltHistory(studentId),
    canMarkAttendance ? listCoursesForStudent(studentId) : Promise.resolve([]),
    getStudentAgreementStatuses(studentId),
  ]);
  if (!student) {
    notFound();
  }

  const membershipsEnabled = hasPermission(
    user.permissions,
    PERMISSIONS.MEMBERSHIPS_VIEW,
  );
  const enrollments = membershipsEnabled
    ? await listStudentEnrollments(studentId)
    : [];
  const [studentInvoices, plans, membershipsSettings, suspension] =
    membershipsEnabled
      ? await Promise.all([
          prisma.invoice.findMany({
            where: { studentId },
            orderBy: { issueDate: "desc" },
            take: 5,
            include: {
              items: { select: { quantity: true, unitPriceCents: true } },
              payments: { select: { amountCents: true } },
            },
          }),
          canManageMemberships
            ? listActivePlansForSelection()
            : Promise.resolve([]),
          getMembershipsSettings(),
          getStudentSuspension(studentId),
        ])
      : [[], [], null, null];
  const currency = membershipsSettings?.currency ?? "USD";
  const suspensionState = suspension ?? {
    suspended: false,
    daysOverdue: 0,
    suspendAfterDays: 0,
  };

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
      {sp.updated ? (
        <FlashToast variant="success" message="Student updated." />
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
              {student.disciplines.map((link) => (
                <Badge key={link.disciplineId} variant="outline">
                  {link.discipline.name}
                </Badge>
              ))}
              <span className="text-muted-foreground text-xs">
                Joined {formatDate(student.joinedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <PortalLinkButton studentId={student.id} studentName={fullName} />
          ) : null}
          <Button asChild variant="outline">
            <a href={`/api/students/${student.id}/report-card`} download>
              Report card
            </a>
          </Button>
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
              label="Address"
              value={
                [
                  student.addressLine,
                  student.city,
                  student.state,
                  student.postcode,
                  student.country ? countryName(student.country) : "",
                ]
                  .filter((part) => part && part.length > 0)
                  .join(", ") || null
              }
            />
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
                      student.guardianRelationship,
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

      {canViewMedical ? (
        <Card>
          <CardHeader>
            <CardTitle>Health &amp; medical</CardTitle>
            <CardDescription>
              Sensitive information — visible only to medical-permitted roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <DetailRow label="Medications" value={student.medicalMedications} />
            <DetailRow label="Conditions" value={student.medicalConditions} />
            <DetailRow
              label="Injuries / illnesses"
              value={student.medicalInjuries}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Agreements &amp; consent</CardTitle>
          <CardDescription>
            Documents the member (or their guardian) must read and sign. A new
            document version requires re-signing; the portal handles digital
            signing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {agreementStatuses.map((status) => (
            <div
              key={status.documentId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{status.title}</span>
                  <Badge variant="outline">v{status.activeVersion}</Badge>
                  {status.signed ? (
                    <Badge variant="secondary">
                      Signed {formatDate(status.signedAt!)}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Not signed</Badge>
                  )}
                  {status.reSignRequired ? (
                    <Badge variant="destructive">Re-sign required</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {status.signed
                    ? `Signed by ${status.signedByName} (${
                        status.method === "PORTAL"
                          ? "portal"
                          : "recorded by staff"
                      })`
                    : "Waiting for the member to sign via their portal link, or record a paper signature."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/api/agreements/${status.documentId}/pdf?studentId=${student.id}`}
                    download
                  >
                    Print form
                  </a>
                </Button>
                {canEdit ? (
                  <RecordSignatureSheet
                    studentId={student.id}
                    documentId={status.documentId}
                    documentLabel={status.title}
                    activeVersion={status.activeVersion}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {membershipsEnabled ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Memberships</CardTitle>
              <CardDescription>
                Plans and invoices.{" "}
                {suspensionState.suspended ? (
                  <span className="text-destructive font-medium">
                    Suspended — invoice overdue {suspensionState.daysOverdue}{" "}
                    day
                    {suspensionState.daysOverdue === 1 ? "" : "s"} (limit{" "}
                    {suspensionState.suspendAfterDays}).
                  </span>
                ) : null}
              </CardDescription>
            </div>
            {canManageMemberships && plans.length > 0 ? (
              <EnrollStudentSheet studentId={student.id} plans={plans} />
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {enrollments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No plan enrollments yet.
                </p>
              ) : (
                enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {enrollment.plan.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {enrollment.status === "ACTIVE"
                          ? `Since ${formatDate(enrollment.startDate)}${
                              enrollment.nextInvoiceDate
                                ? ` · next invoice ${formatDateUtc(enrollment.nextInvoiceDate)}`
                                : ""
                            }`
                          : `Ended ${enrollment.endDate ? formatDate(enrollment.endDate) : ""}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {enrollment.status === "ACTIVE" &&
                      enrollment.plan.chargeOnlyWithAttendance ? (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          title="Recurring invoices generate only when the member has trained since the previous invoice"
                        >
                          Only if trained
                        </Badge>
                      ) : null}
                      <Badge
                        variant={
                          enrollment.status === "ACTIVE"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {enrollment.status === "ACTIVE" ? "Active" : "Ended"}
                      </Badge>
                      {canManageMemberships &&
                      enrollment.status === "ACTIVE" ? (
                        <form
                          id={`end-enrollment-${enrollment.id}`}
                          action={endEnrollmentAction}
                        >
                          <input
                            type="hidden"
                            name="enrollmentId"
                            value={enrollment.id}
                          />
                          <ConfirmDialog
                            title="End enrollment?"
                            description={`${enrollment.plan.name} will stop generating invoices for this student.`}
                            confirmLabel="End enrollment"
                            formId={`end-enrollment-${enrollment.id}`}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                            >
                              End
                            </Button>
                          </ConfirmDialog>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {studentInvoices.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium">
                  Recent invoices
                </p>
                {studentInvoices.map((invoice) => {
                  const totalCents = invoice.items.reduce(
                    (sum, item) => sum + item.unitPriceCents * item.quantity,
                    0,
                  );
                  const paidCents = invoice.payments.reduce(
                    (sum, payment) => sum + payment.amountCents,
                    0,
                  );
                  return (
                    <Link
                      key={invoice.id}
                      href={`/memberships/invoices/${invoice.id}`}
                      className="hover:bg-accent/40 flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <span className="font-mono text-xs">
                        #{invoice.number}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Issued {formatDateUtc(invoice.issueDate)}
                      </span>
                      <Badge
                        variant={
                          invoice.status === "PAID" ? "secondary" : "default"
                        }
                      >
                        {invoice.status === "PAID" ? "Paid" : "Open"}
                      </Badge>
                      <span className="text-right">
                        {formatMoney(totalCents - paidCents, currency)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
                    {record.beltRangeEntry?.discipline.name ??
                      "Discipline removed"}{" "}
                    · {formatDateUtc(record.awardedAt)}
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
                        description={`${record.beltName} (${formatDateUtc(record.awardedAt)}) will be permanently removed from ${fullName}'s history.`}
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
                    {formatDateUtc(row.date)} · {row.locationName}
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
