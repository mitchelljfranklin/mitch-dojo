import { prisma } from "@/lib/prisma";
import {
  type IncidentSeverity,
  type IncidentStatus,
} from "../../prisma/generated/prisma/client";

// Accident book data access. Incidents are optionally tied to a student and a
// location (a visitor or a facility issue has neither); injury detail is
// PHI-adjacent and the whole feature is gated by incidents:view/manage.

export type IncidentData = {
  title: string;
  occurredAt: Date;
  studentId: string | null;
  locationId: string | null;
  severity: IncidentSeverity;
  description: string;
  injuryDescription: string | null;
  treatmentGiven: string | null;
  medicalAttentionRequired: boolean;
  actionsTaken: string | null;
};

export type IncidentListRow = {
  id: string;
  title: string;
  occurredAt: Date;
  severity: IncidentSeverity;
  status: IncidentStatus;
  studentId: string | null;
  studentName: string | null;
  locationName: string | null;
};

export type IncidentDetail = {
  id: string;
  title: string;
  occurredAt: Date;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  injuryDescription: string | null;
  treatmentGiven: string | null;
  medicalAttentionRequired: boolean;
  actionsTaken: string | null;
  closedAt: Date | null;
  createdAt: Date;
  studentId: string | null;
  studentName: string | null;
  locationId: string | null;
  locationName: string | null;
  reportedByName: string | null;
};

export async function listIncidents(filter?: {
  status?: IncidentStatus;
}): Promise<IncidentListRow[]> {
  const rows = await prisma.incident.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: {
      student: { select: { firstName: true, lastName: true } },
      location: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurredAt,
    severity: row.severity,
    status: row.status,
    studentId: row.studentId,
    studentName: row.student
      ? `${row.student.firstName} ${row.student.lastName}`
      : null,
    locationName: row.location?.name ?? null,
  }));
}

export async function getIncidentDetail(
  incidentId: string,
): Promise<IncidentDetail | null> {
  const row = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      student: { select: { firstName: true, lastName: true } },
      location: { select: { name: true } },
      reportedBy: { select: { name: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    occurredAt: row.occurredAt,
    severity: row.severity,
    status: row.status,
    description: row.description,
    injuryDescription: row.injuryDescription,
    treatmentGiven: row.treatmentGiven,
    medicalAttentionRequired: row.medicalAttentionRequired,
    actionsTaken: row.actionsTaken,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    studentId: row.studentId,
    studentName: row.student
      ? `${row.student.firstName} ${row.student.lastName}`
      : null,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    reportedByName: row.reportedBy?.name ?? null,
  };
}

export async function createIncident(
  input: IncidentData & { reportedById: string | null },
): Promise<{ id: string }> {
  const incident = await prisma.incident.create({
    data: {
      title: input.title,
      occurredAt: input.occurredAt,
      studentId: input.studentId,
      locationId: input.locationId,
      severity: input.severity,
      description: input.description,
      injuryDescription: input.injuryDescription,
      treatmentGiven: input.treatmentGiven,
      medicalAttentionRequired: input.medicalAttentionRequired,
      actionsTaken: input.actionsTaken,
      reportedById: input.reportedById,
    },
    select: { id: true },
  });
  return { id: incident.id };
}

export async function updateIncident(
  incidentId: string,
  input: IncidentData,
): Promise<void> {
  await prisma.incident.update({
    where: { id: incidentId },
    data: {
      title: input.title,
      occurredAt: input.occurredAt,
      studentId: input.studentId,
      locationId: input.locationId,
      severity: input.severity,
      description: input.description,
      injuryDescription: input.injuryDescription,
      treatmentGiven: input.treatmentGiven,
      medicalAttentionRequired: input.medicalAttentionRequired,
      actionsTaken: input.actionsTaken,
    },
  });
}

export async function setIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
): Promise<void> {
  await prisma.incident.update({
    where: { id: incidentId },
    data: { status, closedAt: status === "CLOSED" ? new Date() : null },
  });
}

export async function deleteIncident(incidentId: string): Promise<void> {
  await prisma.incident.delete({ where: { id: incidentId } });
}

// Recent incidents for a student, shown on the student record.
export async function listStudentIncidents(
  studentId: string,
): Promise<IncidentListRow[]> {
  const rows = await prisma.incident.findMany({
    where: { studentId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: { location: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    occurredAt: row.occurredAt,
    severity: row.severity,
    status: row.status,
    studentId: row.studentId,
    studentName: null,
    locationName: row.location?.name ?? null,
  }));
}

// Count of open incidents, for the sidebar badge.
export async function countOpenIncidents(): Promise<number> {
  return prisma.incident.count({ where: { status: "OPEN" } });
}

// Student and location choices for the incident form.
export async function listIncidentFormOptions(): Promise<{
  students: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}> {
  const [students, locations] = await Promise.all([
    prisma.student.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    students: students.map((student) => ({
      id: student.id,
      name: `${student.lastName}, ${student.firstName}`,
    })),
    locations,
  };
}
