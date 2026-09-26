import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { StudentsTable } from "./students-table";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import {
  listStudents,
  STUDENT_SORTS,
  type StudentSort,
} from "@/lib/db/students";
import { listDisciplines } from "@/lib/db/belts";
import { listAssignableLocations } from "@/lib/db/locations";
import { listActivePlansForSelection } from "@/lib/db/memberships";
import { STUDENT_STATUS_LABELS, STUDENT_STATUSES } from "@/lib/schemas/student";

export const dynamic = "force-dynamic";

export const metadata = { title: "Students" };

type StudentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
  const user = await requirePermission(PERMISSIONS.STUDENTS_VIEW);
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
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground text-sm">
            Everyone who trains at your dojo locations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <a href="/api/students/export">Export CSV</a>
          </Button>
          {canCreateStudent ? (
            <Button asChild variant="outline">
              <Link href="/students/import">Import</Link>
            </Button>
          ) : null}
          {canCreateStudent ? (
            <Button asChild>
              <Link href="/students/new">New student</Link>
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
              placeholder="Name or email…"
              defaultValue={sp.query ?? ""}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs" htmlFor="status">
              Status
            </label>
            <AutoSubmitSelect
              name="status"
              defaultValue={sp.status ?? ""}
              key={`status-${sp.status ?? ""}`}
              emptyOptionLabel="Any status"
              id="status"
              className="w-36"
              ariaLabel="Filter students by status"
              options={STUDENT_STATUSES.map((status) => ({
                value: status,
                label: STUDENT_STATUS_LABELS[status],
              }))}
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
              ariaLabel="Filter students by location"
              options={locations.map((location) => ({
                value: location.id,
                label: location.name,
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
              ariaLabel="Sort students"
              options={Object.entries(STUDENT_SORTS).map(([value, label]) => ({
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
              <Link href="/students">Clear</Link>
            </Button>
          ) : null}
        </form>
      </div>

      {students.length === 0 ? (
        hasFilters ? (
          <p className="text-muted-foreground text-sm">
            No students match the selected filters.
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No students yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {canCreateStudent
                  ? "Add your first student, or import a CSV from your existing records."
                  : "No students are enrolled yet."}
              </p>
              {canCreateStudent ? (
                <div className="mt-2 flex gap-3">
                  <Link
                    href="/students/new"
                    className="text-primary text-sm hover:underline"
                  >
                    Add a student →
                  </Link>
                  <Link
                    href="/students/import"
                    className="text-muted-foreground text-sm hover:underline"
                  >
                    Import a CSV →
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
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            itemLabel="students"
          />
        </>
      )}
    </div>
  );
}
