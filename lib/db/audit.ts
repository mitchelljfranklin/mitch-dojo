import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type AuditLogFilters,
  type AuditLogResult,
  type AuditLogEntry,
} from "./audit-types";

export {
  type AuditLogFilters,
  type AuditLogResult,
  type AuditLogEntry,
  AUDIT_ACTION_LABELS,
} from "./audit-types";

export function logAudit(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
) {
  return prisma.auditLog.create({
    data: { userId, action, entityType, entityId, meta },
  });
}

// Anonymous/system events (public booking form) — no user to attribute.
export function logSystemAudit(
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
) {
  return prisma.auditLog.create({
    data: { userId: null, action, entityType, entityId, meta },
  });
}

export function logAuditSafe(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Prisma.InputJsonValue,
): void {
  logAudit(userId, action, entityType, entityId, meta).catch(
    (error: unknown) => {
      console.error(
        `Audit log failed (${action}):`,
        error instanceof Error ? error.message : String(error),
      );
    },
  );
}

const DEFAULT_AUDIT_PAGE_SIZE = 10;

export async function listAuditLogs(
  filters?: AuditLogFilters,
): Promise<AuditLogResult> {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters?.action) {
    where.action = filters.action;
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.fromDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) ?? {}),
      gte: new Date(filters.fromDate),
    };
  }

  if (filters?.toDate) {
    const toDate = new Date(filters.toDate);
    toDate.setHours(23, 59, 59, 999);
    if (!where.createdAt) {
      where.createdAt = { lte: toDate };
    } else {
      (where.createdAt as Prisma.DateTimeFilter).lte = toDate;
    }
  }

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE;

  const [rows, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const entityNames = await resolveEntityNames(rows);

  const entries: AuditLogEntry[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName:
      entityNames.get(row.entityType ?? "")?.get(row.entityId ?? "") ?? null,
    meta: (row.meta as Prisma.JsonValue) ?? null,
    createdAt: row.createdAt,
    user: row.user ?? { id: "", name: "Deleted user" },
  }));

  return { entries, totalCount, page, pageSize };
}

// Settings saves log the tab key ("general", "operations", …) as the
// entityId — humanise it into a readable name for the audit table.
function humaniseSettingKey(key: string): string {
  const labels: Record<string, string> = {
    general: "General",
    appearance: "Appearance",
    operations: "Operations",
    files: "Files",
    storage: "Storage",
    audit: "Audit log",
    users: "Users",
    roles: "Roles",
  };
  return (
    labels[key] ??
    key.charAt(0).toUpperCase() + key.slice(1).replace(/[-_]/g, " ")
  );
}

async function resolveEntityNames(
  rows: { entityType: string | null; entityId: string | null }[],
): Promise<Map<string, Map<string, string>>> {
  const byType = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.entityType || !row.entityId) continue;
    const list = byType.get(row.entityType) ?? [];
    list.push(row.entityId);
    byType.set(row.entityType, list);
  }

  const result = new Map<string, Map<string, string>>();

  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const uniqueIds = [...new Set(ids)];
      const map = new Map<string, string>();

      try {
        if (type === "User") {
          const users = await prisma.user.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const user of users) {
            map.set(user.id, user.name ?? "Deleted user");
          }
        } else if (type === "Role") {
          const roles = await prisma.role.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const role of roles) map.set(role.id, role.name);
        } else if (type === "Student") {
          const students = await prisma.student.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, firstName: true, lastName: true },
          });
          for (const student of students) {
            map.set(student.id, `${student.firstName} ${student.lastName}`);
          }
        } else if (type === "Location") {
          const locations = await prisma.location.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const location of locations) map.set(location.id, location.name);
        } else if (type === "Trainer") {
          const trainers = await prisma.trainer.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const trainer of trainers) map.set(trainer.id, trainer.name);
        } else if (type === "Course") {
          const courses = await prisma.course.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, name: true },
          });
          for (const course of courses) map.set(course.id, course.name);
        } else if (type === "ClassSession") {
          const sessions = await prisma.classSession.findMany({
            where: { id: { in: uniqueIds } },
            select: {
              id: true,
              date: true,
              course: { select: { name: true } },
            },
          });
          for (const session of sessions) {
            map.set(
              session.id,
              `${session.course.name} ${session.date.toISOString().slice(0, 10)}`,
            );
          }
        } else if (type === "BeltRangeEntry") {
          const entries = await prisma.beltRangeEntry.findMany({
            where: { id: { in: uniqueIds } },
            select: {
              id: true,
              name: true,
              discipline: { select: { name: true } },
            },
          });
          for (const entry of entries) {
            map.set(entry.id, `${entry.name} (${entry.discipline.name})`);
          }
        } else if (type === "StudentBelt") {
          const records = await prisma.studentBelt.findMany({
            where: { id: { in: uniqueIds } },
            select: {
              id: true,
              beltName: true,
              student: { select: { firstName: true, lastName: true } },
            },
          });
          for (const record of records) {
            map.set(
              record.id,
              `${record.student.firstName} ${record.student.lastName} — ${record.beltName}`,
            );
          }
        } else if (type === "Setting") {
          // Settings saves log the tab key as entityId (e.g. "general",
          // "operations") — the key itself is the readable name.
          for (const id of uniqueIds) {
            map.set(id, humaniseSettingKey(id));
          }
        }
      } catch (error: unknown) {
        console.error(
          "[audit] resolveEntityNames failed:",
          error instanceof Error ? error.message : String(error),
        );
        // entity type may have been deleted — just return no names
      }

      result.set(type, map);
    }),
  );

  return result;
}

