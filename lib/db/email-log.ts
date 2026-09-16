import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  EMAIL_LOG_STATUSES,
  EMAIL_LOG_TYPES,
  type EmailLogEntry,
} from "@/lib/schemas/email-log";

// Email log (NotificationLog) listing for the Settings → Email log tab.
// Rows are written pessimistically as FAILED by the mailer and flipped to
// SENT on success; retry reuses the same row via updateLogId.

export {
  EMAIL_LOG_STATUSES,
  EMAIL_LOG_TYPES,
  EMAIL_TYPE_LABELS,
  type EmailLogEntry,
  type EmailLogStatus,
  type EmailLogType,
} from "@/lib/schemas/email-log";

export type EmailLogFilters = {
  status?: string;
  type?: string;
  recipient?: string;
  fromDate?: string;
  toDate?: string;
};

// Parses a "YYYY-MM-DD" date-input value as a LOCAL calendar date (the
// browser's date input means the user's local day — parsing it as UTC
// midnight and shifting again moves the boundary a full day off).
function parseDateInput(
  value: string | undefined,
  endOfDay: boolean,
): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  return endOfDay
    ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
    : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
}

export async function listEmailLogs(
  filters: EmailLogFilters,
  page = 1,
  pageSize = 10,
): Promise<{ rows: EmailLogEntry[]; total: number }> {
  const where: Prisma.NotificationLogWhereInput = {};
  if (
    filters.status &&
    (EMAIL_LOG_STATUSES as readonly string[]).includes(filters.status)
  ) {
    where.status = filters.status;
  }
  if (
    filters.type &&
    (EMAIL_LOG_TYPES as readonly string[]).includes(filters.type)
  ) {
    where.type = filters.type;
  }
  if (filters.recipient && filters.recipient.trim().length > 0) {
    where.sentTo = {
      contains: filters.recipient.trim(),
      mode: "insensitive",
    };
  }
  const from = parseDateInput(filters.fromDate, false);
  if (from) where.sentAt = { ...(where.sentAt as object), gte: from };
  const to = parseDateInput(filters.toDate, true);
  if (to) where.sentAt = { ...(where.sentAt as object), lte: to };

  const [rows, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: { sentBy: { select: { name: true } } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      type: row.type,
      sentTo: row.sentTo,
      subject: row.subject,
      status: row.status,
      errorMessage: row.errorMessage,
      sentAt: row.sentAt,
      dedupKey: row.assessmentId,
      sentByName: row.sentBy?.name ?? "System",
    })),
    total,
  };
}

export async function getEmailLogById(id: string) {
  const row = await prisma.notificationLog.findUnique({
    where: { id },
    include: { sentBy: { select: { name: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    sentTo: row.sentTo,
    status: row.status,
    errorMessage: row.errorMessage,
    sentAt: row.sentAt,
    dedupKey: row.assessmentId,
    sentByName: row.sentBy?.name ?? "System",
  };
}

// Failed emails in the last 24 hours — powers the dashboard attention chip.
export async function getFailedEmailCount(
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - 86_400_000);
  return prisma.notificationLog.count({
    where: { status: "FAILED", sentAt: { gte: since } },
  });
}
