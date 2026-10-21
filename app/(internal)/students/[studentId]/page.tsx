import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

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
import { listStudentIncidents } from "@/lib/db/incidents";
import { getStudentAttendanceRate } from "@/lib/db/reports";
import { RecordSignatureSheet } from "./record-signature-sheet";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getStudent } from "@/lib/db/students";
import { getStudentHousehold } from "@/lib/db/households";
import { getStudentRecentAttendance } from "@/lib/db/attendance";
import { getStudentBeltHistory } from "@/lib/db/belts";
import { listCoursesForStudent } from "@/lib/db/courses";
import { countryName } from "@/lib/countries";
import {
  endEnrollmentAction,
  resumeEnrollmentAction,
} from "@/lib/actions/memberships";
import {
  getStudentSuspension,
  listActivePlansForSelection,
  listStudentEnrollments,
} from "@/lib/db/memberships";
import { getMembershipsSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

import { EnrollStudentSheet } from "./enroll-student-sheet";
import { PauseEnrollmentSheet } from "./pause-enrollment-sheet";
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
  const translate = await getTranslations("Students");
  const translateDetail = await getTranslations("Students.detail");
  const formatter = await getFormatter();
  const locale = await getLocale();
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
  const canViewIncidents = hasPermission(
    user.permissions,
    PERMISSIONS.INCIDENTS_VIEW,
  );
  const canViewAnalytics = hasPermission(
    user.permissions,
    PERMISSIONS.ANALYTICS_VIEW,
  );

  const { studentId } = await params;
  const query = await searchParams;
  const [
    student,
    attachments,
    recentAttendance,
    beltHistory,
    backfillCourses,
    agreementStatuses,
    household,
    incidents,
    attendanceRate,
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
    getStudentHousehold(studentId),
    canViewIncidents ? listStudentIncidents(studentId) : Promise.resolve([]),
    canViewAnalytics
      ? getStudentAttendanceRate(studentId, 90)
      : Promise.resolve(null),
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
  const money = (cents: number) => {
    try {
      return formatter.number(cents / 100, { style: "currency", currency });
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  };
  const formatDay = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const localDay = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const percent = (value: number) =>
    formatter.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    });
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
          { label: translateDetail("studentsCrumb"), href: "/students" },
          { label: fullName },
        ]}
      />
      {query.created ? (
        <FlashToast variant="success" message={translateDetail("created")} />
      ) : null}
      {query.updated ? (
        <FlashToast variant="success" message={translateDetail("updated")} />
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
                {translate(`status.${student.status}`)}
              </Badge>
              {primaryLink ? (
                <Badge variant="outline">{primaryLink.location.name}</Badge>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {translateDetail("noLocation")}
                </span>
              )}
              {student.disciplines.map((link) => (
                <Badge key={link.disciplineId} variant="outline">
                  {link.discipline.name}
                </Badge>
              ))}
              <span className="text-muted-foreground text-xs">
                {translateDetail("joined", {
                  date: localDay(student.joinedAt),
                })}
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
              {translateDetail("reportCard")}
            </a>
          </Button>
          {canEdit ? (
            <Button asChild variant="outline">
              <Link href={`/students/${student.id}/edit`}>
                {translateDetail("edit")}
              </Link>
            </Button>
          ) : null}
          {canDelete ? (
            <form
              id={`delete-student-${student.id}`}
              action={deleteStudentAction}
            >
              <input type="hidden" name="studentId" value={student.id} />
              <ConfirmDialog
                title={translateDetail("deleteTitle")}
                description={translateDetail("deleteDescription", {
                  name: fullName,
                })}
                confirmLabel={translateDetail("deleteConfirm")}
                formId={`delete-student-${student.id}`}
              >
                <Button type="button" variant="destructive">
                  {translateDetail("delete")}
                </Button>
              </ConfirmDialog>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{translateDetail("profile")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow label={translateDetail("email")} value={student.email} />
            <DetailRow label={translateDetail("phone")} value={student.phone} />
            <DetailRow
              label={translateDetail("address")}
              value={
                [
                  student.addressLine,
                  student.city,
                  student.state,
                  student.postcode,
                  student.country ? countryName(student.country, locale) : "",
                ]
                  .filter((part) => part && part.length > 0)
                  .join(", ") || null
              }
            />
            <DetailRow
              label={translateDetail("dateOfBirth")}
              value={
                student.dateOfBirth
                  ? student.dateOfBirth.toISOString().slice(0, 10)
                  : null
              }
            />
            <div className="mt-2" />
            <DetailRow
              label={translateDetail("guardian")}
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
              label={translateDetail("emergency")}
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
            <CardTitle>{translateDetail("locationsTitle")}</CardTitle>
            <CardDescription>
              {translateDetail("locationsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {primaryLink ? (
              <Badge>
                {translateDetail("home", {
                  location: primaryLink.location.name,
                })}
              </Badge>
            ) : null}
            {otherLinks.map((link) => (
              <Badge key={link.locationId} variant="outline">
                {link.location.name}
              </Badge>
            ))}
            {student.locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translateDetail("noLocations")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{translateDetail("householdTitle")}</CardTitle>
            <CardDescription>
              {translateDetail("householdDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {household ? (
              <>
                <span className="font-medium">{household.name}</span>
                <span className="text-muted-foreground text-xs">
                  {[
                    household.contactName,
                    household.contactEmail,
                    household.contactPhone,
                  ]
                    .filter(Boolean)
                    .join(" · ") || translateDetail("noContact")}
                </span>
                {household.students.filter((member) => member.id !== student.id)
                  .length > 0 ? (
                  <span className="text-muted-foreground text-xs">
                    {translateDetail("siblings", {
                      names: household.students
                        .filter((member) => member.id !== student.id)
                        .map(
                          (member) => `${member.firstName} ${member.lastName}`,
                        )
                        .join(", "),
                    })}
                  </span>
                ) : null}
                <Link
                  href="/students/households"
                  className="text-primary text-xs hover:underline"
                >
                  {translateDetail("manageHouseholds")}
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                {translateDetail("notInHousehold")}{" "}
                <Link
                  href="/students/households"
                  className="text-primary hover:underline"
                >
                  {translateDetail("manageHouseholdsShort")}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {canViewMedical ? (
        <Card>
          <CardHeader>
            <CardTitle>{translateDetail("medicalTitle")}</CardTitle>
            <CardDescription>
              {translateDetail("medicalDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <DetailRow
              label={translateDetail("medications")}
              value={student.medicalMedications}
            />
            <DetailRow
              label={translateDetail("conditions")}
              value={student.medicalConditions}
            />
            <DetailRow
              label={translateDetail("injuries")}
              value={student.medicalInjuries}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{translateDetail("agreementsTitle")}</CardTitle>
          <CardDescription>
            {translateDetail("agreementsDescription")}
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
                  <Badge variant="outline">
                    {translateDetail("version", {
                      version: status.activeVersion,
                    })}
                  </Badge>
                  {status.signed ? (
                    <Badge variant="secondary">
                      {translateDetail("signed", {
                        date: localDay(status.signedAt!),
                      })}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {translateDetail("notSigned")}
                    </Badge>
                  )}
                  {status.reSignRequired ? (
                    <Badge variant="destructive">
                      {translateDetail("reSign")}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {status.signed
                    ? translateDetail(
                        status.method === "PORTAL"
                          ? "signedByPortal"
                          : "signedByStaff",
                        { name: status.signedByName ?? "" },
                      )
                    : translateDetail("awaiting")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/api/agreements/${status.documentId}/pdf?studentId=${student.id}`}
                    download
                  >
                    {translateDetail("printForm")}
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

      {canViewIncidents ? (
        <Card>
          <CardHeader>
            <CardTitle>{translateDetail("incidentsTitle")}</CardTitle>
            <CardDescription>
              {translateDetail("incidentsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {incidents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translateDetail("noIncidents")}
              </p>
            ) : (
              incidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="hover:bg-accent flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{incident.title}</span>
                    <Badge
                      variant={
                        incident.severity === "SERIOUS"
                          ? "destructive"
                          : incident.severity === "MODERATE"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {translateDetail(`severity.${incident.severity}`)}
                    </Badge>
                    {incident.status === "CLOSED" ? (
                      <Badge variant="outline">
                        {translateDetail("closed")}
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDay(incident.occurredAt)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {membershipsEnabled ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{translateDetail("membershipsTitle")}</CardTitle>
              <CardDescription>
                {translateDetail("membershipsDescription")}{" "}
                {suspensionState.suspended ? (
                  <span className="text-destructive font-medium">
                    {translateDetail("suspended", {
                      days: suspensionState.daysOverdue,
                      limit: suspensionState.suspendAfterDays,
                    })}
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
                  {translateDetail("noEnrollments")}
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
                          ? `${translateDetail("since", {
                              date: localDay(enrollment.startDate),
                            })}${
                              enrollment.nextInvoiceDate
                                ? ` · ${translateDetail("nextInvoice", {
                                    date: formatDay(enrollment.nextInvoiceDate),
                                  })}`
                                : ""
                            }`
                          : enrollment.status === "PAUSED"
                            ? `${translateDetail("onHoldSince", {
                                date: localDay(
                                  enrollment.pausedAt ?? enrollment.startDate,
                                ),
                              })}${enrollment.resumeAt ? ` · ${translateDetail("resumes", { date: formatDay(enrollment.resumeAt) })}` : ""}${enrollment.pauseReason ? ` · ${enrollment.pauseReason}` : ""}`
                            : translateDetail("endedOn", {
                                date: enrollment.endDate
                                  ? localDay(enrollment.endDate)
                                  : "",
                              })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {enrollment.status === "ACTIVE" &&
                      enrollment.plan.chargeOnlyWithAttendance ? (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          title={translateDetail("onlyIfTrainedTitle")}
                        >
                          {translateDetail("onlyIfTrained")}
                        </Badge>
                      ) : null}
                      <Badge
                        variant={
                          enrollment.status === "ACTIVE"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {enrollment.status === "ACTIVE"
                          ? translateDetail("active")
                          : enrollment.status === "PAUSED"
                            ? translateDetail("onHold")
                            : translateDetail("ended")}
                      </Badge>
                      {canManageMemberships &&
                      enrollment.status === "ACTIVE" ? (
                        <PauseEnrollmentSheet
                          enrollmentId={enrollment.id}
                          studentId={student.id}
                          planName={enrollment.plan.name}
                        />
                      ) : null}
                      {canManageMemberships &&
                      enrollment.status === "PAUSED" ? (
                        <form action={resumeEnrollmentAction}>
                          <input
                            type="hidden"
                            name="enrollmentId"
                            value={enrollment.id}
                          />
                          <input
                            type="hidden"
                            name="studentId"
                            value={student.id}
                          />
                          <Button type="submit" size="sm" variant="ghost">
                            {translateDetail("resume")}
                          </Button>
                        </form>
                      ) : null}
                      {canManageMemberships && enrollment.status !== "ENDED" ? (
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
                            title={translateDetail("endTitle")}
                            description={translateDetail("endDescription", {
                              plan: enrollment.plan.name,
                            })}
                            confirmLabel={translateDetail("endConfirm")}
                            formId={`end-enrollment-${enrollment.id}`}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                            >
                              {translateDetail("end")}
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
                  {translateDetail("recentInvoices")}
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
                        {translateDetail("issued", {
                          date: formatDay(invoice.issueDate),
                        })}
                      </span>
                      <Badge
                        variant={
                          invoice.status === "PAID" ? "secondary" : "default"
                        }
                      >
                        {invoice.status === "PAID"
                          ? translateDetail("paid")
                          : translateDetail("open")}
                      </Badge>
                      <span className="text-right">
                        {money(totalCents - paidCents)}
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
            <CardTitle>{translateDetail("notesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
          </CardContent>
        </Card>
      ) : null}
      {beltHistory.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{translateDetail("beltTitle")}</CardTitle>
            <CardDescription>
              {translateDetail("beltDescription")}
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
                      translateDetail("disciplineRemoved")}{" "}
                    · {formatDay(record.awardedAt)}
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
                        title={translateDetail("deletePromotionTitle")}
                        description={translateDetail(
                          "deletePromotionDescription",
                          {
                            belt: record.beltName,
                            date: formatDay(record.awardedAt),
                            name: fullName,
                          },
                        )}
                        confirmLabel={translateDetail("delete")}
                        formId={`delete-promotion-${record.id}`}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                        >
                          {translateDetail("delete")}
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
              <CardTitle>{translateDetail("attendanceTitle")}</CardTitle>
              <CardDescription>
                {translateDetail("attendanceDescription", {
                  count: recentAttendance.length,
                })}
                {attendanceRate !== null
                  ? ` ${translateDetail("attendanceRate", {
                      rate: percent(attendanceRate),
                    })}`
                  : ""}
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
                    {formatDay(row.date)} · {row.locationName}
                  </span>
                </div>
                <Badge
                  variant={
                    row.status === "ABSENT" ? "destructive" : "secondary"
                  }
                >
                  {translateDetail(`attendanceStatus.${row.status}`)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
