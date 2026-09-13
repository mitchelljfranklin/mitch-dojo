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
};
