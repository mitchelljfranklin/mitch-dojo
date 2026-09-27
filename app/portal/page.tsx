import Link from "next/link";
import { cookies, headers } from "next/headers";

import { BrandMark } from "@/components/brand-mark";
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
  getHouseholdPortalChildren,
  getPortalAttendance,
  getPortalContact,
  getPortalInvoices,
  getPortalStudent,
  getPortalUpcomingSessions,
  resolvePortalToken,
} from "@/lib/db/portal";
import { getStudentAgreementStatuses } from "@/lib/db/agreements";
import ReactMarkdown from "react-markdown";
import { PortalAgreementSignForm } from "./agreement-sign-form";
import { PortalContactForm, PortalPreferencesForm } from "./contact-form";
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
  const access = await resolvePortalToken(rawToken);

  if (!access) {
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

  // A household token shows all of a family's children; one child is selected
  // at a time via ?child=. A student token has a single child.
  const children = access.householdId
    ? await getHouseholdPortalChildren(access.householdId)
    : [];
  const studentId = access.studentId ?? children[0]?.id ?? null;

  if (!studentId) {
    return (
      <PortalShell>
        <BrandMark />
        <Card>
          <CardHeader>
            <CardTitle>No members yet</CardTitle>
            <CardDescription>
              This household has no students to show. Ask us at the dojo for a
              fresh link.
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalShell>
    );
  }

  const activeChildId =
    access.householdId &&
    sp.child &&
    children.some((child) => child.id === sp.child)
      ? sp.child
      : studentId;

  const [
    student,
    upcoming,
    attendance,
    invoices,
    agreementStatuses,
    contact,
    { currency },
  ] = await Promise.all([
    getPortalStudent(activeChildId),
    getPortalUpcomingSessions(activeChildId),
    getPortalAttendance(activeChildId),
    getPortalInvoices(activeChildId),
    getStudentAgreementStatuses(activeChildId),
    getPortalContact(activeChildId),
    getMembershipsSettings(),
  ]);

  if (!student) {
    return (
      <PortalShell>
        <BrandMark />
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
  // One current belt per discipline: belts are ordered newest-first, so the
  // first award seen for each discipline is that discipline's current rank
  // (slicing the first N rows showed two belts from one art otherwise).
  const currentBelts: typeof student.belts = [];
  const seenDisciplines = new Set<string>();
  for (const belt of student.belts) {
    const key = belt.beltRangeEntry?.disciplineId ?? "unknown";
    if (seenDisciplines.has(key)) continue;
    seenDisciplines.add(key);
    currentBelts.push(belt);
  }

  return (
    <PortalShell>
      <BrandMark />
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        Member portal
      </p>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/portal/calendar" download>
              Add classes to calendar
            </a>
          </Button>
          <form action={portalSignOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      {children.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {children.map((child) => (
            <Button
              key={child.id}
              asChild
              size="sm"
              variant={child.id === activeChildId ? "default" : "outline"}
            >
              <Link href={`/portal?child=${child.id}`}>
                {child.firstName} {child.lastName}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

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
                    since {formatDateUtc(belt.awardedAt)}
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
                    <a
                      href={`/portal/invoice/${invoice.id}`}
                      className="text-xs underline"
                      download
                    >
                      PDF
                    </a>
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
          </CardContent>
        </Card>
      </div>

      {contact ? (
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              Keep your contact details up to date — we use them for class
              reminders and in an emergency.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <PortalContactForm contact={contact} />
            <div className="border-t pt-6">
              <h3 className="mb-2 text-sm font-medium">Email preferences</h3>
              <PortalPreferencesForm
                studentId={contact.studentId}
                emailOptOut={contact.emailOptOut}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Documents &amp; consent</CardTitle>
          <CardDescription>
            Read and sign our membership documents. Signing digitally is
            equivalent to signing on paper — your name and the date are
            recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {agreementStatuses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No documents to sign yet.
            </p>
          ) : (
            agreementStatuses.map((status) => (
              <details
                key={status.documentId}
                className="rounded-md border p-4 text-sm"
              >
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <span className="font-medium">{status.title}</span>
                  {status.signed && !status.reSignRequired ? (
                    <Badge variant="secondary">
                      Signed {formatDate(status.signedAt!)}
                    </Badge>
                  ) : status.reSignRequired ? (
                    <Badge variant="destructive">
                      Updated — please sign the new version
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Signature needed</Badge>
                  )}
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{status.bodyMarkdown}</ReactMarkdown>
                  </div>
                  {status.signed && !status.reSignRequired ? (
                    <p className="text-muted-foreground text-xs">
                      Signed by {status.signedByName} on{" "}
                      {formatDate(status.signedAt!)}.
                    </p>
                  ) : (
                    <PortalAgreementSignForm
                      documentId={status.documentId}
                      documentLabel={status.title}
                    />
                  )}
                  <a
                    href={`/portal/agreement/${status.documentId}?studentId=${activeChildId}`}
                    className="w-fit text-xs underline"
                    download
                  >
                    Download PDF
                  </a>
                </div>
              </details>
            ))
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl p-6">{children}</div>;
}
