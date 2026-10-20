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
  const t = await getTranslations("Students");
  return { title: t("metaTitle") };
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
  const t = await getTranslations("Students");
  const canCreateStudent = hasPermission(
    user.permissions,
    PERMISSIONS.STUDENTS_CREATE,
  );

  const sp = await searchParams;
  const sort = (sp.sort as StudentSort) || "name";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { students, totalCount, pageSize } = await listStudents({
    query: sp.query,
    status: sp.status || undefined,
    locationId: sp.locationId || undefined,
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
    Boolean(sp.query) || Boolean(sp.status) || Boolean(sp.locationId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/students/households">{t("actions.households")}</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/students/export">{t("actions.export")}</a>
          </Button>
          {canCreateStudent ? (
            <Button asChild variant="outline">
              <Link href="/students/import">{t("actions.import")}</Link>
            </Button>
          ) : null}
          {canCreateStudent ? (
            <Button asChild>
              <Link href="/students/new">{t("actions.new")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <form className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="query">
              {t("filters.search")}
            </label>
            <Input
              id="query"
              name="query"
              placeholder={t("filters.searchPlaceholder")}
              defaultValue={sp.query ?? ""}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="status">
              {t("filters.status")}
            </label>
            <AutoSubmitSelect
              name="status"
              defaultValue={sp.status ?? ""}
              key={`status-${sp.status ?? ""}`}
              emptyOptionLabel={t("filters.anyStatus")}
              id="status"
              className="w-36"
              ariaLabel={t("filters.statusAria")}
              options={STUDENT_STATUSES.map((status) => ({
                value: status,
                label: t(`status.${status}`),
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-muted-foreground text-xs"
              htmlFor="locationId"
            >
              {t("filters.location")}
            </label>
            <AutoSubmitSelect
              name="locationId"
              defaultValue={sp.locationId ?? ""}
              key={`location-${sp.locationId ?? ""}`}
              emptyOptionLabel={t("filters.allLocations")}
              id="locationId"
              className="w-44"
              ariaLabel={t("filters.locationAria")}
              options={locations.map((location) => ({
                value: location.id,
                label: location.name,
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="sort">
              {t("filters.sort")}
            </label>
            <AutoSubmitSelect
              name="sort"
              defaultValue={sort}
              id="sort"
              className="w-44"
              ariaLabel={t("filters.sortAria")}
              options={(Object.keys(SORT_LABEL_KEYS) as StudentSort[]).map(
                (value) => ({
                  value,
                  label: t(`sort.${SORT_LABEL_KEYS[value]}`),
                }),
              )}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="mb-px">
            {t("filters.filter")}
          </Button>
          {hasFilters ? (
            <Button asChild variant="ghost" size="sm" className="mb-px">
              <Link href="/students">{t("filters.clear")}</Link>
            </Button>
          ) : null}
        </form>
      </div>

      {students.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">{t("empty.filtered")}</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("empty.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {canCreateStudent ? t("empty.create") : t("empty.readOnly")}
              </p>
              {canCreateStudent ? (
                <div className="mt-2 flex gap-3">
                  <Link
                    href="/students/new"
                    className="text-primary text-sm hover:underline"
                  >
                    {t("empty.add")}
                  </Link>
                  <Link
                    href="/students/import"
                    className="text-muted-foreground text-sm hover:underline"
                  >
                    {t("empty.import")}
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
