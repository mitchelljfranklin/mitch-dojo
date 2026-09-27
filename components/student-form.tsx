"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { COUNTRIES, countryName } from "@/lib/countries";
import {
  GUARDIAN_RELATIONSHIPS,
  STUDENT_STATUSES,
  STUDENT_STATUS_LABELS,
  type StudentStatus,
} from "@/lib/schemas/student";

export type StudentFormLocation = {
  id: string;
  name: string;
  isActive: boolean;
};

export type StudentFormDiscipline = {
  id: string;
  name: string;
  isActive: boolean;
};

export type StudentFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  medicalMedications: string | null;
  medicalConditions: string | null;
  medicalInjuries: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  status: string;
  notes: string | null;
  photoKey: string | null;
  locationIds: string[];
  primaryLocationId: string | null;
  disciplineIds: string[];
  householdId?: string | null;
};

export type StudentFormState =
  { error: string } | { ok: true; message: string } | undefined;

type StudentFormAction = (
  state: StudentFormState,
  formData: FormData,
) => Promise<StudentFormState>;

type StudentFormProps = {
  action: StudentFormAction;
  values?: StudentFormValues;
  locations: StudentFormLocation[];
  disciplines: StudentFormDiscipline[];
  households: { id: string; name: string }[];
  defaultCountry: string;
  submitLabel: string;
  studentId?: string;
  canViewMedical: boolean;
};

// The form's uncontrolled inputs (checkboxes, selects) only read their
// defaults at mount. Keying the inner form on a fingerprint of the server
// data remounts it whenever a refresh delivers changed values — e.g. right
// after a successful save — while leaving in-progress edits untouched when
// nothing changed (a failed save never triggers a refresh).
export function StudentForm(props: StudentFormProps) {
  const fingerprint = JSON.stringify([
    props.values,
    props.locations,
    props.disciplines,
    props.households,
    props.defaultCountry,
    props.canViewMedical,
  ]);
  return <StudentFormInner key={fingerprint} {...props} />;
}

