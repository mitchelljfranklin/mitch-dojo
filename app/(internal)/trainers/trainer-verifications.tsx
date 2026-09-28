"use client";

import { useCallback, useEffect, useState } from "react";
import { useActionState } from "react";

import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  deleteTrainerVerificationAction,
  saveTrainerVerificationAction,
  type VerificationActionState,
} from "@/lib/actions/verifications";
import { formatDateUtc } from "@/lib/utils";

type VerificationRow = {
  typeId: string;
  typeName: string;
  typeDescription: string | null;
  required: boolean;
  requiresExpiry: boolean;
  defaultValidityMonths: number | null;
  recordId: string | null;
  referenceNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  documentKey: string | null;
  notes: string | null;
  status: "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";
};

const STATUS_LABELS: Record<VerificationRow["status"], string> = {
  VALID: "Valid",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
  MISSING: "Not recorded",
};

function statusVariant(status: VerificationRow["status"]) {
  if (status === "EXPIRED") return "destructive" as const;
  if (status === "EXPIRING") return "secondary" as const;
  if (status === "VALID") return "secondary" as const;
  return "outline" as const;
}

function RecordSheet({
  trainerId,
  row,
  onSaved,
}: {
  trainerId: string;
  row: VerificationRow;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    VerificationActionState,
    FormData
  >(saveTrainerVerificationAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  useEffect(() => {
    if (saved) {
      onSaved();
    }
  }, [saved, onSaved]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {row.recordId ? "Edit" : "Record"}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{row.typeName}</SheetTitle>
            <SheetDescription>
              {row.typeDescription ??
                "Record the credential details for this trainer."}
            </SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="trainerId" value={trainerId} />
            <input type="hidden" name="typeId" value={row.typeId} />
            <div className="grid gap-2">
              <Label htmlFor={`ref-${row.typeId}`}>Reference / number</Label>
              <Input
                id={`ref-${row.typeId}`}
                name="referenceNumber"
                maxLength={120}
                defaultValue={row.referenceNumber ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`issued-${row.typeId}`}>Issued</Label>
                <Input
                  id={`issued-${row.typeId}`}
                  name="issuedAt"
                  type="date"
                  defaultValue={row.issuedAt?.slice(0, 10) ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`expires-${row.typeId}`}>
                  Expires{row.requiresExpiry ? "" : " (optional)"}
                </Label>
                <Input
                  id={`expires-${row.typeId}`}
                  name="expiresAt"
                  type="date"
                  defaultValue={row.expiresAt?.slice(0, 10) ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`doc-${row.typeId}`}>Document (optional)</Label>
              <Input
                id={`doc-${row.typeId}`}
                name="document"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="cursor-pointer"
              />
              {row.documentKey ? (
                <p className="text-muted-foreground text-xs">
                  A file is on record — uploading a new one replaces it.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`notes-${row.typeId}`}>Notes</Label>
              <Textarea
                id={`notes-${row.typeId}`}
                name="notes"
                rows={2}
                defaultValue={row.notes ?? ""}
              />
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
                    setOpen(false);
                  }}
                >
                  Done
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}

function RemoveButton({
  verificationId,
  onRemoved,
}: {
  verificationId: string;
  onRemoved: () => void;
}) {
  const [state, formAction] = useActionState<VerificationActionState, FormData>(
    deleteTrainerVerificationAction,
    undefined,
  );

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      onRemoved();
    }
  }, [state, onRemoved]);

  return (
    <ActionForm action={formAction}>
      <input type="hidden" name="verificationId" value={verificationId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive"
      >
        Remove
      </Button>
    </ActionForm>
  );
}

export function TrainerVerifications({ trainerId }: { trainerId: string }) {
  const [rows, setRows] = useState<VerificationRow[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/trainers/${trainerId}/verifications`);
    if (!response.ok) return;
    const data = (await response.json()) as { rows: VerificationRow[] };
    setRows(data.rows);
  }, [trainerId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch(`/api/trainers/${trainerId}/verifications`);
      if (!response.ok) return;
      const data = (await response.json()) as { rows: VerificationRow[] };
      if (active) setRows(data.rows);
    })();
    return () => {
      active = false;
    };
  }, [trainerId]);

  if (rows === null) {
    return (
      <p className="text-muted-foreground text-sm">Loading verifications…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No verification types configured. Add some under Admin → Verifications.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.typeId}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
        >
          <div className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {row.typeName}
              <Badge variant={statusVariant(row.status)}>
                {STATUS_LABELS[row.status]}
              </Badge>
              {row.required ? <Badge variant="outline">Required</Badge> : null}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.referenceNumber ? `${row.referenceNumber}` : "No reference"}
              {row.expiresAt
                ? ` · expires ${formatDateUtc(row.expiresAt)}`
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <RecordSheet trainerId={trainerId} row={row} onSaved={load} />
            {row.recordId ? (
              <RemoveButton verificationId={row.recordId} onRemoved={load} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
