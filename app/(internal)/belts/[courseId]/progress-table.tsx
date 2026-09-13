"use client";

import { useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  recordPromotionAction,
  type BeltActionState,
} from "@/lib/actions/belts";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { BeltLevelView } from "./belt-levels-manager";
import type { ProgressRow } from "@/lib/db/belts";

type ProgressTableProps = {
  courseId: string;
  belts: BeltLevelView[];
  rows: ProgressRow[];
  canEdit: boolean;
};

const initialState: BeltActionState = undefined;

function BeltChip({
  name,
  colorHex,
}: {
  name: string;
  colorHex: string | null;
}) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {colorHex ? (
        <span
          aria-hidden="true"
          className="h-3 w-6 shrink-0 rounded-full border border-black/20"
          style={{ backgroundColor: colorHex }}
        />
      ) : null}
      {name}
    </span>
  );
}

export function ProgressTable({
  courseId,
  belts,
  rows,
  canEdit,
}: {
  courseId: string;
  belts: BeltLevelView[];
  rows: ProgressRow[];
  canEdit: boolean;
}) {
  const [promoting, setPromoting] = useState<ProgressRow | null>(null);
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(recordPromotionAction, undefined);
  useActionFeedback(state);

  // The sheet stays open after a successful save and shows the success
  // message; closing is an explicit user action (event handler, not a
  // setState-in-effect, which the lint rules forbid).
  const promotionSaved = state !== undefined && "ok" in state && state.ok;

  return (
    <Card>
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <h2 className="text-base font-semibold">Student progression</h2>
          <p className="text-muted-foreground text-xs">
            Current rank, trainings since promotion, and eligibility for the
            next belt.
          </p>
        </div>
      </div>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground pb-2 text-sm">
            No students at this course&apos;s location yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {rows.map((row) => (
              <div
                key={row.studentId}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {row.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {row.currentBeltName
                      ? `${row.trainingsSince} training${row.trainingsSince === 1 ? "" : "s"} since promotion`
                      : "No belt recorded yet"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.currentBeltName ? (
                    <BeltChip
                      name={row.currentBeltName}
                      colorHex={row.currentBeltColor}
                    />
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Unranked
                    </Badge>
                  )}
                  {row.nextBeltName && row.requiredTrainings !== null ? (
                    <Badge
                      variant={row.isEligible ? "default" : "outline"}
                      className="text-xs"
                    >
                      {row.isEligible
                        ? `Eligible: ${row.nextBeltName}`
                        : `${row.nextBeltName}: ${row.trainingsSince}/${row.requiredTrainings}`}
                    </Badge>
                  ) : null}
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPromoting(row)}
                    >
                      Promote
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet
        open={promoting !== null}
        onOpenChange={(open) => {
          if (!open) setPromoting(null);
        }}
      >
        {promoting ? (
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Record promotion</SheetTitle>
              <SheetDescription>
                {promoting.name}
                {promoting.isEligible
                  ? " has met the training requirement."
                  : " has not yet met the next belt's training requirement — record anyway if the instructor decides so."}
              </SheetDescription>
            </SheetHeader>
            <form
              action={formAction}
              className="flex flex-1 flex-col gap-4 px-4"
            >
              <input
                type="hidden"
                name="studentId"
                value={promoting.studentId}
              />
              <input type="hidden" name="courseId" value={courseId} />
              <div className="grid gap-2">
                <Label htmlFor="promotion-belt">Belt</Label>
                <select
                  id="promotion-belt"
                  name="beltLevelId"
                  defaultValue={belts[0]?.id ?? ""}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  required
                >
                  {belts.map((belt) => (
                    <option key={belt.id} value={belt.id}>
                      {belt.name}
                      {promoting.currentBeltName === belt.name
                        ? " (current)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promotion-date">Award date</Label>
                <Input
                  id="promotion-date"
                  name="awardedAt"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promotion-notes">Notes</Label>
                <Input
                  id="promotion-notes"
                  name="notes"
                  placeholder="Optional — grading day, examiner, etc."
                />
              </div>
              {state && "error" in state ? (
                <p className="text-destructive text-sm" role="alert">
                  {state.error}
                </p>
              ) : null}
              {promotionSaved && state && "message" in state ? (
                <p className="text-success text-sm" role="status">
                  {state.message} The table below refreshes automatically.
                </p>
              ) : null}
              <SheetFooter className="px-0">
                {promotionSaved ? (
                  <Button type="button" onClick={() => setPromoting(null)}>
                    Done
                  </Button>
                ) : (
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Recording..." : "Record promotion"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPromoting(null)}
                >
                  Cancel
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        ) : null}
      </Sheet>
    </Card>
  );
}
