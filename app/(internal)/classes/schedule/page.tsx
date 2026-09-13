import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getWeeklySchedule } from "@/lib/db/sessions";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/schemas/course";

export const dynamic = "force-dynamic";

export const metadata = { title: "Weekly schedule" };

type ScheduleSlot = {
  startTime: string;
  endTime: string;
  courseId: string;
  courseName: string;
  locationName: string;
  trainerName: string | null;
  isActive: boolean;
};

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")}${suffix}`;
}

export default async function SchedulePage() {
  await requirePermission(PERMISSIONS.CLASSES_VIEW);
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
          { label: "Classes", href: "/classes" },
          { label: "Schedule" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly schedule
          </h1>
          <p className="text-muted-foreground text-sm">
            Recurring training times across all courses and locations.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/classes">View courses</Link>
        </Button>
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>The timetable is empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add courses with weekly training times and they will appear here.
            </p>
            <Link
              href="/classes/new"
              className="text-primary mt-2 inline-block text-sm hover:underline"
            >
              Create a course →
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
                    {WEEKDAY_LABELS[weekday]}
                  </CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {daySlots.length === 0
                      ? "No classes"
                      : `${daySlots.length} class${daySlots.length === 1 ? "" : "es"}`}
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
                          {formatTime(slot.startTime)}–
                          {formatTime(slot.endTime)}
                        </span>
                        {slot.isActive ? null : (
                          <Badge variant="outline" className="text-[10px]">
                            Inactive
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
