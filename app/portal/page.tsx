import { cookies, headers } from "next/headers";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import {
  getPortalAttendance,
  getPortalInvoices,
  getPortalStudent,
  getPortalUpcomingSessions,
  verifyPortalToken,
} from "@/lib/db/portal";
import { getMembershipsSettings } from "@/lib/settings";
import { formatDate, formatDateUtc, formatMoney } from "@/lib/utils";
import { portalSignOutAction } from "./sign-out";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member portal",
  robots: { index: false, follow: false },
};

const PORTAL_COOKIE = "portal_token";
const PORTAL_LOADS_PER_MIN = 30;

const SESSION_DAYS_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PortalPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function weekdayLabel(date: Date): string {
  return SESSION_DAYS_LABELS[date.getDay()] ?? "";
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const sp = await searchParams;

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("portal-page", clientIp, PORTAL_LOADS_PER_MIN)) {
    return (
      <PortalShell>
        <Card>
          <CardHeader>
            <CardTitle>Too many requests</CardTitle>
            <CardDescription>
              Please wait a moment and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalShell>
    );
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PORTAL_COOKIE)?.value ?? "";
  const studentId = await verifyPortalToken(rawToken);

  if (!studentId) {
    return (
      <PortalShell>
        <Card>
          <CardHeader>
            <CardTitle>Portal access needed</CardTitle>
            <CardDescription>
              {sp.error === "rate"
                ? "Too many attempts — please wait a moment, then reopen your link."
                : "Your portal link has expired or is not valid. Ask us at the dojo for a fresh link any time."}
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalShell>
    );
  }

  const [student, upcoming, attendance, invoices, { currency }] =
    await Promise.all([
      getPortalStudent(studentId),
      getPortalUpcomingSessions(studentId),
      getPortalAttendance(studentId),
      getPortalInvoices(studentId),
      getMembershipsSettings(),
    ]);

  if (!student) {
    return (
      <PortalShell>
        <Card>
          <CardHeader>
            <CardTitle>Member not found</CardTitle>
            <CardDescription>
              Please ask us at the dojo for a fresh portal link.
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalShell>
    );
  }

  const fullName = `${student.firstName} ${student.lastName}`;
  const currentBelts = student.belts.slice(0, student.disciplines.length);

  return (
    <PortalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{student.status}</Badge>
            {student.locations.map((link) => (
              <Badge key={link.locationId} variant="outline">
                {link.location.name}
              </Badge>
            ))}
            <span className="text-muted-foreground text-xs">
              Member since {formatDate(student.joinedAt)}
            </span>
          </div>
        </div>
        <form action={portalSignOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your progress</CardTitle>
            <CardDescription>
              {attendance.total} class{attendance.total === 1 ? "" : "es"}{" "}
              trained in total.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {currentBelts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No gradings yet — your first belt is waiting for you!
              </p>
            ) : (
              currentBelts.map((belt) => (
                <div
                  key={belt.id}
                  className="flex items-center gap-3 rounded-md border p-2 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-6 shrink-0 rounded-full border border-black/20"
                    style={{ backgroundColor: belt.colorHex }}
                  />
                  <span className="font-medium">{belt.beltName}</span>
                  <span className="text-muted-foreground text-xs">
                    since {formatDate(belt.awardedAt)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>Next 14 days at your locations.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No scheduled classes in the next two weeks.
              </p>
            ) : (
              upcoming.slice(0, 6).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{session.courseName}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateUtc(session.date)} ·{" "}
                      {weekdayLabel(session.date)} {session.startTime}–
                      {session.endTime}
                      {session.trainerName ? ` · ${session.trainerName}` : ""}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {session.locationName}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent attendance</CardTitle>
            <CardDescription>Your last classes on the mats.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {attendance.recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No classes attended yet — see you soon!
              </p>
            ) : (
              attendance.recent.map((row, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span>{row.courseName}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateUtc(row.date)}
                    </span>
                  </div>
                  <Badge variant="secondary">{row.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              {invoices.outstandingCents > 0
                ? "Please settle your balance at the front desk or by bank transfer."
                : "You are all square — thank you!"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {invoices.rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No invoices yet.</p>
            ) : (
              <>
                {invoices.rows.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <span className="font-mono text-xs">#{invoice.number}</span>
                    <span className="text-muted-foreground text-xs">
                      due {formatDate(invoice.dueDate)}
                    </span>
                    <Badge
                      variant={
                        invoice.status === "PAID" ? "secondary" : "default"
                      }
                    >
                      {invoice.status === "PAID"
                        ? "Paid"
                        : formatMoney(
                            invoice.totalCents - invoice.paidCents,
                            currency,
                          )}
                    </Badge>
                  </div>
                ))}
                {invoices.outstandingCents > 0 ? (
                  <div className="flex justify-between border-t pt-2 text-sm font-medium">
                    <span>Outstanding</span>
                    <span>
                      {formatMoney(invoices.outstandingCents, currency)}
                    </span>
                  </div>
                ) : null}
              </>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              Contact details on file: {student.email ?? "no email"} ·{" "}
              {student.phone ?? "no phone"}. Ask us at the dojo to update them.
            </p>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl p-6">{children}</div>;
}
