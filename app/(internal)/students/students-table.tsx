"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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
  type StudentStatus,
} from "@/lib/schemas/student";
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
};

export function StudentsTable({
  students,
  page,
  pageSize,
  totalCount,
}: StudentsTableProps) {
  const router = useRouter();

  function handleSortChange(value: string) {
    const params = new URLSearchParams();
    params.set("sort", value);
    router.push(`/students?${params.toString()}`);
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Home dojo</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
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
  );
}
