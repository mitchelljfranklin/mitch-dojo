import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Pagination } from "@/components/pagination";
import { StudentsTable } from "./students-table";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { listStudents, type StudentSort } from "@/lib/db/students";
import { listDisciplines } from "@/lib/db/belts";
import { listAssignableLocations } from "@/lib/db/locations";
import { listActivePlansForSelection } from "@/lib/db/memberships";
import { STUDENT_STATUSES } from "@/lib/schemas/student";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Students");
  return { title: translate("metaTitle") };
}

const SORT_LABEL_KEYS: Record<StudentSort, string> = {
  name: "name",
  "name-desc": "nameDesc",
  newest: "newest",
  oldest: "oldest",
};

type StudentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
  const user = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
  const translate = await getTranslations("Students");
  const canCreateStudent = hasPermission(
    user.permissions,
    PERMISSIONS.STUDENTS_CREATE,
  );

  const query = await searchParams;
  const sort = (query.sort as StudentSort) || "name";
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const { students, totalCount, pageSize } = await listStudents({
    query: query.query,
    status: query.status || undefined,
    locationId: query.locationId || undefined,
    sort,
    page,
  });
  const locations = await listAssignableLocations();
  const canEdit = hasPermission(user.permissions, PERMISSIONS.STUDENTS_EDIT);
  const canBill = hasPermission(user.permissions, PERMISSIONS.MEMBERSHIPS_EDIT);
  const [disciplines, plans] = await Promise.all([
    canEdit ? listDisciplines() : Promise.resolve([]),
    canBill ? listActivePlansForSelection() : Promise.resolve([]),
  ]);
  const hasFilters =
    Boolean(query.query) || Boolean(query.status) || Boolean(query.locationId);

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
            <Link href="/students/households">
              {translate("actions.households")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/students/export">{translate("actions.export")}</a>
          </Button>
          {canCreateStudent ? (
            <Button asChild variant="outline">
              <Link href="/students/import">{translate("actions.import")}</Link>
            </Button>
          ) : null}
          {canCreateStudent ? (
            <Button asChild>
              <Link href="/students/new">{translate("actions.new")}</Link>
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
            <label className="text-muted-foreground text-xs" htmlFor="status">
              {translate("filters.status")}
            </label>
            <AutoSubmitSelect
              name="status"
              defaultValue={query.status ?? ""}
              key={`status-${query.status ?? ""}`}
              emptyOptionLabel={translate("filters.anyStatus")}
              id="status"
              className="w-36"
              ariaLabel={translate("filters.statusAria")}
              options={STUDENT_STATUSES.map((status) => ({
                value: status,
                label: translate(`status.${status}`),
              }))}
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
            <label className="text-muted-foreground text-xs" htmlFor="sort">
              {translate("filters.sort")}
            </label>
            <AutoSubmitSelect
              name="sort"
              defaultValue={sort}
              id="sort"
              className="w-44"
              ariaLabel={translate("filters.sortAria")}
              options={(Object.keys(SORT_LABEL_KEYS) as StudentSort[]).map(
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
              <Link href="/students">{translate("filters.clear")}</Link>
            </Button>
          ) : null}
        </form>
      </div>

      {students.length === 0 ? (
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
                {canCreateStudent
                  ? translate("empty.create")
                  : translate("empty.readOnly")}
              </p>
              {canCreateStudent ? (
                <div className="mt-2 flex gap-3">
                  <Link
                    href="/students/new"
                    className="text-primary text-sm hover:underline"
                  >
                    {translate("empty.add")}
                  </Link>
                  <Link
                    href="/students/import"
                    className="text-muted-foreground text-sm hover:underline"
                  >
                    {translate("empty.import")}
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <StudentsTable
            students={students.map((student) => ({
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              status: student.status,
              primaryLocationName: student.primaryLocationName,
              locationCount: student.locationCount,
              joinedAt: student.joinedAt,
              photoKey: student.photoKey,
            }))}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            canEdit={canEdit}
            canBill={canBill}
            disciplines={disciplines.map((discipline) => ({
              id: discipline.id,
              name: discipline.name,
            }))}
            plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
          />
          <Pagination page={page} pageSize={pageSize} totalCount={totalCount} />
        </>
      )}
    </div>
  );
}
