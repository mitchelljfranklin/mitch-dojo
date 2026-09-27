import Link from "next/link";
import { notFound } from "next/navigation";

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
import { formatDateUtc } from "@/lib/utils";

import { NewGradingEventSheet } from "./new-grading-event-sheet";

export const dynamic = "force-dynamic";

export const metadata = { title: "Gradings" };

type GradingsPageProps = {
  params: Promise<{ disciplineId: string }>;
};

export default async function GradingsPage({ params }: GradingsPageProps) {
  await requirePermission(PERMISSIONS.BELTS_VIEW);
  const { disciplineId } = await params;
  const [discipline, events, locations] = await Promise.all([
    getDiscipline(disciplineId),
    listGradingEvents(disciplineId),
    listAssignableLocations(),
  ]);
  if (!discipline) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: "Belts", href: "/belts" },
          { label: discipline.name, href: `/belts/${disciplineId}` },
          { label: "Gradings" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Gradings — {discipline.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Schedule a grading day, invite eligible students, and record the
            outcomes.
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
          <CardTitle>Grading events</CardTitle>
          <CardDescription>
            Recording a promotion here awards the belt on the event date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No gradings yet — create one to get started.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Promoted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm font-medium">
                        {formatDateUtc(event.date)}
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
                          {event.status === "OPEN" ? "Open" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/belts/${disciplineId}/gradings/${event.id}`}
                          >
                            Open
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
