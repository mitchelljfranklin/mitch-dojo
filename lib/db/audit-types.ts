import type { Prisma } from "../../prisma/generated/prisma/client";

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export type AuditLogResult = {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
  user: { id: string; name: string };
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  CREATE_USER: "Created user",
  DELETE_USER: "Deleted user",
  DISABLE_USER: "Disabled user",
  ENABLE_USER: "Enabled user",
  CHANGE_ROLE: "Changed role",
  CREATE_ROLE: "Created role",
  UPDATE_ROLE: "Updated role",
  UPDATE_PROFILE: "Updated profile",
  DELETE_ROLE: "Deleted role",
  DUPLICATE_ROLE: "Duplicated role",
  RESET_PASSWORD: "Reset password",
  UPDATE_SETTINGS: "Updated settings",
  CREATE_STUDENT: "Created student",
  UPDATE_STUDENT: "Updated student",
  DELETE_STUDENT: "Deleted student",
  UPDATE_STUDENT_STATUS: "Changed student status",
  IMPORT_STUDENT: "Imported students",
  CREATE_LOCATION: "Created location",
  UPDATE_LOCATION: "Updated location",
  DELETE_LOCATION: "Deleted location",
  CREATE_TRAINER: "Created trainer",
  UPDATE_TRAINER: "Updated trainer",
  DELETE_TRAINER: "Deleted trainer",
  CREATE_COURSE: "Created course",
  UPDATE_COURSE: "Updated course",
  DELETE_COURSE: "Deleted course",
  UPDATE_ATTENDANCE: "Updated attendance",
  IMPORT_ATTENDANCE: "Imported attendance history",
  IMPORT_BELT_HISTORY: "Imported belt history",
  CREATE_BELT_LEVEL: "Added belt level",
  UPDATE_BELT_LEVEL: "Updated belt level",
  DELETE_BELT_LEVEL: "Removed belt level",
  RECORD_PROMOTION: "Recorded promotion",
  DELETE_PROMOTION: "Deleted promotion record",
};
