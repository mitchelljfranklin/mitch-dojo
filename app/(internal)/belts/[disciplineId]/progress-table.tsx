"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
  const translate = useTranslations("Belts.progress");
  const [promoting, setPromoting] = useState<ProgressRow | null>(null);
  const [defaultBeltId, setDefaultBeltId] = useState("");
  // Client-side filters: the rows are already in memory, so filtering
  // stays instant with no server round-trip.
  const [query, setQuery] = useState("");
  const [beltFilter, setBeltFilter] = useState("ALL");
  const [eligibilityFilter, setEligibilityFilter] = useState("ALL");

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (term && !row.name.toLowerCase().includes(term)) return false;
      if (beltFilter === "UNRANKED") {
        if (row.currentBeltName) return false;
      } else if (beltFilter !== "ALL") {
        if (
          row.currentBeltName !==
          belts.find((belt) => belt.id === beltFilter)?.name
        )
          return false;
      }
      if (eligibilityFilter === "ELIGIBLE") {
        if (!row.isEligible) return false;
      } else if (eligibilityFilter === "NEEDS") {
        if (row.isEligible || row.requiredTrainings === null) return false;
      }
      return true;
    });
  }, [rows, belts, query, beltFilter, eligibilityFilter]);

  const filtersActive =
    query.trim().length > 0 ||
    beltFilter !== "ALL" ||
    eligibilityFilter !== "ALL";

  return (
    <Card>
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <h2 className="text-base font-semibold">{translate("title")}</h2>
          <p className="text-muted-foreground text-xs">
            {translate("description")}
          </p>
        </div>
      </div>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground pb-2 text-sm">
            {translate("empty")}
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <Input
                aria-label={translate("searchAria")}
                placeholder={translate("searchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 w-52"
              />
              <select
                aria-label={translate("beltAria")}
                value={beltFilter}
                onChange={(event) => setBeltFilter(event.target.value)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="ALL">{translate("allBelts")}</option>
                <option value="UNRANKED">{translate("unranked")}</option>
                {belts.map((belt) => (
                  <option key={belt.id} value={belt.id}>
                    {belt.name}
                  </option>
                ))}
              </select>
              <select
                aria-label={translate("eligibilityAria")}
                value={eligibilityFilter}
                onChange={(event) => setEligibilityFilter(event.target.value)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="ALL">{translate("allStudents")}</option>
                <option value="ELIGIBLE">{translate("eligible")}</option>
                <option value="NEEDS">{translate("needs")}</option>
              </select>
              {filtersActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setBeltFilter("ALL");
                    setEligibilityFilter("ALL");
                  }}
                >
                  {translate("clear")}
                </Button>
              ) : null}
            </div>
            {filteredRows.length === 0 ? (
              <p className="text-muted-foreground pb-2 text-sm">
                {translate("none")}
              </p>
            ) : (
              <>
                {filtersActive && filteredRows.length < rows.length ? (
                  <p className="text-muted-foreground mb-2 text-xs">
                    {translate("showing", {
                      filtered: filteredRows.length,
                      total: rows.length,
                    })}
                  </p>
                ) : null}
                <div className="flex flex-col divide-y rounded-lg border">
                  {filteredRows.map((row) => (
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
                            ? translate("trainings", {
                                count: row.trainingsTotal,
                              })
                            : translate("noBelt")}
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
                            {translate("unranked")}
                          </Badge>
                        )}
                        {row.nextBeltName && row.requiredTrainings !== null ? (
                          <Badge
                            variant={row.isEligible ? "default" : "outline"}
                            className="text-xs"
                          >
                            {row.isEligible
                              ? translate("eligibleBadge", {
                                  belt: row.nextBeltName,
                                })
                              : translate("progressBadge", {
                                  belt: row.nextBeltName,
                                  current: row.trainingsTotal,
                                  required: row.requiredTrainings,
                                })}
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
                            {translate("promote")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
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
  const translate = useTranslations("Belts.promotion");
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
        <SheetTitle>{translate("title")}</SheetTitle>
        <SheetDescription>
          {translate(student.isEligible ? "eligible" : "notEligible", {
            name: student.name,
          })}
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="flex flex-1 flex-col gap-4 px-4">
        <input type="hidden" name="studentId" value={student.studentId} />
        <input type="hidden" name="disciplineId" value={disciplineId} />
        <div className="grid gap-2">
          <Label htmlFor="promotion-belt">{translate("belt")}</Label>
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
                {student.currentBeltName === belt.name
                  ? translate("current")
                  : ""}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            {translate("skipHint")}
          </p>
        </div>
        {isFirstBelt ? (
          <div className="grid gap-2">
            <Label htmlFor="promotion-credit">{translate("credit")}</Label>
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
              {translate("creditHint", {
                belt: selectedBelt?.name ?? translate("belt"),
                count: creditDefault,
              })}
            </p>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="promotion-date">{translate("date")}</Label>
          <Input
            id="promotion-date"
            name="awardedAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="promotion-notes">{translate("notes")}</Label>
          <Textarea
            id="promotion-notes"
            name="notes"
            rows={4}
            placeholder={translate("notesPlaceholder")}
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
              <span className="font-medium">{translate("override")}</span>
              <span className="text-muted-foreground block text-xs">
                {translate("overrideHint", {
                  current: effectiveTrainings,
                  required: selectedRequired,
                  belt: selectedBelt?.name ?? translate("belt"),
                })}
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
            {state.message} {translate("savedHint")}
          </p>
        ) : null}
        <SheetFooter className="px-0">
          {promotionSaved ? (
            <Button type="button" onClick={onClose}>
              {translate("done")}
            </Button>
          ) : (
            <Button type="submit" disabled={isPending}>
              {isPending ? translate("recording") : translate("record")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            {translate("cancel")}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
