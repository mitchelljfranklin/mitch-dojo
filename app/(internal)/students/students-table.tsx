"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUSES,
  type StudentStatus,
} from "@/lib/schemas/student";
import {
  bulkAssignDisciplinesAction,
  bulkEnrollAction,
  bulkSetStatusAction,
  type BulkActionState,
} from "@/lib/actions/students";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { formatDate } from "@/lib/utils";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  status: StudentStatus;
  primaryLocationName: string | null;
  locationCount: number;
  joinedAt: Date | string;
  photoKey: string | null;
};

type BulkOption = { id: string; name: string };

const STATUS_VARIANTS: Record<
  StudentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  INACTIVE: "outline",
  ALUMNI: "outline",
};

type StudentsTableProps = {
  students: StudentRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  canEdit: boolean;
  canBill: boolean;
  disciplines: BulkOption[];
  plans: BulkOption[];
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function StudentsTable({
  students,
  page,
  pageSize,
  totalCount,
  canEdit,
  canBill,
  disciplines,
  plans,
}: StudentsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusState, statusAction, statusPending] = useActionState<
    BulkActionState,
    FormData
  >(bulkSetStatusAction, undefined);
  const [disciplinesState, disciplinesAction, disciplinesPending] =
    useActionState<BulkActionState, FormData>(
      bulkAssignDisciplinesAction,
      undefined,
    );
  const [enrollState, enrollAction, enrollPending] = useActionState<
    BulkActionState,
    FormData
  >(bulkEnrollAction, undefined);
  useActionFeedback(statusState ?? disciplinesState ?? enrollState);

  // Clear the selection once any bulk action succeeds — render-phase state
  // adjustment (React's blessed "adjust state during render" pattern; the
  // extra re-render is immediate and the state never escapes this branch).
  const [lastClearedFor, setLastClearedFor] =
    useState<BulkActionState>(undefined);
  const latestOk = [statusState, disciplinesState, enrollState].find(
    (state) => state?.ok,
  );
  if (latestOk && latestOk !== lastClearedFor) {
    setLastClearedFor(latestOk);
    setSelectedIds(new Set());
  }

  function handleSortChange(value: string) {
    const params = new URLSearchParams();
    params.set("sort", value);
    router.push(`/students?${params.toString()}`);
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const selectedCount = selectedIds.size;
  const allPageSelected =
    students.length > 0 && students.every((s) => selectedIds.has(s.id));

  function toggleAll() {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((student) => student.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="relative">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit ? (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all students on this page"
                    checked={allPageSelected}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              ) : null}
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Home dojo</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                {canEdit ? (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${student.firstName} ${student.lastName}`}
                      checked={selectedIds.has(student.id)}
                      onCheckedChange={() => toggleOne(student.id)}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    {student.photoKey ? (
                      <img
                        src={`/api/students/${student.id}/photo?v=${student.photoKey}`}
                        alt=""
                        className="size-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="bg-muted text-muted-foreground size-8 shrink-0 rounded-full text-center text-xs leading-8">
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </span>
                      {student.email ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {student.email}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[student.status]}>
                    {STUDENT_STATUS_LABELS[student.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {student.primaryLocationName ?? "—"}
                  {student.locationCount > 1 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      +{student.locationCount - 1} more
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(student.joinedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-muted-foreground border-t px-4 py-2 text-xs">
          Showing {start}–{end} of {totalCount} students
        </p>
      </div>

      {canEdit && selectedCount > 0 ? (
        <div className="bg-background fixed inset-x-0 bottom-0 z-40 border-t shadow-lg">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <span className="text-sm font-medium">
              {selectedCount} selected
            </span>
            <form action={statusAction} className="flex items-center gap-2">
              {Array.from(selectedIds).map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <select
                name="status"
                required
                defaultValue=""
                className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                aria-label="Status to apply"
              >
                <option value="" disabled>
                  Set status…
                </option>
                {STUDENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STUDENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={statusPending}
              >
                {statusPending ? "Applying…" : "Apply"}
              </Button>
            </form>
            {disciplines.length > 0 ? (
              <form
                action={disciplinesAction}
                className="flex items-center gap-2"
              >
                {Array.from(selectedIds).map((id) => (
                  <input key={id} type="hidden" name="ids" value={id} />
                ))}
                <select
                  name="disciplineIds"
                  required
                  defaultValue=""
                  className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                  aria-label="Discipline to assign"
                >
                  <option value="" disabled>
                    Assign discipline…
                  </option>
                  {disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={disciplinesPending}
                >
                  {disciplinesPending ? "Assigning…" : "Assign"}
                </Button>
              </form>
            ) : null}
            {canBill && plans.length > 0 ? (
              <form action={enrollAction} className="flex items-center gap-2">
                {Array.from(selectedIds).map((id) => (
                  <input key={id} type="hidden" name="ids" value={id} />
                ))}
                <select
                  name="planId"
                  required
                  defaultValue=""
                  className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                  aria-label="Plan to enroll"
                >
                  <option value="" disabled>
                    Enroll in plan…
                  </option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={enrollPending}
                >
                  {enrollPending ? "Enrolling…" : "Enroll"}
                </Button>
              </form>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
