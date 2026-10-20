import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import {
  countOpenIncidents,
  listIncidentFormOptions,
  listIncidents,
} from "@/lib/db/incidents";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { INCIDENT_SEVERITY_LABELS } from "@/lib/schemas/incident";
import { formatDate } from "@/lib/utils";

import { NewIncidentSheet } from "./new-incident-sheet";

export const dynamic = "force-dynamic";

export const metadata = { title: "Incidents" };

type IncidentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function IncidentsPage({
  searchParams,
}: IncidentsPageProps) {
  const user = await requirePermission(PERMISSIONS.INCIDENTS_VIEW);
  const canManage = hasPermission(
    user.permissions,
    PERMISSIONS.INCIDENTS_MANAGE,
  );
  const query = await searchParams;
  const statusFilter =
    query.status === "CLOSED"
      ? "CLOSED"
      : query.status === "OPEN"
        ? "OPEN"
        : undefined;

  const [incidents, openCount, options] = await Promise.all([
    listIncidents(statusFilter ? { status: statusFilter } : undefined),
    countOpenIncidents(),
    canManage ? listIncidentFormOptions() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground text-sm">
            The accident book — injuries and incidents, optionally linked to a
            student and location.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={statusFilter === "OPEN" ? "default" : "outline"}
          >
            <Link href="/incidents?status=OPEN">Open ({openCount})</Link>
          </Button>
          <Button
            asChild
            variant={statusFilter === "CLOSED" ? "default" : "outline"}
          >
            <Link href="/incidents?status=CLOSED">Closed</Link>
          </Button>
          <Button asChild variant={statusFilter ? "outline" : "default"}>
            <Link href="/incidents">All</Link>
          </Button>
          {canManage && options ? (
            <NewIncidentSheet
              students={options.students}
              locations={options.locations}
            />
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accident book</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No incidents recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>{formatDate(incident.occurredAt)}</TableCell>
                    <TableCell className="font-medium">
                      {incident.title}
                    </TableCell>
                    <TableCell>{incident.studentName ?? "—"}</TableCell>
                    <TableCell>{incident.locationName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          incident.severity === "SERIOUS"
                            ? "destructive"
                            : incident.severity === "MODERATE"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {INCIDENT_SEVERITY_LABELS[incident.severity]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          incident.status === "OPEN" ? "default" : "outline"
                        }
                      >
                        {incident.status === "OPEN" ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/incidents/${incident.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
