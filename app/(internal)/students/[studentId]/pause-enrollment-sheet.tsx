"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Students.pause");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        {t("button")}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("title", { plan: planName })}</SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>
          <form
            key={open ? "open" : "closed"}
            action={pauseEnrollmentAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <input type="hidden" name="enrollmentId" value={enrollmentId} />
            <input type="hidden" name="studentId" value={studentId} />
            <div className="grid gap-2">
              <Label htmlFor="pause-reason">{t("reason")}</Label>
              <Input
                id="pause-reason"
                name="pauseReason"
                maxLength={120}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pause-resume">{t("resume")}</Label>
              <Input id="pause-resume" name="resumeAt" type="date" />
              <p className="text-muted-foreground text-xs">{t("resumeNote")}</p>
            </div>
            <SheetFooter className="px-0">
              <Button type="submit">{t("submit")}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
