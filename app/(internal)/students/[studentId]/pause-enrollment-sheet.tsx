"use client";

import { useState } from "react";

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
import { pauseEnrollmentAction } from "@/lib/actions/memberships";

type PauseEnrollmentSheetProps = {
  enrollmentId: string;
  studentId: string;
  planName: string;
};

// A membership hold: stops billing without ending the enrollment. An optional
// resume date lets the scheduler bring it back automatically.
export function PauseEnrollmentSheet({
  enrollmentId,
  studentId,
  planName,
}: PauseEnrollmentSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        Pause
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Pause {planName}</SheetTitle>
            <SheetDescription>
              Billing stops while the membership is on hold — no invoices are
              generated. Resume any time; the pause never back-bills.
            </SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={pauseEnrollmentAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="enrollmentId" value={enrollmentId} />
            <input type="hidden" name="studentId" value={studentId} />
            <div className="grid gap-2">
              <Label htmlFor="pause-reason">Reason (optional)</Label>
              <Input
                id="pause-reason"
                name="pauseReason"
                maxLength={120}
                placeholder="e.g. injury, travel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pause-resume">Resume on (optional)</Label>
              <Input id="pause-resume" name="resumeAt" type="date" />
              <p className="text-muted-foreground text-xs">
                Leave blank to resume manually.
              </p>
            </div>
            <SheetFooter className="px-0">
              <Button type="submit">Pause membership</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
