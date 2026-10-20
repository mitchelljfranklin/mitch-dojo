import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
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
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getDiscipline } from "@/lib/db/belts";
import { listGradingEvents } from "@/lib/db/gradings";
import { listAssignableLocations } from "@/lib/db/locations";

import { NewGradingEventSheet } from "./new-grading-event-sheet";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Belts.gradings");
  return { title: translate("metaTitle") };
}

type GradingsPageProps = {
  params: Promise<{ disciplineId: string }>;
};

export default async function GradingsPage({ params }: GradingsPageProps) {
  await requirePermission(PERMISSIONS.BELTS_VIEW);
  const translate = await getTranslations("Belts.gradings");
  const translateBelts = await getTranslations("Belts");
  const formatter = await getFormatter();
  const { disciplineId } = await params;
  const [discipline, events, locations] = await Promise.all([
    getDiscipline(disciplineId),
    listGradingEvents(disciplineId),
    listAssignableLocations(),
  ]);
  if (!discipline) {
    notFound();
  }
  const formatDay = (value: Date) =>
    formatter.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: translateBelts("title"), href: "/belts" },
          { label: discipline.name, href: `/belts/${disciplineId}` },
          { label: translate("metaTitle") },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title", { name: discipline.name })}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <NewGradingEventSheet
          disciplineId={disciplineId}
          disciplineName={discipline.name}
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
          }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate("eventsTitle")}</CardTitle>
          <CardDescription>{translate("eventsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {translate("empty")}
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translate("table.date")}</TableHead>
                    <TableHead>{translate("table.name")}</TableHead>
                    <TableHead>{translate("table.location")}</TableHead>
                    <TableHead>{translate("table.promoted")}</TableHead>
                    <TableHead>{translate("table.status")}</TableHead>
                    <TableHead>
                      <span className="sr-only">{translate("table.open")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm font-medium">
                        {formatDay(event.date)}
                      </TableCell>
                      <TableCell className="text-sm">{event.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {event.locationName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.promotedCount}/{event.studentCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.status === "OPEN" ? "secondary" : "outline"
                          }
                        >
                          {translate(`status.${event.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/belts/${disciplineId}/gradings/${event.id}`}
                          >
                            {translate("table.open")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