function StudentFormInner({
  action,
  values,
  locations,
  disciplines,
  households,
  defaultCountry,
  submitLabel,
  studentId,
  canViewMedical,
}: StudentFormProps) {
  const [state, formAction, isPending] = useActionState<
    StudentFormState,
    FormData
  >(action, undefined);
  useActionFeedback(state);

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
    values?.locationIds ?? [],
  );
  const [primaryLocationId, setPrimaryLocationId] = useState<string>(
    values?.primaryLocationId ?? values?.locationIds[0] ?? "",
  );
  const [selectedDisciplineIds, setSelectedDisciplineIds] = useState<string[]>(
    values?.disciplineIds ?? [],
  );

  const toggleLocation = (locationId: string, checked: boolean) => {
    setSelectedLocationIds((previous) =>
      checked
        ? [...previous, locationId]
        : previous.filter((id) => id !== locationId),
    );
  };

  const toggleDiscipline = (disciplineId: string, checked: boolean) => {
    setSelectedDisciplineIds((previous) =>
      checked
        ? [...previous, disciplineId]
        : previous.filter((id) => id !== disciplineId),
    );
  };

  const dateValue = values?.dateOfBirth ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {studentId ? (
        <input type="hidden" name="studentId" value={studentId} />
      ) : null}
      <input type="hidden" name="removePhoto" value="false" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name *</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={values?.firstName}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name *</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={values?.lastName}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={values?.email ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={values?.phone ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={dateValue}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={values?.status ?? "TRIAL"}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STUDENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-2 text-sm font-medium">Address</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2 sm:col-span-3 sm:grid-cols-1">
            <Label htmlFor="addressLine">Street address</Label>
            <Input
              id="addressLine"
              name="addressLine"
              defaultValue={values?.addressLine ?? ""}
              maxLength={200}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              defaultValue={values?.city ?? ""}
              maxLength={80}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">State / Region / Province</Label>
            <Input
              id="state"
              name="state"
              defaultValue={values?.state ?? ""}
              maxLength={80}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              name="postcode"
              defaultValue={values?.postcode ?? ""}
              maxLength={20}
            />
          </div>
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              name="country"
              defaultValue={values?.country ?? defaultCountry}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">None</option>
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {countryName(code)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-2 text-sm font-medium">Guardian (for juniors)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="guardianName">Name</Label>
            <Input
              id="guardianName"
              name="guardianName"
              defaultValue={values?.guardianName ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guardianEmail">Email</Label>
            <Input
              id="guardianEmail"
              name="guardianEmail"
              type="email"
              defaultValue={values?.guardianEmail ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guardianPhone">Phone</Label>
            <Input
              id="guardianPhone"
              name="guardianPhone"
              defaultValue={values?.guardianPhone ?? ""}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="guardianRelationship">Relationship</Label>
            <select
              id="guardianRelationship"
              name="guardianRelationship"
              defaultValue={values?.guardianRelationship ?? ""}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">Not stated</option>
              {GUARDIAN_RELATIONSHIPS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {relationship}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {canViewMedical ? (
        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">
            Health &amp; medical{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (sensitive — visible only to medical-permitted roles)
            </span>
          </h3>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="medicalMedications">
                Prescribed medications that may impair reaction time or
                judgement
              </Label>
              <Textarea
                id="medicalMedications"
                name="medicalMedications"
                rows={2}
                defaultValue={values?.medicalMedications ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medicalConditions">
                Conditions we should be aware of (asthma, epilepsy, …)
              </Label>
              <Textarea
                id="medicalConditions"
                name="medicalConditions"
                rows={2}
                defaultValue={values?.medicalConditions ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medicalInjuries">
                Illnesses or injuries that may affect training
              </Label>
              <Textarea
                id="medicalInjuries"
                name="medicalInjuries"
                rows={2}
                defaultValue={values?.medicalInjuries ?? ""}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t pt-4">
        <h3 className="mb-2 text-sm font-medium">Emergency contact</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="emergencyContactName">Name</Label>
            <Input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={values?.emergencyContactName ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              defaultValue={values?.emergencyContactPhone ?? ""}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium">Dojo locations</h3>
        <p className="text-muted-foreground mb-2 text-xs">
          Assign the student to one or more locations and choose their home
          dojo.
        </p>
        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {locations.map((location) => {
              const checked = selectedLocationIds.includes(location.id);
              return (
                <label
                  key={location.id}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <Checkbox
                    name="locationIds"
                    value={location.id}
                    defaultChecked={checked}
                    onCheckedChange={(next: boolean | "indeterminate") =>
                      toggleLocation(location.id, next === true)
                    }
                  />
                  <span className="min-w-0 flex-1">
                    {location.name}
                    {location.isActive ? null : (
                      <span className="text-muted-foreground"> (inactive)</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {locations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No locations exist yet — create one under Settings → Locations
              first.
            </p>
          ) : null}
        </div>
        <div className="mt-4 grid max-w-xs gap-2">
          <Label htmlFor="primaryLocationId">Primary (home) dojo</Label>
          <select
            id="primaryLocationId"
            name="primaryLocationId"
            value={primaryLocationId}
            onChange={(event) => setPrimaryLocationId(event.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Choose…</option>
            {locations
              .filter((location) => selectedLocationIds.includes(location.id))
              .map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium">Disciplines</h3>
        <p className="text-muted-foreground mb-2 text-xs">
          Which arts the student trains — they appear in those progression
          tables and hold a separate rank in each.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {disciplines.map((discipline) => {
            const checked = selectedDisciplineIds.includes(discipline.id);
            return (
              <label
                key={discipline.id}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Checkbox
                  name="disciplineIds"
                  value={discipline.id}
                  defaultChecked={checked}
                  onCheckedChange={(next: boolean | "indeterminate") =>
                    toggleDiscipline(discipline.id, next === true)
                  }
                />
                <span className="min-w-0 flex-1">
                  {discipline.name}
                  {discipline.isActive ? null : (
                    <span className="text-muted-foreground"> (inactive)</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        {disciplines.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No disciplines exist yet — create one under Belts &amp; gradings
            first.
          </p>
        ) : null}
      </div>

      {households.length > 0 ? (
        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">Household</h3>
          <p className="text-muted-foreground mb-2 text-xs">
            Group siblings under one family contact (optional). Blank guardian
            details are inherited from the household.
          </p>
          <select
            id="householdId"
            name="householdId"
            defaultValue={values?.householdId ?? ""}
            className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-3 text-sm"
          >
            <option value="">No household</option>
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="border-t pt-4">
        <h3 className="mb-2 text-sm font-medium">Photo</h3>
        {values?.photoKey ? (
          <div className="flex items-center gap-3">
            <img
              src={`/api/students/${values.id}/photo?v=${values.photoKey}`}
              alt="Student photo"
              className="size-16 rounded-md border object-cover"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive w-fit"
              onClick={() => {
                const input = document.querySelector(
                  'input[name="removePhoto"]',
                ) as HTMLInputElement | null;
                if (input) input.value = "true";
              }}
            >
              Remove photo
            </Button>
          </div>
        ) : null}
        <div className="grid max-w-sm gap-2">
          <Label htmlFor="photoFile">Upload photo</Label>
          <Input
            id="photoFile"
            name="photoFile"
            type="file"
            accept="image/*"
            className="cursor-pointer"
          />
          <p className="text-muted-foreground text-xs">
            PNG, JPG, GIF, or WEBP up to 2 MB. Served only to signed-in staff.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values?.notes ?? ""}
        />
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
