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
  const t = await getTranslations("Belts.gradings");
  return { title: t("metaTitle") };
}

type GradingsPageProps = {
  params: Promise<{ disciplineId: string }>;
};

export default async function GradingsPage({ params }: GradingsPageProps) {
  await requirePermission(PERMISSIONS.BELTS_VIEW);
  const t = await getTranslations("Belts.gradings");
  const beltsT = await getTranslations("Belts");
  const format = await getFormatter();
  const { disciplineId } = await params;
  const [discipline, events, locations] = await Promise.all([
    getDiscipline(disciplineId),
    listGradingEvents(disciplineId),
    listAssignableLocations(),
  ]);
  if (!discipline) {
    notFound();
  }
  const day = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: beltsT("title"), href: "/belts" },
          { label: discipline.name, href: `/belts/${disciplineId}` },
          { label: t("metaTitle") },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title", { name: discipline.name })}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
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
          <CardTitle>{t("eventsTitle")}</CardTitle>
          <CardDescription>{t("eventsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead>{t("table.name")}</TableHead>
                    <TableHead>{t("table.location")}</TableHead>
                    <TableHead>{t("table.promoted")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>
                      <span className="sr-only">{t("table.open")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm font-medium">
                        {day(event.date)}
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
                          {t(`status.${event.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/belts/${disciplineId}/gradings/${event.id}`}
                          >
                            {t("table.open")}
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
