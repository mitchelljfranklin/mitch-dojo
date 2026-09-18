"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import {
  retryEmailSendAction,
  type EmailRetryState,
} from "@/lib/actions/email-log";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  EMAIL_LOG_STATUSES,
  EMAIL_LOG_TYPES,
  EMAIL_TYPE_LABELS,
  type EmailLogEntry,
} from "@/lib/schemas/email-log";
import { formatDate } from "@/lib/utils";

const TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CLASSREMINDER: "default",
  PAYMENTREMINDER: "secondary",
  TRIALFOLLOWUP: "secondary",
  PORTALLINK: "outline",
  BIRTHDAY: "secondary",
  BOOKING: "secondary",
  RESET: "outline",
  TEST: "outline",
  INVITE: "default",
  REMINDER: "secondary",
};

function statusVariant(status: string) {
  if (status === "SENT") return "default" as const;
  return "destructive" as const;
}

// Single-use links and one-off confirmations that cannot be replayed — the
// UI hides their retry button (the server action refuses them too). Booking
// confirmations are one-per-booking: their tokens (chosen class/date) only
// exist in the prospect's free-text notes, so a retry would re-send with
// blank class details.
function isRetryable(log: EmailLogEntry): boolean {
  return (
    log.status === "FAILED" && log.type !== "RESET" && log.type !== "BOOKING"
  );
}

function timeLabel(date: Date): string {
  return formatDate(date);
}

type EmailLogFormProps = {
  result: { rows: EmailLogEntry[]; total: number };
  filters: {
    emailStatus: string;
    emailType: string;
    emailRecipient: string;
    emailFrom: string;
    emailTo: string;
  };
  page: number;
  pageSize: number;
  canRetry: boolean;
};

type RetryState = EmailRetryState | undefined;

export function EmailLogForm({
  result,
  filters,
  page,
  pageSize,
  canRetry,
}: EmailLogFormProps) {
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const filterEntries = Object.entries(filters).filter(
    ([, value]) => value && value.length > 0,
  );

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of filterEntries) {
      params.set(key, value);
    }
    params.set("emailLogPage", String(target));
    params.set("emailLogPageSize", String(pageSize));
    return `/admin/email-log?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-3">
        <div className="grid w-36 gap-2">
          <Label htmlFor="email-status">Status</Label>
          <AutoSubmitSelect
            name="emailStatus"
            id="email-status"
            defaultValue={filters.emailStatus || "ALL"}
            options={[
              { value: "ALL", label: "All statuses" },
              ...EMAIL_LOG_STATUSES.map((status) => ({
                value: status,
                label: status === "SENT" ? "Sent" : "Failed",
              })),
            ]}
          />
        </div>
        <div className="grid w-44 gap-2">
          <Label htmlFor="email-type">Type</Label>
          <AutoSubmitSelect
            name="emailType"
            id="email-type"
            defaultValue={filters.emailType || "ALL"}
            options={[
              { value: "ALL", label: "All types" },
              ...EMAIL_LOG_TYPES.map((type) => ({
                value: type,
                label: EMAIL_TYPE_LABELS[type],
              })),
            ]}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-recipient">Recipient</Label>
          <Input
            id="email-recipient"
            name="emailRecipient"
            defaultValue={filters.emailRecipient}
            placeholder="Search recipient"
            className="w-44"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-from">From</Label>
          <Input
            id="email-from"
            name="emailFrom"
            type="date"
            defaultValue={filters.emailFrom}
            className="w-36"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-to">To</Label>
          <Input
            id="email-to"
            name="emailTo"
            type="date"
            defaultValue={filters.emailTo}
            className="w-36"
          />
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        <Link
          href="/admin/email-log"
          className="text-muted-foreground pb-2 text-sm hover:underline"
        >
          Clear
        </Link>
      </form>

      {result.rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No emails match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Sent by</TableHead>
                {canRetry ? <TableHead>Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((log) => (
                <EmailLogRow key={log.id} log={log} canRetry={canRetry} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-muted-foreground text-xs" aria-live="polite">
        Page {page} of {totalPages} · {result.total} email
        {result.total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(page - 1)} rel="prev">
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(page + 1)} rel="next">
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

function EmailLogRow({
  log,
  canRetry,
}: {
  log: EmailLogEntry;
  canRetry: boolean;
}) {
  const [state, formAction, isPending] = useActionState<RetryState, FormData>(
    retryEmailSendAction,
    undefined,
  );
  // Refreshes the log table after a successful retry (no revalidatePath in
  // the action — see AGENTS.md).
  useActionFeedback(state);

  return (
    <TableRow>
      <TableCell className="text-xs whitespace-nowrap">
        {timeLabel(log.sentAt)}
      </TableCell>
      <TableCell
        className="max-w-48 truncate font-mono text-xs"
        title={log.sentTo}
      >
        {log.sentTo}
      </TableCell>
      <TableCell
        className="max-w-56 truncate text-sm"
        title={log.subject ?? ""}
      >
        {log.subject ?? "—"}
      </TableCell>
      <TableCell>
        <Badge variant={TYPE_VARIANTS[log.type] ?? "outline"}>
          {EMAIL_TYPE_LABELS[log.type as keyof typeof EMAIL_TYPE_LABELS] ??
            log.type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
      </TableCell>
      <TableCell
        className="max-w-56 truncate text-xs"
        title={log.errorMessage ?? ""}
      >
        {log.status === "FAILED"
          ? (log.errorMessage ?? "Send failed")
          : "Accepted by SMTP server"}
      </TableCell>
      <TableCell className="text-xs">{log.sentByName}</TableCell>
      {canRetry ? (
        <TableCell>
          {isRetryable(log) ? (
            <form action={formAction}>
              <input type="hidden" name="logId" value={log.id} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={isPending}
              >
                {isPending ? "Retrying…" : "Retry"}
              </Button>
            </form>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}
