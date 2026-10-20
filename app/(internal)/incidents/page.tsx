import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

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

import { NewIncidentSheet } from "./new-incident-sheet";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Incidents");
  return { title: translate("metaTitle") };
}

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
  const translate = await getTranslations("Incidents");
  const formatter = await getFormatter();
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
  const formatDate = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={statusFilter === "OPEN" ? "default" : "outline"}
          >
            <Link href="/incidents?status=OPEN">
              {translate("filters.open", { count: openCount })}
            </Link>
          </Button>
          <Button
            asChild
            variant={statusFilter === "CLOSED" ? "default" : "outline"}
          >
            <Link href="/incidents?status=CLOSED">
              {translate("filters.closed")}
            </Link>
          </Button>
          <Button asChild variant={statusFilter ? "outline" : "default"}>
            <Link href="/incidents">{translate("filters.all")}</Link>
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
          <CardTitle>{translate("bookTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate("table.date")}</TableHead>
                  <TableHead>{translate("table.title")}</TableHead>
                  <TableHead>{translate("table.student")}</TableHead>
                  <TableHead>{translate("table.location")}</TableHead>
                  <TableHead>{translate("table.severity")}</TableHead>
                  <TableHead>{translate("table.status")}</TableHead>
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
                        {translate(`severity.${incident.severity}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          incident.status === "OPEN" ? "default" : "outline"
                        }
                      >
                        {translate(`status.${incident.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/incidents/${incident.id}`}>
                          {translate("table.view")}
                        </Link>
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
