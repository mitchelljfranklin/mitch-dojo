import Link from "next/link";

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
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Attendance" };

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

  const sp = await searchParams;
  const from = sp.from || isoDaysFromToday(DEFAULT_FROM_DAYS);
  const to = sp.to || isoDaysFromToday(DEFAULT_TO_DAYS);
  const course = sp.course || "";
  const location = sp.location || "";
  const status = sp.status || "";
  const page = sp.page ? parseInt(sp.page, 10) || 1 : 1;

  // The course filter matches the discipline select on the booking page in
  // spirit — here we list courses directly (they are few in a single dojo).
  const [locations, disciplines] = await Promise.all([
    listAssignableLocations(),
    listDisciplines(),
  ]);

  const result = await listSessions({
    fromDate: new Date(`${from}T00:00:00`),
    toDate: new Date(`${to}T00:00:00`),
    locationId: location || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  // Course-name filter is applied here because the schema filter is by id
  // and the browser filters by free text typed against course names.
  const term = sp.course?.trim().toLowerCase() ?? "";
  const filtered = term
    ? {
        ...result,
        sessions: result.sessions.filter((session) =>
          session.courseName.toLowerCase().includes(term),
        ),
      }
    : result;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs segments={[{ label: "Attendance" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm">
          Every session, past and upcoming — open any sheet to view or mark it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Default window covers the last 4 weeks and the next 2 — adjust the
            dates to travel further.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="attendance-from">From</Label>
              <Input
                id="attendance-from"
                name="from"
                type="date"
                defaultValue={from}
                className="w-36"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attendance-to">To</Label>
              <Input
                id="attendance-to"
                name="to"
                type="date"
                defaultValue={to}
                className="w-36"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attendance-course">Course</Label>
              <Input
                id="attendance-course"
                name="course"
                placeholder="Course name…"
                defaultValue={sp.course ?? ""}
                className="w-44"
              />
            </div>
            <div className="grid w-44 gap-2">
              <Label htmlFor="attendance-location">Location</Label>
              <AutoSubmitSelect
                name="location"
                id="attendance-location"
                defaultValue={location || "ALL"}
                options={[
                  { value: "ALL", label: "All locations" },
                  ...locations.map((entry) => ({
                    value: entry.id,
                    label: entry.name,
                  })),
                ]}
              />
            </div>
            <div className="grid w-40 gap-2">
              <Label htmlFor="attendance-status">Status</Label>
              <AutoSubmitSelect
                name="status"
                id="attendance-status"
                defaultValue={status || "ALL"}
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "SCHEDULED", label: "Scheduled" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              Filter
            </Button>
            <Link
              href="/attendance"
              className="text-muted-foreground pb-2 text-sm hover:underline"
            >
              Clear
            </Link>
          </form>

          {filtered.sessions.length === 0 ? (
            <EmptyState
              icon="sessions"
              title="No sessions in this window"
              description="Adjust the date range or filters — sessions appear here once their course has weekly times."
            />
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Marked</TableHead>
                      <TableHead>
                        <span className="sr-only">Open sheet</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="text-sm font-medium">
                          {formatDate(session.date)}
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
                              ? "Cancelled"
                              : "Scheduled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {session.marked === 0
                            ? "Not marked"
                            : `${session.marked} marked · ${session.trained} trained`}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/sessions/${session.id}`}>
                              Open sheet
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
                totalCount={filtered.totalCount}
                itemLabel="sessions"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
