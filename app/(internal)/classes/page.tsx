import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listCourses, type CourseSort } from "@/lib/db/courses";
import { listAssignableLocations } from "@/lib/db/locations";
import { listTrainers } from "@/lib/db/trainers";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Classes");
  return { title: translate("metaTitle") };
}

const SORT_LABEL_KEYS: Record<CourseSort, string> = {
  name: "name",
  location: "location",
  newest: "newest",
};

type ClassesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const user = await requirePermission(PERMISSIONS.CLASSES_VIEW);
  const translate = await getTranslations("Classes");
  const canEdit = hasPermission(user.permissions, PERMISSIONS.CLASSES_EDIT);
  const canImportAttendance = hasPermission(
    user.permissions,
    PERMISSIONS.ATTENDANCE_MARK,
  );

  const query = await searchParams;
  const sort = (query.sort as CourseSort) || "name";
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const { courses, totalCount, pageSize } = await listCourses({
    query: query.query,
    locationId: query.locationId || undefined,
    trainerId: query.trainerId || undefined,
    sort,
    page,
  });
  const [locations, trainers] = await Promise.all([
    listAssignableLocations(),
    listTrainers(),
  ]);
  const hasFilters =
    Boolean(query.query) ||
    Boolean(query.locationId) ||
    Boolean(query.trainerId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {translate("title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {translate("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/classes/schedule">
              {translate("actions.schedule")}
            </Link>
          </Button>
          {canImportAttendance ? (
            <Button asChild variant="outline">
              <Link href="/attendance/import">
                {translate("actions.importAttendance")}
              </Link>
            </Button>
          ) : null}
          {canEdit ? (
            <Button asChild>
              <Link href="/classes/new">{translate("actions.new")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <form className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="query">
              {translate("filters.search")}
            </label>
            <Input
              id="query"
              name="query"
              placeholder={translate("filters.searchPlaceholder")}
              defaultValue={query.query ?? ""}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="locationId"
            >
              {translate("filters.location")}
            </label>
            <AutoSubmitSelect
              name="locationId"
              defaultValue={query.locationId ?? ""}
              key={`location-${query.locationId ?? ""}`}
              emptyOptionLabel={translate("filters.allLocations")}
              id="locationId"
              className="w-44"
              ariaLabel={translate("filters.locationAria")}
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
              {translate("filters.trainer")}
            </label>
            <AutoSubmitSelect
              name="trainerId"
              defaultValue={query.trainerId ?? ""}
              key={`trainer-${query.trainerId ?? ""}`}
              emptyOptionLabel={translate("filters.anyTrainer")}
              id="trainerId"
              className="w-44"
              ariaLabel={translate("filters.trainerAria")}
              options={trainers.map((trainer) => ({
                value: trainer.id,
                label: trainer.name,
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="sort">
              {translate("filters.sort")}
            </label>
            <AutoSubmitSelect
              name="sort"
              defaultValue={sort}
              id="sort"
              className="w-44"
              ariaLabel={translate("filters.sortAria")}
              options={(Object.keys(SORT_LABEL_KEYS) as CourseSort[]).map(
                (value) => ({
                  value,
                  label: translate(`sort.${SORT_LABEL_KEYS[value]}`),
                }),
              )}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="mb-px">
            {translate("filters.filter")}
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm" className="mb-px">
              <Link href="/classes">{translate("filters.clear")}</Link>
            </Button>
          ) : null}
        </form>
      </div>

      {courses.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            {translate("empty.filtered")}
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{translate("empty.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {canEdit
                  ? translate("empty.create")
                  : translate("empty.readOnly")}
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
                        {translate("card.inactive")}
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
                    {translate("card.weeklySlots", {
                      count: course.weeklySlotCount,
                    })}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} />
    </div>
  );
}
