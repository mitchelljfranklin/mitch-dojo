import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listSessions } from "@/lib/db/sessions";
import { listAssignableLocations } from "@/lib/db/locations";
import { listDisciplines } from "@/lib/db/belts";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Attendance");
  return { title: t("metaTitle") };
}

const PAGE_SIZE = 25;
// Default window: last 4 weeks + next 2 — today's classes on top of the
// list, recent history one click away. Time-travel beyond that via dates.
const DEFAULT_FROM_DAYS = -27;
const DEFAULT_TO_DAYS = 14;

type AttendancePageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW);
  const t = await getTranslations("Attendance");
  const format = await getFormatter();

  const sp = await searchParams;
  const from = sp.from || isoDaysFromToday(DEFAULT_FROM_DAYS);
  const to = sp.to || isoDaysFromToday(DEFAULT_TO_DAYS);
  const location = sp.location || "";
  const statusInput =
    sp.status === "SCHEDULED" || sp.status === "CANCELLED" ? sp.status : "";
  const statusFilter = statusInput || undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // The course filter matches the discipline select on the booking page in
  // spirit — here we list courses directly (they are few in a single dojo).
  const [locations, disciplines] = await Promise.all([
    listAssignableLocations(),
    listDisciplines(),
  ]);

  const courseName = sp.course?.trim() ?? "";
  const result = await listSessions({
    fromDate: new Date(`${from}T00:00:00`),
    toDate: new Date(`${to}T00:00:00`),
    courseNameContains: courseName || undefined,
    locationId: location || undefined,
    status: statusFilter,
    page,
    pageSize: PAGE_SIZE,
  });
  const day = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: t("title") }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessionsTitle")}</CardTitle>
          <CardDescription>{t("sessionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="attendance-from">{t("filters.from")}</Label>
              <Input
                id="attendance-from"
                name="from"
                type="date"
                defaultValue={from}
                className="w-36"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attendance-to">{t("filters.to")}</Label>
              <Input
                id="attendance-to"
                name="to"
                type="date"
                defaultValue={to}
                className="w-36"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attendance-course">{t("filters.course")}</Label>
              <Input
                id="attendance-course"
                name="course"
                placeholder={t("filters.coursePlaceholder")}
                defaultValue={sp.course ?? ""}
                className="w-44"
              />
            </div>
            <div className="grid w-44 gap-2">
              <Label htmlFor="attendance-location">
                {t("filters.location")}
              </Label>
              <AutoSubmitSelect
                name="location"
                id="attendance-location"
                defaultValue={location || "ALL"}
                options={[
                  { value: "ALL", label: t("filters.allLocations") },
                  ...locations.map((entry) => ({
                    value: entry.id,
                    label: entry.name,
                  })),
                ]}
              />
            </div>
            <div className="grid w-40 gap-2">
              <Label htmlFor="attendance-status">{t("filters.status")}</Label>
              <AutoSubmitSelect
                name="status"
                id="attendance-status"
                defaultValue={statusInput || "ALL"}
                options={[
                  { value: "ALL", label: t("filters.allStatuses") },
                  { value: "SCHEDULED", label: t("filters.scheduled") },
                  { value: "CANCELLED", label: t("filters.cancelled") },
                ]}
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              {t("filters.filter")}
            </Button>
            <Link
              href="/attendance"
              className="text-muted-foreground pb-2 text-sm hover:underline"
            >
              {t("filters.clear")}
            </Link>
          </form>

          {result.sessions.length === 0 ? (
            <EmptyState
              icon="sessions"
              title={t("empty.title")}
              description={t("empty.description")}
            />
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.date")}</TableHead>
                      <TableHead>{t("table.time")}</TableHead>
                      <TableHead>{t("table.course")}</TableHead>
                      <TableHead>{t("table.location")}</TableHead>
                      <TableHead>{t("table.trainer")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                      <TableHead>{t("table.marked")}</TableHead>
                      <TableHead>
                        <span className="sr-only">{t("table.openSheet")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="text-sm font-medium">
                          {day(session.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {session.startTime}–{session.endTime}
                        </TableCell>
                        <TableCell className="text-sm">
                          {session.courseName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {session.locationName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {session.trainerName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              session.status === "CANCELLED"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {session.status === "CANCELLED"
                              ? t("status.cancelled")
                              : t("status.scheduled")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {session.marked === 0
                            ? t("table.notMarked")
                            : t("table.markedSummary", {
                                marked: session.marked,
                                trained: session.trained,
                              })}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/sessions/${session.id}`}>
                              {t("table.openSheet")}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={result.totalCount}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
