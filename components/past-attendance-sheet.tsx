"use client";

import { useState } from "react";
import { useActionState } from "react";
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
import {
  addPastAttendanceAction,
  type PastAttendanceState,
} from "@/lib/actions/attendance";
import { ATTENDANCE_STATUSES } from "@/lib/schemas/attendance";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export type BackfillCourse = {
  id: string;
  name: string;
  locationName: string;
  isActive: boolean;
};

const initialState: PastAttendanceState = undefined;

export function PastAttendanceSheet({
  studentId,
  studentName,
  courses,
  canMark,
}: {
  studentId: string;
  studentName: string;
  courses: BackfillCourse[];
  canMark: boolean;
}) {
  const t = useTranslations("Attendance.past");
  const statusT = useTranslations("Attendance.status");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    PastAttendanceState,
    FormData
  >(addPastAttendanceAction, initialState);
  useActionFeedback(state);

  // The sheet stays open after a successful save and shows the success
  // message; closing is an explicit user action (event handler, not a
  // setState-in-effect, which the lint rules forbid).
  const saved = state !== undefined && "ok" in state && state.ok;

  if (!canMark) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setOpen(false);
      }}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        {t("button")}
      </Button>

      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {t("description", { name: studentName })}
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="grid gap-2">
            <Label htmlFor="backfill-course">{t("course")}</Label>
            <select
              id="backfill-course"
              name="courseId"
              required
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.locationName})
                  {course.isActive ? "" : t("inactive")}
                </option>
              ))}
            </select>
            {courses.length === 0 ? (
              <p className="text-muted-foreground text-xs">{t("noCourses")}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="backfill-date">{t("date")}</Label>
            <Input
              id="backfill-date"
              name="date"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="backfill-status">{t("status")}</Label>
            <select
              id="backfill-status"
              name="status"
              defaultValue="PRESENT"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusT(status)}
                </option>
              ))}
            </select>
          </div>
          {state && "error" in state ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          {saved && state && "message" in state ? (
            <p className="text-success text-sm" role="status">
              {state.message} {t("savedHint")}
            </p>
          ) : null}
          <SheetFooter className="px-0">
            {saved ? (
              <Button type="button" onClick={() => setOpen(false)}>
                {t("done")}
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : t("save")}
              </Button>
            )}
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
  );
}
