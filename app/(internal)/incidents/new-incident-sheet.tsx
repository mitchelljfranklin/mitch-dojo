"use client";

import { ActionForm } from "@/components/action-form";
import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";

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
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  type IncidentActionState,
  createIncidentAction,
} from "@/lib/actions/incidents";
import { INCIDENT_NONE, INCIDENT_SEVERITIES } from "@/lib/schemas/incident";

type Option = { id: string; name: string };

function todayIsoDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export function NewIncidentSheet({
  students,
  locations,
}: {
  students: Option[];
  locations: Option[];
}) {
  const translate = useTranslations("Incidents");
  const translateForm = useTranslations("Incidents.form");
  const translateNew = useTranslations("Incidents.new");
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    IncidentActionState,
    FormData
  >(createIncidentAction, undefined);
  useActionFeedback(state);

  const saved = state !== undefined && "ok" in state && state.ok;

  return (
    <>
      <Button onClick={() => setOpen(true)}>{translateNew("button")}</Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{translateNew("title")}</SheetTitle>
            <SheetDescription>{translateNew("description")}</SheetDescription>
          </SheetHeader>
          <ActionForm
            key={open ? "open" : "closed"}
            action={formAction}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="incident-title">{translateForm("title")}</Label>
              <Input
                id="incident-title"
                name="title"
                required
                maxLength={120}
                placeholder={translateForm("titlePlaceholder")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="incident-occurredAt">
                  {translateForm("date")}
                </Label>
                <Input
                  id="incident-occurredAt"
                  name="occurredAt"
                  type="date"
                  required
                  defaultValue={todayIsoDate()}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="incident-severity">
                  {translateForm("severity")}
                </Label>
                <Select name="severity" defaultValue="MINOR">
                  <SelectTrigger id="incident-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_SEVERITIES.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {translate(`severity.${severity}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="incident-student">
                  {translateForm("student")}
                </Label>
                <Select name="studentId" defaultValue={INCIDENT_NONE}>
                  <SelectTrigger id="incident-student">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INCIDENT_NONE}>
                      {translateForm("noStudent")}
                    </SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="incident-location">
                  {translateForm("location")}
                </Label>
                <Select name="locationId" defaultValue={INCIDENT_NONE}>
                  <SelectTrigger id="incident-location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INCIDENT_NONE}>
                      {translateForm("noLocation")}
                    </SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-description">
                {translateForm("what")}
              </Label>
              <Textarea
                id="incident-description"
                name="description"
                rows={4}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-injury">{translateForm("injury")}</Label>
              <Textarea
                id="incident-injury"
                name="injuryDescription"
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="incident-treatment">
                  {translateForm("treatment")}
                </Label>
                <Input id="incident-treatment" name="treatmentGiven" />
              </div>
              <label className="flex w-fit items-center gap-2 self-end text-sm">
                <Checkbox name="medicalAttentionRequired" />
                {translateForm("medical")}
              </label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incident-actions">
                {translateForm("actions")}
              </Label>
              <Textarea id="incident-actions" name="actionsTaken" rows={2} />
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
                <Button type="button" onClick={() => setOpen(false)}>
                  {translateNew("done")}
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? translateNew("saving") : translateNew("submit")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {translateNew("cancel")}
              </Button>
            </SheetFooter>
          </ActionForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
