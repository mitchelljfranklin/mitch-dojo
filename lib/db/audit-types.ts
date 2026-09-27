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
  UPDATE_SESSION_STATUS: "Changed session status",
  UPDATE_ATTENDANCE: "Updated attendance",
  IMPORT_ATTENDANCE: "Imported attendance history",
  IMPORT_BELT_HISTORY: "Imported belt history",
  CREATE_DISCIPLINE: "Created discipline",
  DELETE_DISCIPLINE: "Deleted discipline",
  CREATE_BELT_LEVEL: "Added belt level",
  UPDATE_BELT_LEVEL: "Updated belt level",
  DELETE_BELT_LEVEL: "Removed belt level",
  RECORD_PROMOTION: "Recorded promotion",
  DELETE_PROMOTION: "Deleted promotion record",
  CREATE_MEMBERSHIP_PLAN: "Created membership plan",
  UPDATE_MEMBERSHIP_PLAN: "Updated membership plan",
  DELETE_MEMBERSHIP_PLAN: "Deleted membership plan",
  CREATE_ENROLLMENT: "Enrolled member",
  END_ENROLLMENT: "Ended enrollment",
  PAUSE_ENROLLMENT: "Paused enrollment",
  RESUME_ENROLLMENT: "Resumed enrollment",
  CREATE_INVOICE: "Created invoice",
  VOID_INVOICE: "Voided invoice",
  RECORD_PAYMENT: "Recorded payment",
  DELETE_PAYMENT: "Deleted payment",
  GENERATE_INVOICES: "Generated recurring invoices",
  WEBSITE_BOOKING: "Website trial booking",
  UPDATE_TRIAL_STAGE: "Updated trial stage",
  SEND_PORTAL_LINK: "Sent portal link",
  RETRY_EMAIL_SEND: "Retried email send",
  CREATE_CAMPAIGN: "Queued email campaign",
  SEND_CAMPAIGN: "Sent email campaign",
  RECORD_AGREEMENT: "Recorded agreement signature",
};
