import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listCourses, COURSE_SORTS, type CourseSort } from "@/lib/db/courses";
import { listAssignableLocations } from "@/lib/db/locations";
import { listTrainers } from "@/lib/db/trainers";

export const dynamic = "force-dynamic";

export const metadata = { title: "Classes" };

type ClassesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const user = await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const canEdit = hasPermission(user.permissions, PERMISSIONS.CLASSES_EDIT);
  const canImportAttendance = hasPermission(
    user.permissions,
    PERMISSIONS.ATTENDANCE_MARK,
  );

  const sp = await searchParams;
  const sort = (sp.sort as CourseSort) || "name";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { courses, totalCount, pageSize } = await listCourses({
    query: sp.query,
    locationId: sp.locationId || undefined,
    trainerId: sp.trainerId || undefined,
    sort,
    page,
  });
  const [locations, trainers] = await Promise.all([
    listAssignableLocations(),
    listTrainers(),
  ]);
  const hasFilters =
    Boolean(sp.query) || Boolean(sp.locationId) || Boolean(sp.trainerId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="text-muted-foreground text-sm">
            Courses run across your dojo locations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/classes/schedule">Weekly schedule</Link>
          </Button>
          {canImportAttendance ? (
            <Button asChild variant="outline">
              <Link href="/attendance/import">Import attendance</Link>
            </Button>
          ) : null}
          {canEdit ? (
            <Button asChild>
              <Link href="/classes/new">New course</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <form className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="query">
              Search
            </label>
            <Input
              id="query"
              name="query"
              placeholder="Course name…"
              defaultValue={sp.query ?? ""}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="locationId"
            >
              Location
            </label>
            <AutoSubmitSelect
              name="locationId"
              defaultValue={sp.locationId ?? ""}
              key={`location-${sp.locationId ?? ""}`}
              emptyOptionLabel="All locations"
              id="locationId"
              className="w-44"
              ariaLabel="Filter courses by location"
              options={locations.map((location) => ({
                value: location.id,
                label: location.name,
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="trainerId"
            >
              Trainer
            </label>
            <AutoSubmitSelect
              name="trainerId"
              defaultValue={sp.trainerId ?? ""}
              key={`trainer-${sp.trainerId ?? ""}`}
              emptyOptionLabel="Any trainer"
              id="trainerId"
              className="w-44"
              ariaLabel="Filter courses by trainer"
              options={trainers.map((trainer) => ({
                value: trainer.id,
                label: trainer.name,
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="sort">
              Sort
            </label>
            <AutoSubmitSelect
              name="sort"
              defaultValue={sort}
              id="sort"
              className="w-44"
              ariaLabel="Sort courses"
              options={Object.entries(COURSE_SORTS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="mb-px">
            Filter
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm" className="mb-px">
              <Link href="/classes">Clear</Link>
            </Button>
          ) : null}
        </form>
      </div>

      {courses.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            No courses match the selected filters.
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No courses yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {canEdit
                  ? "Create your first course to build the weekly timetable."
                  : "No courses have been set up yet."}
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/classes/${course.id}`}>
              <Card className="hover:bg-accent/40 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{course.name}</CardTitle>
                    {course.isActive ? null : (
                      <Badge variant="outline" className="shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {course.locationName}
                    {course.trainerName ? ` · ${course.trainerName}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="text-muted-foreground text-xs">
                  {course.description ? (
                    <p className="line-clamp-2">{course.description}</p>
                  ) : null}
                  <span className="mt-2 block">
                    {course.weeklySlotCount} weekly slot
                    {course.weeklySlotCount === 1 ? "" : "s"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        itemLabel="courses"
      />
    </div>
  );
}
