"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { BeltRangeView } from "./belt-ladder-manager";
import type { ProgressRow } from "@/lib/db/belts";

type ProgressTableProps = {
  disciplineId: string;
  belts: BeltRangeView[];
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

function defaultBeltIdFor(
  student: ProgressRow,
  belts: BeltRangeView[],
): string {
  const next = belts.find((belt) => belt.name === student.nextBeltName);
  return next?.id ?? belts[0]?.id ?? "";
}

export function ProgressTable({
  disciplineId,
  belts,
  rows,
  canEdit,
}: ProgressTableProps) {
  const [promoting, setPromoting] = useState<ProgressRow | null>(null);
  const [defaultBeltId, setDefaultBeltId] = useState("");

  return (
    <Card>
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <h2 className="text-base font-semibold">Student progression</h2>
          <p className="text-muted-foreground text-xs">
            Current rank, total trained sessions across all courses of this
            discipline, and eligibility for the next belt.
          </p>
        </div>
      </div>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground pb-2 text-sm">
            No active or trial students yet.
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
                      ? `${row.trainingsTotal} training${row.trainingsTotal === 1 ? "" : "s"} on this discipline`
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
                        : `${row.nextBeltName}: ${row.trainingsTotal}/${row.requiredTrainings}`}
                    </Badge>
                  ) : null}
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPromoting(row);
                        setDefaultBeltId(defaultBeltIdFor(row, belts));
                      }}
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
          // Keyed per opening so each promotion starts with fresh action
          // state and the belt picker re-initialises from the mount-time
          // default.
          <PromotionSheet
            key={`${promoting.studentId}-${defaultBeltId}`}
            disciplineId={disciplineId}
            belts={belts}
            student={promoting}
            defaultBeltId={defaultBeltId}
            onClose={() => setPromoting(null)}
          />
        ) : null}
      </Sheet>
    </Card>
  );
}

function PromotionSheet({
  disciplineId,
  belts,
  student,
  defaultBeltId,
  onClose,
}: {
  disciplineId: string;
  belts: BeltRangeView[];
  student: ProgressRow;
  defaultBeltId: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    BeltActionState,
    FormData
  >(recordPromotionAction, initialState);
  useActionFeedback(state);

  const promotionSaved = state !== undefined && "ok" in state && state.ok;

  // First belt in the discipline: the instructor can credit prior trainings
  // (transferring student whose history lives outside the system) so the
  // progression counter continues from where the student realistically is.
  const isFirstBelt = !student.currentBeltName;
  const [selectedBeltId, setSelectedBeltId] = useState(defaultBeltId);
  const selectedBelt = belts.find((belt) => belt.id === selectedBeltId);
  const creditDefault = useMemo(
    () => selectedBelt?.requiredTrainings ?? 0,
    [selectedBelt],
  );
  // The credit input is controlled: null = follow the selected belt's
  // requirement (the prefilled default), a number = instructor's override.
  // It resets when the belt changes via the input's key below.
  const [manualCredit, setManualCredit] = useState<number | null>(null);
  // The gate in the action counts the credit entered alongside a first-belt
  // promotion, so the live eligibility check mirrors that: selected belt's
  // requirement vs the student's local count + the current credit value.
  const currentCredit = manualCredit ?? creditDefault;
  const selectedRequired = selectedBelt?.requiredTrainings ?? 0;
  const effectiveTrainings = isFirstBelt
    ? student.trainingsTotal + currentCredit
    : student.trainingsTotal;
  const needsOverride = effectiveTrainings < selectedRequired;

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Record promotion</SheetTitle>
        <SheetDescription>
          {student.name}
          {student.isEligible
            ? " has met the training requirement."
            : " has not yet met the next belt's training requirement — record anyway if the instructor decides so."}
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
        <input type="hidden" name="studentId" value={student.studentId} />
        <input type="hidden" name="disciplineId" value={disciplineId} />
        <div className="grid gap-2">
          <Label htmlFor="promotion-belt">Belt</Label>
          {/* Uncontrolled with a mount-time default: React 19 resets forms
              after every action, which would revert a controlled select to
              the browser default between attempts. */}
          <select
            id="promotion-belt"
            name="beltRangeEntryId"
            defaultValue={defaultBeltId}
            onChange={(event) => setSelectedBeltId(event.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            required
          >
            {belts.map((belt) => (
              <option key={belt.id} value={belt.id}>
                {belt.name}
                {student.currentBeltName === belt.name ? " (current)" : ""}
              </option>
            ))}
          </select>
        </div>
        {isFirstBelt ? (
          <div className="grid gap-2">
            <Label htmlFor="promotion-credit">Starting trainings credit</Label>
            <Input
              id="promotion-credit"
              name="trainingsCredit"
              type="number"
              min={0}
              max={9999}
              key={selectedBeltId}
              value={manualCredit ?? creditDefault}
              onChange={(event) => {
                setManualCredit(
                  event.target.value === "" ? null : Number(event.target.value),
                );
              }}
            />
            <p className="text-muted-foreground text-xs">
              Prior sessions this student brings from elsewhere. Prefilled with{" "}
              {selectedBelt?.name ?? "this belt"}
              &apos;s requirement ({creditDefault}) — enter more if they had
              extra sessions. The counter always covers the belt being awarded:
              a lower value is topped up at save. Shown only for the first belt
              in a discipline.
            </p>
          </div>
        ) : null}
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
          <Textarea
            id="promotion-notes"
            name="notes"
            rows={4}
            placeholder="Optional — grading day, examiner, techniques assessed, etc."
          />
        </div>
        {needsOverride ? (
          <label className="border-warning/40 bg-warning/10 flex items-start gap-2 rounded-md border p-3 text-sm">
            <Checkbox
              name="overrideEligibility"
              defaultChecked={false}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">
                Override eligibility requirement
              </span>
              <span className="text-muted-foreground block text-xs">
                The student counts {effectiveTrainings} of the{" "}
                {selectedRequired} trainings {selectedBelt?.name ?? "this belt"}{" "}
                requires. Tick this to record the promotion anyway — the counter
                is then aligned to the new rank (e.g. exceptional progression, a
                make-up grading, or a multi-level grading).
              </span>
            </span>
          </label>
        ) : null}
        {state && "error" in state ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
        {promotionSaved && state && "message" in state ? (
          <p className="text-success text-sm" role="status">
            {state.message} The table refreshes automatically.
          </p>
        ) : null}
        <SheetFooter className="px-0">
          {promotionSaved ? (
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          ) : (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording..." : "Record promotion"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
