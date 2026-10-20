import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

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

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Analytics");
  return { title: translate("metaTitle") };
}

type AnalyticsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);

  const query = await searchParams;
  const translate = await getTranslations("Analytics");
  const formatter = await getFormatter();
  const locationId =
    query.location && query.location !== "ALL" ? query.location : undefined;

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
    getRevenueTrend(6, locationId),
    getAtRiskStudents(14, 10),
    getMembersPerLocation(),
    listAssignableLocations(),
    getMembershipsSettings(),
  ]);

  const attendanceData = attendanceTrend.map((bucket) => ({
    label: formatter.dateTime(new Date(`${bucket.weekStart}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    attendances: bucket.attendances,
    uniqueAttendees: bucket.uniqueAttendees,
  }));
  const revenueData = revenueTrend.map((bucket) => ({
    label: bucket.month,
    collected: bucket.collectedCents,
    currency,
  }));
  const formatDate = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const formatMoney = (cents: number) =>
    formatter.number(cents / 100, { style: "currency", currency });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: translate("title") }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <form className="w-48">
          <AutoSubmitSelect
            name="location"
            defaultValue={query.location ?? "ALL"}
            ariaLabel={translate("filters.locationAria")}
            options={[
              { value: "ALL", label: translate("filters.allLocations") },
              ...locations.map((location) => ({
                value: location.id,
                label: location.name,
              })),
            ]}
          />
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={translate("stats.activeMembers")}
          value={overview.activeStudents}
        />
        <StatCard
          label={translate("stats.trials")}
          value={overview.trialStudents}
        />
        <StatCard
          label={translate("stats.activeMemberships")}
          value={overview.activeEnrollments}
        />
        <StatCard
          label={translate("stats.revenue")}
          value={overview.revenueThisMonthCents / 100}
          formattedValue={formatMoney(overview.revenueThisMonthCents)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AttendanceChart data={attendanceData} />
        <div className="flex flex-col gap-2">
          {locationId ? (
            <p className="text-muted-foreground text-xs">
              {translate("filters.locationHint")}
            </p>
          ) : null}
          <RevenueChart data={revenueData} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{translate("retention.title")}</CardTitle>
            <CardDescription>
              {translate("retention.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {atRisk.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {translate("retention.empty")}
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
                        ? translate("retention.lastSeen", {
                            date: formatDate(row.lastAttendedAt),
                          })
                        : translate("retention.joined", {
                            days: row.daysSince,
                          })}
                    </span>
                    <Badge variant="destructive">
                      {translate("retention.days", {
                        count: row.daysSince,
                      })}
                    </Badge>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{translate("locations.title")}</CardTitle>
            <CardDescription>
              {translate("locations.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("locations.location")}</TableHead>
                  <TableHead className="text-right">
                    {translate("locations.members")}
                  </TableHead>
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
