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

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Belts.gradings.event");
  return { title: t("metaTitle") };
}

type GradingEventPageProps = {
  params: Promise<{ disciplineId: string; eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function GradingEventPage({
  params,
  searchParams,
}: GradingEventPageProps) {
  const user = await requirePermission(PERMISSIONS.BELTS_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.BELTS_EDIT);
  const t = await getTranslations("Belts.gradings");
  const eventT = await getTranslations("Belts.gradings.event");
  const beltsT = await getTranslations("Belts");
  const format = await getFormatter();
  const { disciplineId, eventId } = await params;
  const sp = await searchParams;
  const event = await getGradingEvent(eventId);
  if (!event) {
    notFound();
  }
  const isOpen = event.status === "OPEN";
  const day = format.dateTime(event.date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-6">
      {sp.created ? (
        <FlashToast variant="success" message={t("created")} />
      ) : null}
      <Breadcrumbs
        segments={[
          { label: beltsT("title"), href: "/belts" },
          { label: event.discipline.name, href: `/belts/${disciplineId}` },
          {
            label: t("metaTitle"),
            href: `/belts/${disciplineId}/gradings`,
          },
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
            <span className="text-muted-foreground">{day}</span>
            {event.location ? (
              <span className="text-muted-foreground">
                {event.location.name}
              </span>
            ) : null}
            <Badge variant={isOpen ? "secondary" : "outline"}>
              {t(`status.${event.status}`)}
            </Badge>
          </div>
        </div>
        {canEdit && isOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <form action={sendGradingInvitesAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <Button type="submit" variant="outline">
                {eventT("emailInvites")}
              </Button>
            </form>
            <form action={closeGradingEventAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <Button type="submit" variant="outline">
                {eventT("close")}
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{eventT("studentsTitle")}</CardTitle>
          <CardDescription>{eventT("studentsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {event.students.length === 0 ? (
            <p className="text-muted-foreground text-sm">{eventT("empty")}</p>
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
                    {eventT("target", {
                      belt: row.targetBeltRangeEntry?.name ?? "—",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={row.outcome === "PROMOTED" ? "default" : "outline"}
                  >
                    {eventT(`outcomes.${row.outcome}`)}
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
                            {eventT("promote")}
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
                            {eventT("absent")}
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
                            {eventT("reset")}
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
