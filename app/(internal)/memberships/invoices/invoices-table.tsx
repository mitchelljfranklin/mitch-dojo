"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  type MembershipActionState,
  recordBulkPaymentsAction,
} from "@/lib/actions/memberships";
import { PAYMENT_METHODS } from "@/lib/schemas/membership";

export type InvoiceRowView = {
  id: string;
  number: number;
  studentId: string;
  studentName: string;
  locationName: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  isOverdue: boolean;
  totalCents: number;
  balanceCents: number;
};

function statusBadgeVariant(status: string) {
  if (status === "PAID") return "secondary" as const;
  if (status === "VOID") return "outline" as const;
  return "default" as const;
}

function todayIsoDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

function isSelectable(row: InvoiceRowView): boolean {
  return row.status === "OPEN" && row.balanceCents > 0;
}

export function InvoicesTable({
  rows,
  currency,
  canEdit,
}: {
  rows: InvoiceRowView[];
  currency: string;
  canEdit: boolean;
}) {
  const translate = useTranslations("Memberships.invoices");
  const formatter = useFormatter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

  const formatDate = (value: string) =>
    formatter.dateTime(new Date(value), {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const formatMoney = (cents: number, displayCurrency = currency) =>
    formatter.number(cents / 100, {
      style: "currency",
      currency: displayCurrency,
    });

  const [state, formAction, isPending] = useActionState<
    MembershipActionState,
    FormData
  >(recordBulkPaymentsAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  const selectableIds = rows.filter(isSelectable).map((row) => row.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(selectableIds) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit && selected.size > 0 ? (
        <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <span className="text-sm font-medium">
            {translate("selected", { count: selected.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              {translate("clear")}
            </Button>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              {translate("recordPayment")}
            </Button>
          </div>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            {canEdit ? (
              <TableHead className="w-10">
                <Checkbox
                  aria-label={translate("table.selectAll")}
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  disabled={selectableIds.length === 0}
                />
              </TableHead>
            ) : null}
            <TableHead className="w-20">{translate("table.number")}</TableHead>
            <TableHead>{translate("table.student")}</TableHead>
            <TableHead>{translate("table.issued")}</TableHead>
            <TableHead>{translate("table.due")}</TableHead>
            <TableHead>{translate("table.status")}</TableHead>
            <TableHead className="text-right">
              {translate("table.total")}
            </TableHead>
            <TableHead className="text-right">
              {translate("table.balance")}
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {canEdit ? (
                <TableCell>
                  {isSelectable(row) ? (
                    <Checkbox
                      aria-label={translate("table.selectInvoice", {
                        number: row.number,
                      })}
                      checked={selected.has(row.id)}
                      onCheckedChange={(checked) =>
                        toggleOne(row.id, checked === true)
                      }
                    />
                  ) : null}
                </TableCell>
              ) : null}
              <TableCell className="font-mono text-xs">
                <Link
                  href={`/memberships/invoices/${row.id}`}
                  className="hover:underline"
                >
                  #{row.number}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/students/${row.studentId}`}
                  className="hover:underline"
                >
                  {row.studentName}
                </Link>
                {row.locationName ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {row.locationName}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{formatDate(row.issueDate)}</TableCell>
              <TableCell>{formatDate(row.dueDate)}</TableCell>
              <TableCell>
                {row.isOverdue ? (
                  <Badge variant="destructive">
                    {translate("status.OVERDUE")}
                  </Badge>
                ) : (
                  <Badge variant={statusBadgeVariant(row.status)}>
                    {translate(`status.${row.status}`)}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(row.totalCents, currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(row.balanceCents, currency)}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/memberships/invoices/${row.id}`}>
                    {translate("table.open")}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={sheetOpen}
        onOpenChange={(next) => {
          if (!next) {
            setSheetOpen(false);
            if (saved) setSelected(new Set());
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{translate("bulk.title")}</SheetTitle>
            <SheetDescription>{translate("bulk.description")}</SheetDescription>
          </SheetHeader>
          <form
            key={sheetOpen ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            {[...selected].map((id) => (
              <input key={id} type="hidden" name="invoiceIds" value={id} />
            ))}
            <div className="grid gap-2">
              <Label htmlFor="bulk-method">{translate("bulk.method")}</Label>
              <Select name="method" defaultValue="CASH">
                <SelectTrigger id="bulk-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {translate(`paymentMethod.${method}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-paidAt">{translate("bulk.date")}</Label>
              <Input
                id="bulk-paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-reference">
                {translate("bulk.reference")}
              </Label>
              <Input id="bulk-reference" name="reference" maxLength={120} />
            </div>
            {state && "error" in state ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
            {saved && state && "message" in state ? (
              <p className="text-success text-sm" role="status">
                {state.message}
              </p>
            ) : null}
            <SheetFooter>
              {saved ? (
                <Button
                  type="button"
                  onClick={() => {
                    setSelected(new Set());
                    setSheetOpen(false);
                  }}
                >
                  {translate("bulk.done")}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending || selected.size === 0}
                >
                  {isPending
                    ? translate("bulk.recording")
                    : translate("bulk.record", { count: selected.size })}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                {translate("bulk.cancel")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
