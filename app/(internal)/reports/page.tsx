import Link from "next/link";

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
import { formatMoney, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reports" };

const ATTENDANCE_WINDOW_DAYS = 30;
const REVENUE_WINDOW_MONTHS = 6;

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const [attendance, celebrations, revenue, memberships] = await Promise.all([
    getAttendanceRates(ATTENDANCE_WINDOW_DAYS),
    getCelebrations(),
    getRevenueReport(REVENUE_WINDOW_MONTHS),
    getMembershipsSettings(),
  ]);
  const currency = memberships.currency;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Attendance, celebrations, and revenue. Every report exports to CSV.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Attendance rate</CardTitle>
            <CardDescription>
              Attended ÷ eligible sessions over the last{" "}
              {ATTENDANCE_WINDOW_DAYS} days.{" "}
              {attendance.averageRatePercent !== null
                ? `School average ${formatPercent(
                    attendance.averageRatePercent / 100,
                  )}.`
                : ""}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/attendance-rates" download>
              Export CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {attendance.rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No eligible sessions in the period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
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
              <CardTitle>Birthdays this month</CardTitle>
              <CardDescription>
                Active and trial students with a birthday this month.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/api/reports/celebrations?variant=birthdays" download>
                Export CSV
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {celebrations.birthdays.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No birthdays this month.
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
                      Day {row.day} · turns {row.years}
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
              <CardTitle>Training anniversaries</CardTitle>
              <CardDescription>
                Students marking a year or more with the school this month.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <a
                href="/api/reports/celebrations?variant=anniversaries"
                download
              >
                Export CSV
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {celebrations.anniversaries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No anniversaries this month.
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
                      Day {row.day} · {row.years}{" "}
                      {row.years === 1 ? "year" : "years"}
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
            <CardTitle>Revenue</CardTitle>
            <CardDescription>
              Recorded payments by plan over the last {REVENUE_WINDOW_MONTHS}{" "}
              months ({formatMoney(revenue.totalCollectedCents, currency)}{" "}
              total), plus the estimated monthly recurring revenue from active
              recurring enrollments.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/revenue" download>
              Export CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground text-xs">
                Estimated monthly recurring revenue
              </p>
              <p className="text-2xl font-semibold">
                {formatMoney(revenue.recurring.monthlyCents, currency)}
              </p>
              <p className="text-muted-foreground text-xs">
                {revenue.recurring.activeEnrollments} active recurring
                enrollment
                {revenue.recurring.activeEnrollments === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-muted-foreground text-xs">
                Collected (last {REVENUE_WINDOW_MONTHS} months)
              </p>
              <p className="text-2xl font-semibold">
                {formatMoney(revenue.totalCollectedCents, currency)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">By plan (collected)</h3>
            {revenue.byPlan.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No payments in the period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
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
                        {formatMoney(row.collectedCents, currency)}
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
                Recurring estimate by plan
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.recurring.byPlan.map((row) => (
                    <TableRow key={row.planId}>
                      <TableCell>{row.planName}</TableCell>
                      <TableCell>{row.billingPeriod ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {row.activeEnrollments}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.monthlyCents, currency)}
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
