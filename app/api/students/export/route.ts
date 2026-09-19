import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { exportAllStudents } from "@/lib/db/students";
import { countryName } from "@/lib/countries";
import {
  STUDENT_STATUS_LABELS,
  type StudentStatus,
} from "@/lib/schemas/student";
import { csvEscape } from "@/lib/utils";

const COLUMNS = [
  "Id",
  "FirstName",
  "LastName",
  "Email",
  "Phone",
  "DateOfBirth",
  "Status",
  "AddressLine",
  "City",
  "State",
  "Postcode",
  "Country",
  "GuardianName",
  "GuardianEmail",
  "GuardianPhone",
  "GuardianRelationship",
  "EmergencyContactName",
  "EmergencyContactPhone",
  "Locations",
  "PrimaryLocation",
  "Notes",
];

function isoDateOrNull(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export async function GET() {
  await requirePermission(PERMISSIONS.STUDENTS_VIEW);

  const students = await exportAllStudents();
  const lines = [COLUMNS.join(",")];

  for (const student of students) {
    const primary =
      student.locations.find((location) => location.isPrimary)?.name ?? "";
    const allLocations = student.locations.map((location) => location.name);
    lines.push(
      [
        student.id,
        student.firstName,
        student.lastName,
        student.email ?? "",
        student.phone ?? "",
        isoDateOrNull(student.dateOfBirth),
        STUDENT_STATUS_LABELS[student.status as StudentStatus] ??
          student.status,
        student.addressLine ?? "",
        student.city ?? "",
        student.state ?? "",
        student.postcode ?? "",
        student.country ? countryName(student.country) : "",
        student.guardianName ?? "",
        student.guardianEmail ?? "",
        student.guardianPhone ?? "",
        student.guardianRelationship ?? "",
        student.emergencyContactName ?? "",
        student.emergencyContactPhone ?? "",
        allLocations.join("; "),
        primary && allLocations.length > 1 ? primary : "",
        student.notes ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${date}.csv"`,
    },
  });
}
