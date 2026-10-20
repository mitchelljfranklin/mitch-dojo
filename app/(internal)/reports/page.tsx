import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getMembershipsSettings } from "@/lib/settings";
import {
  getAttendanceRates,
  getCelebrations,
  getRevenueReport,
} from "@/lib/db/reports";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Reports");
  return { title: translate("metaTitle") };
}

const ATTENDANCE_WINDOW_DAYS = 30;
const REVENUE_WINDOW_MONTHS = 6;

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);
  const translate = await getTranslations("Reports");
  const translateMemberships = await getTranslations("Memberships");
  const formatter = await getFormatter();

  const [attendance, celebrations, revenue, memberships] = await Promise.all([
    getAttendanceRates(ATTENDANCE_WINDOW_DAYS),
    getCelebrations(),
    getRevenueReport(REVENUE_WINDOW_MONTHS),
    getMembershipsSettings(),
  ]);
  const currency = memberships.currency;
  const formatMoney = (cents: number) =>
    formatter.number(cents / 100, { style: "currency", currency });
  const formatPercent = (ratio: number) =>
    formatter.number(ratio, { style: "percent", maximumFractionDigits: 0 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{translate("attendance.title")}</CardTitle>
            <CardDescription>
              {translate("attendance.description", {
                days: ATTENDANCE_WINDOW_DAYS,
              })}{" "}
              {attendance.averageRatePercent !== null
                ? translate("attendance.average", {
                    percent: formatPercent(attendance.averageRatePercent / 100),
                  })
                : ""}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/attendance-rates" download>
              {translate("exportCsv")}
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {attendance.rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("attendance.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("attendance.student")}</TableHead>
                  <TableHead className="text-right">
                    {translate("attendance.attended")}
                  </TableHead>
                  <TableHead className="text-right">
                    {translate("attendance.eligible")}
                  </TableHead>
                  <TableHead className="text-right">
                    {translate("attendance.rate")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.rows.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>
                      <Link
                        href={`/students/${row.studentId}`}
                        className="hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{row.attended}</TableCell>
                    <TableCell className="text-right">{row.eligible}</TableCell>
                    <TableCell className="text-right">
                      {row.ratePercent === null
                        ? "—"
                        : formatPercent(row.ratePercent / 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{translate("birthdays.title")}</CardTitle>
              <CardDescription>
                {translate("birthdays.description")}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/api/reports/celebrations?variant=birthdays" download>
                {translate("exportCsv")}
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {celebrations.birthdays.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("birthdays.empty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {celebrations.birthdays.map((row) => (
                  <li key={row.studentId} className="flex justify-between">
                    <Link
                      href={`/students/${row.studentId}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {translate("birthdays.day", {
                        day: row.day,
                        years: row.years,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{translate("anniversaries.title")}</CardTitle>
              <CardDescription>
                {translate("anniversaries.description")}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <a
                href="/api/reports/celebrations?variant=anniversaries"
                download
              >
                {translate("exportCsv")}
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {celebrations.anniversaries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("anniversaries.empty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {celebrations.anniversaries.map((row) => (
                  <li key={row.studentId} className="flex justify-between">
                    <Link
                      href={`/students/${row.studentId}`}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {translate("anniversaries.day", {
                        day: row.day,
                        years: row.years,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{translate("revenue.title")}</CardTitle>
            <CardDescription>
              {translate("revenue.description", {
                months: REVENUE_WINDOW_MONTHS,
                total: formatMoney(revenue.totalCollectedCents),
              })}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/revenue" download>
              {translate("exportCsv")}
            </a>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground text-xs">
                {translate("revenue.recurringLabel")}
              </p>
              <p className="text-2xl font-semibold">
                {formatMoney(revenue.recurring.monthlyCents)}
              </p>
              <p className="text-muted-foreground text-xs">
                {translate("revenue.activeEnrollments", {
                  count: revenue.recurring.activeEnrollments,
                })}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground text-xs">
                {translate("revenue.collectedLabel", {
                  months: REVENUE_WINDOW_MONTHS,
                })}
              </p>
              <p className="text-2xl font-semibold">
                {formatMoney(revenue.totalCollectedCents)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              {translate("revenue.byPlan")}
            </h3>
            {revenue.byPlan.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("revenue.noPayments")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translate("revenue.plan")}</TableHead>
                    <TableHead className="text-right">
                      {translate("revenue.payments")}
                    </TableHead>
                    <TableHead className="text-right">
                      {translate("revenue.collected")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.byPlan.map((row) => (
                    <TableRow key={row.planId ?? "other"}>
                      <TableCell>{row.planName}</TableCell>
                      <TableCell className="text-right">
                        {row.payments}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.collectedCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {revenue.recurring.byPlan.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium">
                {translate("revenue.recurringByPlan")}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translate("revenue.plan")}</TableHead>
                    <TableHead>{translate("revenue.billing")}</TableHead>
                    <TableHead className="text-right">
                      {translate("revenue.enrollments")}
                    </TableHead>
                    <TableHead className="text-right">
                      {translate("revenue.monthly")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.recurring.byPlan.map((row) => (
                    <TableRow key={row.planId}>
                      <TableCell>{row.planName}</TableCell>
                      <TableCell>
                        {row.billingPeriod
                          ? translateMemberships(
                              `billingPeriod.${row.billingPeriod}`,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.activeEnrollments}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.monthlyCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
