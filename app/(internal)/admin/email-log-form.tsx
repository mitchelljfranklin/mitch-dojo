"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";

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
  type EmailLogEntry,
  type EmailLogType,
} from "@/lib/schemas/email-log";

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
  const translate = useTranslations("Admin.emailLog");
  const translateCommon = useTranslations("Common");
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
          <Label htmlFor="email-status">{translate("filters.status")}</Label>
          <AutoSubmitSelect
            name="emailStatus"
            id="email-status"
            defaultValue={filters.emailStatus || "ALL"}
            options={[
              { value: "ALL", label: translate("filters.allStatuses") },
              ...EMAIL_LOG_STATUSES.map((status) => ({
                value: status,
                label:
                  status === "SENT"
                    ? translate("filters.sent")
                    : translate("filters.failed"),
              })),
            ]}
          />
        </div>
        <div className="grid w-44 gap-2">
          <Label htmlFor="email-type">{translate("filters.type")}</Label>
          <AutoSubmitSelect
            name="emailType"
            id="email-type"
            defaultValue={filters.emailType || "ALL"}
            options={[
              { value: "ALL", label: translate("filters.allTypes") },
              ...EMAIL_LOG_TYPES.map((type) => ({
                value: type,
                label: translate(`types.${type}`),
              })),
            ]}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-recipient">
            {translate("filters.recipient")}
          </Label>
          <Input
            id="email-recipient"
            name="emailRecipient"
            defaultValue={filters.emailRecipient}
            placeholder={translate("filters.recipientPlaceholder")}
            className="w-44"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-from">{translate("filters.from")}</Label>
          <Input
            id="email-from"
            name="emailFrom"
            type="date"
            defaultValue={filters.emailFrom}
            className="w-36"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email-to">{translate("filters.to")}</Label>
          <Input
            id="email-to"
            name="emailTo"
            type="date"
            defaultValue={filters.emailTo}
            className="w-36"
          />
        </div>
        <Button type="submit" size="sm" variant="outline">
          {translate("filters.filter")}
        </Button>
        <Link
          href="/admin/email-log"
          className="text-muted-foreground pb-2 text-sm hover:underline"
        >
          {translate("filters.clear")}
        </Link>
      </form>

      {result.rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {translate("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translate("columns.date")}</TableHead>
                <TableHead>{translate("columns.recipient")}</TableHead>
                <TableHead>{translate("columns.subject")}</TableHead>
                <TableHead>{translate("columns.type")}</TableHead>
                <TableHead>{translate("columns.status")}</TableHead>
                <TableHead>{translate("columns.detail")}</TableHead>
                <TableHead>{translate("columns.sentBy")}</TableHead>
                {canRetry ? (
                  <TableHead>{translate("columns.action")}</TableHead>
                ) : null}
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
        {translate("page", {
          page,
          totalPages,
          total: result.total,
        })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(page - 1)} rel="prev">
              {translateCommon("previous")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {translateCommon("previous")}
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={pageHref(page + 1)} rel="next">
              {translateCommon("next")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {translateCommon("next")}
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
  const translate = useTranslations("Admin.emailLog");
  const formatter = useFormatter();
  const [state, formAction, isPending] = useActionState<RetryState, FormData>(
    retryEmailSendAction,
    undefined,
  );
  // Refreshes the log table after a successful retry (no revalidatePath in
  // the action — see AGENTS.md).
  useActionFeedback(state);

  const typeLabel = EMAIL_LOG_TYPES.includes(log.type as EmailLogType)
    ? translate(`types.${log.type as EmailLogType}`)
    : log.type;
  const statusLabel =
    log.status === "SENT"
      ? translate("filters.sent")
      : translate("filters.failed");

  return (
    <TableRow>
      <TableCell className="text-xs whitespace-nowrap">
        {formatter.dateTime(log.sentAt, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
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
          {typeLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(log.status)}>{statusLabel}</Badge>
      </TableCell>
      <TableCell
        className="max-w-56 truncate text-xs"
        title={log.errorMessage ?? ""}
      >
        {log.status === "FAILED"
          ? (log.errorMessage ?? translate("detail.sendFailed"))
          : translate("detail.accepted")}
      </TableCell>
      <TableCell className="text-xs">
        {log.sentByName === "System" ? translate("system") : log.sentByName}
      </TableCell>
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
                {isPending ? translate("retrying") : translate("retry")}
              </Button>
            </form>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}
