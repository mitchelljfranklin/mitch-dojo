import Link from "next/link";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureUpcomingSessions, getWeeklySchedule } from "@/lib/db/sessions";
import { WEEKDAY_ORDER } from "@/lib/schemas/course";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Classes.schedule");
  return { title: t("metaTitle") };
}

type ScheduleSlot = {
  startTime: string;
  endTime: string;
  courseId: string;
  courseName: string;
  locationName: string;
  trainerName: string | null;
  isActive: boolean;
};

function formatTime(
  time: string,
  format: Awaited<ReturnType<typeof getFormatter>>,
): string {
  const [hours, minutes] = time.split(":").map(Number);
  return format.dateTime(
    new Date(Date.UTC(2000, 0, 1, hours ?? 0, minutes ?? 0)),
    { hour: "numeric", minute: "2-digit", timeZone: "UTC" },
  );
}

export default async function SchedulePage() {
  await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const t = await getTranslations("Classes.schedule");
  const classesT = await getTranslations("Classes");
  const format = await getFormatter();
  // Generate upcoming sessions on view too (idempotent) so the schedule and
  // check-in always have concrete rows to attach to. The scheduler also runs
  // this every tick, so a dojo that never opens a course page still gets them.
  await ensureUpcomingSessions();
  const slots = await getWeeklySchedule();

  const byWeekday = new Map<number, ScheduleSlot[]>();
  for (const slot of slots) {
    const list = byWeekday.get(slot.weekday) ?? [];
    list.push(slot);
    byWeekday.set(slot.weekday, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        segments={[
          { label: classesT("title"), href: "/classes" },
          { label: t("title") },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/classes">{classesT("actions.viewCourses")}</Link>
        </Button>
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("emptyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {t("emptyDescription")}
            </p>
            <Link
              href="/classes/new"
              className="text-primary mt-2 inline-block text-sm hover:underline"
            >
              {classesT("actions.createCourse")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WEEKDAY_ORDER.map((weekday) => {
            const daySlots = (byWeekday.get(weekday) ?? []).sort((a, b) =>
              a.startTime.localeCompare(b.startTime),
            );
            return (
              <Card key={weekday} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {classesT(`weekdays.${weekday}`)}
                  </CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {daySlots.length === 0
                      ? t("noClasses")
                      : t("classCount", { count: daySlots.length })}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  {daySlots.map((slot) => (
                    <Link
                      key={`${slot.courseId}-${slot.startTime}`}
                      href={`/classes/${slot.courseId}`}
                      className={`hover:bg-accent/40 rounded-md border p-2 transition-colors ${
                        slot.isActive ? "" : "opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium">
                          {formatTime(slot.startTime, format)}–
                          {formatTime(slot.endTime, format)}
                        </span>
                        {slot.isActive ? null : (
                          <Badge variant="outline" className="text-[10px]">
                            {t("inactive")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {slot.courseName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {slot.locationName}
                        {slot.trainerName ? ` · ${slot.trainerName}` : ""}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