export const AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  CREATE_USER: "CREATE_USER",
  DISABLE_USER: "DISABLE_USER",
  ENABLE_USER: "ENABLE_USER",
  CHANGE_ROLE: "CHANGE_ROLE",
  RESET_PASSWORD: "RESET_PASSWORD",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  CREATE_ROLE: "CREATE_ROLE",
  UPDATE_ROLE: "UPDATE_ROLE",
  DELETE_ROLE: "DELETE_ROLE",
  DUPLICATE_ROLE: "DUPLICATE_ROLE",
  DELETE_USER: "DELETE_USER",
  UPDATE_PROFILE: "UPDATE_PROFILE",
  CREATE_STUDENT: "CREATE_STUDENT",
  UPDATE_STUDENT: "UPDATE_STUDENT",
  DELETE_STUDENT: "DELETE_STUDENT",
  UPDATE_STUDENT_STATUS: "UPDATE_STUDENT_STATUS",
  IMPORT_STUDENT: "IMPORT_STUDENT",
  CREATE_LOCATION: "CREATE_LOCATION",
  UPDATE_LOCATION: "UPDATE_LOCATION",
  DELETE_LOCATION: "DELETE_LOCATION",
  CREATE_TRAINER: "CREATE_TRAINER",
  UPDATE_TRAINER: "UPDATE_TRAINER",
  DELETE_TRAINER: "DELETE_TRAINER",
  CREATE_COURSE: "CREATE_COURSE",
  UPDATE_COURSE: "UPDATE_COURSE",
  DELETE_COURSE: "DELETE_COURSE",
  UPDATE_ATTENDANCE: "UPDATE_ATTENDANCE",
  IMPORT_ATTENDANCE: "IMPORT_ATTENDANCE",
  IMPORT_BELT_HISTORY: "IMPORT_BELT_HISTORY",
  CREATE_BELT_LEVEL: "CREATE_BELT_LEVEL",
  UPDATE_BELT_LEVEL: "UPDATE_BELT_LEVEL",
  DELETE_BELT_LEVEL: "DELETE_BELT_LEVEL",
  RECORD_PROMOTION: "RECORD_PROMOTION",
  DELETE_PROMOTION: "DELETE_PROMOTION",
  CREATE_MEMBERSHIP_PLAN: "CREATE_MEMBERSHIP_PLAN",
  UPDATE_MEMBERSHIP_PLAN: "UPDATE_MEMBERSHIP_PLAN",
  DELETE_MEMBERSHIP_PLAN: "DELETE_MEMBERSHIP_PLAN",
  CREATE_ENROLLMENT: "CREATE_ENROLLMENT",
  END_ENROLLMENT: "END_ENROLLMENT",
  CREATE_INVOICE: "CREATE_INVOICE",
  VOID_INVOICE: "VOID_INVOICE",
  RECORD_PAYMENT: "RECORD_PAYMENT",
  DELETE_PAYMENT: "DELETE_PAYMENT",
  GENERATE_INVOICES: "GENERATE_INVOICES",
  WEBSITE_BOOKING: "WEBSITE_BOOKING",
  UPDATE_TRIAL_STAGE: "UPDATE_TRIAL_STAGE",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export function listAuditActions(): string[] {
  return Object.values(AUDIT_ACTIONS);
}
