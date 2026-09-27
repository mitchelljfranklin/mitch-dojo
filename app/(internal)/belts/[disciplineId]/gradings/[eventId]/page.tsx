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
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FlashToast } from "@/components/flash-toast";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getGradingEvent } from "@/lib/db/gradings";
import {
  closeGradingEventAction,
  recordGradingOutcomeAction,
  sendGradingInvitesAction,
} from "@/lib/actions/gradings";
import { formatDateUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Grading" };

type GradingEventPageProps = {
  params: Promise<{ disciplineId: string; eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const OUTCOME_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROMOTED: "Promoted",
  ABSENT: "Absent",
};

export default async function GradingEventPage({
  params,
  searchParams,
}: GradingEventPageProps) {
  const user = await requirePermission(PERMISSIONS.BELTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.BELTS_EDIT);
  const { disciplineId, eventId } = await params;
  const sp = await searchParams;
  const event = await getGradingEvent(eventId);
  if (!event) {
    notFound();
  }
  const isOpen = event.status === "OPEN";

  return (
    <div className="flex flex-col gap-6">
      {sp.created ? (
        <FlashToast variant="success" message="Grading created." />
      ) : null}
      <Breadcrumbs
        segments={[
          { label: "Belts", href: "/belts" },
          { label: event.discipline.name, href: `/belts/${disciplineId}` },
          { label: "Gradings", href: `/belts/${disciplineId}/gradings` },
          { label: event.name },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {event.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{event.discipline.name}</Badge>
            <span className="text-muted-foreground">
              {formatDateUtc(event.date)}
            </span>
            {event.location ? (
              <span className="text-muted-foreground">
                {event.location.name}
              </span>
            ) : null}
            <Badge variant={isOpen ? "secondary" : "outline"}>
              {isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>
        {canEdit && isOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <form action={sendGradingInvitesAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <Button type="submit" variant="outline">
                Email invitations
              </Button>
            </form>
            <form action={closeGradingEventAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <Button type="submit" variant="outline">
                Close grading
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Eligible students were added with their next belt as the target.
            Recording a promotion awards it on the grading date.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {event.students.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No eligible students were added to this grading.
            </p>
          ) : (
            event.students.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {row.student.firstName} {row.student.lastName}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Target: {row.targetBeltRangeEntry?.name ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={row.outcome === "PROMOTED" ? "default" : "outline"}
                  >
                    {OUTCOME_LABELS[row.outcome] ?? row.outcome}
                  </Badge>
                  {canEdit && isOpen ? (
                    <>
                      {row.outcome !== "PROMOTED" ? (
                        <form action={recordGradingOutcomeAction}>
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
                          <input
                            type="hidden"
                            name="studentId"
                            value={row.student.id}
                          />
                          <input
                            type="hidden"
                            name="outcome"
                            value="PROMOTED"
                          />
                          <Button type="submit" size="sm">
                            Promote
                          </Button>
                        </form>
                      ) : null}
                      {row.outcome !== "ABSENT" ? (
                        <form action={recordGradingOutcomeAction}>
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
                          <input
                            type="hidden"
                            name="studentId"
                            value={row.student.id}
                          />
                          <input type="hidden" name="outcome" value="ABSENT" />
                          <Button type="submit" size="sm" variant="ghost">
                            Absent
                          </Button>
                        </form>
                      ) : (
                        <form action={recordGradingOutcomeAction}>
                          <input
                            type="hidden"
                            name="eventId"
                            value={event.id}
                          />
                          <input
                            type="hidden"
                            name="studentId"
                            value={row.student.id}
                          />
                          <input type="hidden" name="outcome" value="PENDING" />
                          <Button type="submit" size="sm" variant="ghost">
                            Reset
                          </Button>
                        </form>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
