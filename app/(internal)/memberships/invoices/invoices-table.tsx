"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";

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
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/schemas/membership";
import { formatDate, formatDateUtc, formatMoney } from "@/lib/utils";

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

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  PAID: "Paid",
  VOID: "Void",
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

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
            {selected.size} invoice{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              Record payment
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
                  aria-label="Select all open invoices"
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  disabled={selectableIds.length === 0}
                />
              </TableHead>
            ) : null}
            <TableHead className="w-20">#</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Balance</TableHead>
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
                      aria-label={`Select invoice ${row.number}`}
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
              <TableCell>{formatDateUtc(row.issueDate)}</TableCell>
              <TableCell>{formatDate(row.dueDate)}</TableCell>
              <TableCell>
                {row.isOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant={statusBadgeVariant(row.status)}>
                    {STATUS_LABELS[row.status] ?? row.status}
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
                  <Link href={`/memberships/invoices/${row.id}`}>Open</Link>
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
            <SheetTitle>Record payment</SheetTitle>
            <SheetDescription>
              Records the full outstanding balance of each selected invoice with
              the same method and date.
            </SheetDescription>
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
              <Label htmlFor="bulk-method">Method</Label>
              <Select name="method" defaultValue="CASH">
                <SelectTrigger id="bulk-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-paidAt">Date</Label>
              <Input
                id="bulk-paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={todayIsoDate()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-reference">Reference (optional)</Label>
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
                  Done
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending || selected.size === 0}
                >
                  {isPending
                    ? "Recording..."
                    : `Record ${selected.size} payment${
                        selected.size === 1 ? "" : "s"
                      }`}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
