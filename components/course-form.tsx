"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/schemas/course";

export type CourseFormValues = {
  id?: string;
  name: string;
  description: string | null;
  locationId: string;
  disciplineId: string;
  trainerId: string | null;
  isActive: boolean;
  trainingTimes: { weekday: number; startTime: string; endTime: string }[];
};

export type CourseFormState =
  { error: string } | { ok: true; message: string } | undefined;

type CourseFormAction = (
  state: CourseFormState,
  formData: FormData,
) => Promise<CourseFormState>;

type CourseFormProps = {
  action: CourseFormAction;
  values?: CourseFormValues;
  locations: { id: string; name: string; isActive: boolean }[];
  disciplines: { id: string; name: string; isActive: boolean }[];
  trainers: { id: string; name: string }[];
  submitLabel: string;
  courseId?: string;
};

type SlotRow = { weekday: number; startTime: string; endTime: string };

const initialSlot: SlotRow = {
  weekday: 1,
  startTime: "18:00",
  endTime: "19:00",
};

export function CourseForm({
  action,
  values,
  locations,
  disciplines,
  trainers,
  submitLabel,
  courseId,
}: CourseFormProps) {
  const [state, formAction, isPending] = useActionState<
    CourseFormState,
    FormData
  >(action, undefined);
  useActionFeedback(state);

  const [slots, setSlots] = useState<SlotRow[]>(
    values?.trainingTimes.length
      ? values.trainingTimes.map((slot) => ({ ...slot }))
      : values?.trainingTimes.length
        ? []
        : [{ ...initialSlot }],
  );

  function addSlot() {
    setSlots((previous) => [...previous, { ...initialSlot }]);
  }

  function removeSlot(index: number) {
    setSlots((previous) => previous.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, patch: Partial<SlotRow>) {
    setSlots((previous) =>
      previous.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {courseId ? (
        <input type="hidden" name="courseId" value={courseId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="course-name">Name *</Label>
          <Input
            id="course-name"
            name="name"
            defaultValue={values?.name}
            required
            maxLength={80}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="course-location">Location *</Label>
          <Select name="locationId" defaultValue={values?.locationId ?? ""}>
            <SelectTrigger id="course-location">
              <SelectValue placeholder="Choose a location…" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                  {location.isActive ? null : " (inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Every course runs at exactly one location.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="course-discipline">Discipline *</Label>
          <Select name="disciplineId" defaultValue={values?.disciplineId ?? ""}>
            <SelectTrigger id="course-discipline">
              <SelectValue placeholder="Choose a discipline…" />
            </SelectTrigger>
            <SelectContent>
              {disciplines.map((discipline) => (
                <SelectItem key={discipline.id} value={discipline.id}>
                  {discipline.name}
                  {discipline.isActive ? null : " (inactive)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            The discipline determines the belt ladder used for progression.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="course-trainer">Trainer</Label>
          <Select name="trainerId" defaultValue={values?.trainerId ?? ""}>
            <SelectTrigger id="course-trainer">
              <SelectValue placeholder="No trainer assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No trainer assigned</SelectItem>
              {trainers.map((trainer) => (
                <SelectItem key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <Checkbox
            name="isActive"
            defaultChecked={values ? values.isActive : true}
          />
          Active
        </label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          name="description"
          rows={2}
          defaultValue={values?.description ?? ""}
        />
      </div>

      <div className="border-t pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Weekly training times</h3>
            <p className="text-muted-foreground text-xs">
              Recurring slots that generate sessions on the schedule.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
            Add slot
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((slot, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="slotWeekday" value={slot.weekday} />
              <select
                aria-label={`Slot ${index + 1} day`}
                value={slot.weekday}
                onChange={(event) =>
                  updateSlot(index, { weekday: Number(event.target.value) })
                }
                className="border-input bg-background h-9 w-36 rounded-md border px-3 text-sm"
              >
                {WEEKDAY_ORDER.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {WEEKDAY_LABELS[weekday]}
                  </option>
                ))}
              </select>
              <Input
                aria-label={`Slot ${index + 1} start time`}
                name="slotStartTime"
                type="time"
                value={slot.startTime}
                onChange={(event) =>
                  updateSlot(index, { startTime: event.target.value })
                }
                className="w-28"
                required
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                aria-label={`Slot ${index + 1} end time`}
                name="slotEndTime"
                type="time"
                value={slot.endTime}
                onChange={(event) =>
                  updateSlot(index, { endTime: event.target.value })
                }
                className="w-28"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeSlot(index)}
                disabled={slots.length === 0}
              >
                Remove
              </Button>
            </div>
          ))}
          {slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No weekly slots — the course exists but never appears on the
              schedule.
            </p>
          ) : null}
        </div>
      </div>

      {state && "error" in state ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
