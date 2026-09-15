import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { StatCard } from "@/components/stat-card";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AttendanceChart } from "@/components/analytics-attendance-chart";
import { RevenueChart } from "@/components/analytics-revenue-chart";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getAnalyticsOverview,
  getAttendanceTrend,
  getAtRiskStudents,
  getMembersPerLocation,
  getRevenueTrend,
} from "@/lib/db/analytics";
import { listAssignableLocations } from "@/lib/db/locations";
import { getMembershipsSettings } from "@/lib/settings";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function shortWeekLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const sp = await searchParams;
  const locationId =
    sp.location && sp.location !== "ALL" ? sp.location : undefined;

  const [
    overview,
    attendanceTrend,
    revenueTrend,
    atRisk,
    perLocation,
    locations,
    { currency },
  ] = await Promise.all([
    getAnalyticsOverview(),
    getAttendanceTrend(12, locationId),
    getRevenueTrend(6),
    getAtRiskStudents(14, 10),
    getMembersPerLocation(),
    listAssignableLocations(),
    getMembershipsSettings(),
  ]);

  const attendanceData = attendanceTrend.map((bucket) => ({
    label: shortWeekLabel(bucket.weekStart),
    attendances: bucket.attendances,
    uniqueAttendees: bucket.uniqueAttendees,
  }));
  const revenueData = revenueTrend.map((bucket) => ({
    label: bucket.month,
    collected: bucket.collectedCents,
    currency,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: "Analytics" }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Members, attendance, retention, and revenue at a glance.
          </p>
        </div>
        <form className="w-48">
          <AutoSubmitSelect
            name="location"
            defaultValue={sp.location ?? "ALL"}
            ariaLabel="Filter attendance by location"
            options={[
              { value: "ALL", label: "All locations" },
              ...locations.map((location) => ({
                value: location.id,
                label: location.name,
              })),
            ]}
          />
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={overview.activeStudents} />
        <StatCard label="Trials" value={overview.trialStudents} />
        <StatCard
          label="Active memberships"
          value={overview.activeEnrollments}
        />
        <StatCard
          label="Revenue this month"
          value={Math.round(overview.revenueThisMonthCents / 100)}
          suffix={currency}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AttendanceChart data={attendanceData} />
        <RevenueChart data={revenueData} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Retention — at-risk members</CardTitle>
            <CardDescription>
              Active members with no trained session in the last 14 days (or
              none since joining), worst first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {atRisk.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Everyone is training regularly — nothing to flag.
              </p>
            ) : (
              atRisk.map((row) => (
                <Link
                  key={row.studentId}
                  href={`/students/${row.studentId}`}
                  className="hover:bg-accent/40 flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="font-medium">{row.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {row.lastAttendedAt
                        ? `Last seen ${formatDate(row.lastAttendedAt)}`
                        : `Joined ${row.daysSince} days ago, never trained`}
                    </span>
                    <Badge variant="destructive">{row.daysSince}d</Badge>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members per location</CardTitle>
            <CardDescription>
              Active and trial students assigned to each dojo site.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perLocation.map((row) => (
                  <TableRow key={row.locationId}>
                    <TableCell>{row.locationName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.members}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
