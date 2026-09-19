"use client";

import { useActionState, useState } from "react";

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
import {
  recordAgreementSignatureAction,
  type AgreementSignatureState,
} from "@/lib/actions/agreements";
import { useActionFeedback } from "@/hooks/use-action-feedback";

type RecordSignatureSheetProps = {
  studentId: string;
  documentId: string;
  documentLabel: string;
  activeVersion: number;
};

function todayIsoDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function RecordSignatureSheet({
  studentId,
  documentId,
  documentLabel,
  activeVersion,
}: RecordSignatureSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    AgreementSignatureState,
    FormData
  >(recordAgreementSignatureAction, undefined);
  useActionFeedback(state);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Record signature
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent
          key={open ? "open" : "closed"}
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Record signature — {documentLabel}</SheetTitle>
            <SheetDescription>
              For paper signings done in person. Record who signed and when; the
              digital portal signing does not need this.
            </SheetDescription>
          </SheetHeader>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="documentId" value={documentId} />
            <div className="grid gap-2">
              <Label htmlFor={`signedBy-${documentId}`}>Who signed</Label>
              <Input
                id={`signedBy-${documentId}`}
                name="signedByName"
                required
                placeholder="Student or guardian name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`signedAt-${documentId}`}>Date signed</Label>
              <Input
                id={`signedAt-${documentId}`}
                name="signedAt"
                type="date"
                defaultValue={todayIsoDate()}
                max={todayIsoDate()}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Recorded against version {activeVersion}. The student&apos;s
              portal shows this document as signed.
            </p>
            {state && !state.ok ? (
              <p className="text-destructive text-sm" role="alert">
                {state.message}
              </p>
            ) : null}
            <SheetFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Recording…" : "Record signature"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
