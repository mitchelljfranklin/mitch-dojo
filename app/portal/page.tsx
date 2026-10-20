import Link from "next/link";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
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
import { portalSignOutAction } from "./sign-out";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Portal");
  return {
    title: translate("metaTitle"),
    robots: { index: false, follow: false },
  };
}

const PORTAL_COOKIE = "portal_token";
const PORTAL_LOADS_PER_MIN = 30;

type PortalPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const query = await searchParams;
  const translate = await getTranslations("Portal");
  const formatter = await getFormatter();

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("portal-page", clientIp, PORTAL_LOADS_PER_MIN)) {
    return (
      <PortalShell>
        <Card>
          <CardHeader>
            <CardTitle>{translate("rateLimitedTitle")}</CardTitle>
            <CardDescription>
              {translate("rateLimitedDescription")}
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
            <CardTitle>{translate("accessTitle")}</CardTitle>
            <CardDescription>
              {query.error === "rate"
                ? translate("accessRate")
                : translate("accessExpired")}
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
        <Card>
          <CardHeader>
            <CardTitle>{translate("noMembersTitle")}</CardTitle>
            <CardDescription>
              {translate("noMembersDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalShell>
    );
  }

  const activeChildId =
    access.householdId &&
    query.child &&
    children.some((child) => child.id === query.child)
      ? query.child
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
        <Card>
          <CardHeader>
            <CardTitle>{translate("notFoundTitle")}</CardTitle>
            <CardDescription>
              {translate("notFoundDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </PortalShell>
    );
  }

  const formatDay = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const formatLocalDay = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const money = (cents: number) => {
    try {
      return formatter.number(cents / 100, { style: "currency", currency });
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  };

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
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {translate("label")}
      </p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {translate(`statuses.student.${student.status}`)}
            </Badge>
            {student.locations.map((link) => (
              <Badge key={link.locationId} variant="outline">
                {link.location.name}
              </Badge>
            ))}
            <span className="text-muted-foreground text-xs">
              {translate("memberSince", { date: formatDay(student.joinedAt) })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/portal/calendar" download>
              {translate("addToCalendar")}
            </a>
          </Button>
          <form action={portalSignOutAction}>
            <Button type="submit" variant="outline" size="sm">
              {translate("signOut")}
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
            <CardTitle>{translate("progress.title")}</CardTitle>
            <CardDescription>
              {translate("progress.classes", { count: attendance.total })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {currentBelts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("progress.none")}
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
                    {translate("progress.since", {
                      date: formatDay(belt.awardedAt),
                    })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{translate("upcoming.title")}</CardTitle>
            <CardDescription>
              {translate("upcoming.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("upcoming.none")}
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
                      {formatDay(session.date)} ·{" "}
                      {formatter.dateTime(session.date, {
                        weekday: "short",
                        timeZone: "UTC",
                      })}{" "}
                      {session.startTime}–{session.endTime}
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
            <CardTitle>{translate("attendance.title")}</CardTitle>
            <CardDescription>
              {translate("attendance.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {attendance.recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("attendance.none")}
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
                      {formatDay(row.date)}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {translate(`statuses.attendance.${row.status}`)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{translate("account.title")}</CardTitle>
            <CardDescription>
              {invoices.outstandingCents > 0
                ? translate("account.balance")
                : translate("account.square")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {invoices.rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("account.none")}
              </p>
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
                      {translate("account.due", {
                        date: formatLocalDay(invoice.dueDate),
                      })}
                    </span>
                    <Badge
                      variant={
                        invoice.status === "PAID" ? "secondary" : "default"
                      }
                    >
                      {invoice.status === "PAID"
                        ? translate("account.paid")
                        : money(invoice.totalCents - invoice.paidCents)}
                    </Badge>
                  </div>
                ))}
                {invoices.outstandingCents > 0 ? (
                  <div className="flex justify-between border-t pt-2 text-sm font-medium">
                    <span>{translate("account.outstanding")}</span>
                    <span>{money(invoices.outstandingCents)}</span>
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
            <CardTitle>{translate("details.title")}</CardTitle>
            <CardDescription>
              {translate("details.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <PortalContactForm contact={contact} />
            <div className="border-t pt-6">
              <h3 className="mb-2 text-sm font-medium">
                {translate("details.emailPreferences")}
              </h3>
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
          <CardTitle>{translate("documents.title")}</CardTitle>
          <CardDescription>
            {translate("documents.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {agreementStatuses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("documents.none")}
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
                      {translate("documents.signed", {
                        date: formatLocalDay(status.signedAt!),
                      })}
                    </Badge>
                  ) : status.reSignRequired ? (
                    <Badge variant="destructive">
                      {translate("documents.updated")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {translate("documents.needed")}
                    </Badge>
                  )}
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{status.bodyMarkdown}</ReactMarkdown>
                  </div>
                  {status.signed && !status.reSignRequired ? (
                    <p className="text-muted-foreground text-xs">
                      {translate("documents.signedBy", {
                        name: status.signedByName ?? "",
                        date: formatLocalDay(status.signedAt!),
                      })}
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
                    {translate("documents.download")}
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
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <BrandMark />
        <LocaleSwitcher />
      </div>
      {children}
    </div>
  );
}
