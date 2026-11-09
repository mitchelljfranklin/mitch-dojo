"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookableSession } from "@/lib/db/trials";
import {
  GUARDIAN_RELATIONSHIPS,
  type GuardianRelationship,
} from "@/lib/schemas/student";
import { submitBookingAction } from "./actions";

type BookingFormProps = {
  locations: { id: string; name: string }[];
  disciplines: { id: string; name: string }[];
  sessions: BookableSession[];
};

// Stored relationship values stay in English; only the option label is
// translated, so changing language never changes the saved data.
const RELATIONSHIP_MESSAGE_KEYS: Record<GuardianRelationship, string> = {
  Mother: "mother",
  Father: "father",
  Parent: "parent",
  "Step-parent": "stepParent",
  Grandparent: "grandparent",
  Sibling: "sibling",
  "Aunt/Uncle": "auntUncle",
  "Legal guardian": "legalGuardian",
  Carer: "carer",
  Other: "other",
};

export function BookingForm(props: BookingFormProps) {
  return (
    <form action={submitBookingAction} className="relative">
      <BookingFormFields {...props} />
    </form>
  );
}

function BookingFormFields({
  locations,
  disciplines,
  sessions,
}: BookingFormProps) {
  const { pending } = useFormStatus();
  const translate = useTranslations("Book.form");
  const formatter = useFormatter();
  const [locationId, setLocationId] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [bookingFor, setBookingFor] = useState<"adult" | "child">("adult");
  const forChild = bookingFor === "child";

  const matchingSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          (!locationId || session.locationId === locationId) &&
          (!disciplineId || session.disciplineId === disciplineId),
      ),
    [sessions, locationId, disciplineId],
  );

  return (
    <>
      <fieldset
        disabled={pending}
        aria-busy={pending}
        className="m-0 flex flex-col gap-4 border-0 p-0"
      >
        {/* Honeypot — hidden from humans and assistive tech; bots fill it and
            are silently rejected. */}
        <div className="hidden" aria-hidden="true">
          <Label htmlFor="website">{translate("honeypotLabel")}</Label>
          <Input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="booking-for">{translate("whoFor")}</Label>
          <Select
            name="bookingFor"
            defaultValue="adult"
            onValueChange={(value) => setBookingFor(value as "adult" | "child")}
          >
            <SelectTrigger id="booking-for">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adult">{translate("myself")}</SelectItem>
              <SelectItem value="child">{translate("child")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">
              {forChild ? translate("childFirstName") : translate("firstName")}{" "}
              *
            </Label>
            <Input id="firstName" name="firstName" required maxLength={60} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">
              {forChild ? translate("childLastName") : translate("lastName")} *
            </Label>
            <Input id="lastName" name="lastName" required maxLength={60} />
          </div>
        </div>

        {forChild ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="guardianName">{translate("guardianName")}</Label>
              <Input id="guardianName" name="guardianName" maxLength={60} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guardianRelationship">
                {translate("guardianRelationship")}
              </Label>
              <select
                id="guardianRelationship"
                name="guardianRelationship"
                defaultValue=""
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="">{translate("preferNotToSay")}</option>
                {GUARDIAN_RELATIONSHIPS.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {translate(
                      `relationships.${RELATIONSHIP_MESSAGE_KEYS[relationship]}`,
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="booking-email">
            {forChild ? translate("guardianEmail") : translate("email")}
          </Label>
          <Input id="booking-email" name="email" type="email" maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-phone">
            {forChild ? translate("guardianPhone") : translate("phone")}
          </Label>
          <Input id="booking-phone" name="phone" type="tel" maxLength={40} />
        </div>
        <p className="text-muted-foreground text-xs">
          {forChild
            ? translate("contactNoteChild")
            : translate("contactNoteAdult")}
        </p>

        <div className="grid gap-2">
          <Label htmlFor="booking-location">{translate("location")}</Label>
          <Select name="locationId" required onValueChange={setLocationId}>
            <SelectTrigger id="booking-location">
              <SelectValue placeholder={translate("chooseLocation")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-discipline">{translate("martialArt")}</Label>
          <Select name="disciplineId" required onValueChange={setDisciplineId}>
            <SelectTrigger id="booking-discipline">
              <SelectValue placeholder={translate("chooseMartialArt")} />
            </SelectTrigger>
            <SelectContent>
              {disciplines.map((discipline) => (
                <SelectItem key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="booking-session">{translate("preferredClass")}</Label>
          <Select name="session" defaultValue="">
            <SelectTrigger id="booking-session">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{translate("noPreference")}</SelectItem>
              {matchingSessions.map((session) => {
                const dateLabel = formatter.dateTime(
                  new Date(`${session.date}T00:00:00Z`),
                  {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  },
                );
                const label = session.full
                  ? translate("classOptionFull", {
                      courseName: session.courseName,
                      date: dateLabel,
                      time: session.startTime,
                    })
                  : translate("classOption", {
                      courseName: session.courseName,
                      date: dateLabel,
                      time: session.startTime,
                    });
                return (
                  <SelectItem
                    key={session.id}
                    value={`${session.id}|${session.courseName}|${session.date}|${session.startTime}`}
                    disabled={session.full}
                  >
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {translate("sessionNote")}
          </p>
        </div>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {translate("submitting")}
            </>
          ) : (
            translate("submit")
          )}
        </Button>
      </fieldset>

      {pending ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-background/90 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md p-6 text-center backdrop-blur-sm"
        >
          <Loader2
            className="text-primary size-8 animate-spin"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">{translate("submitting")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {translate("submittingHint")}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
