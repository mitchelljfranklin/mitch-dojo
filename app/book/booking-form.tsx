"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

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

export function BookingForm({
  locations,
  disciplines,
  sessions,
}: BookingFormProps) {
  const t = useTranslations("Book.form");
  const format = useFormatter();
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
    <form action={submitBookingAction} className="flex flex-col gap-4">
      {/* Honeypot — hidden from humans and assistive tech; bots fill it and
          are silently rejected. */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">{t("honeypotLabel")}</Label>
        <Input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="booking-for">{t("whoFor")}</Label>
        <Select
          name="bookingFor"
          defaultValue="adult"
          onValueChange={(value) => setBookingFor(value as "adult" | "child")}
        >
          <SelectTrigger id="booking-for">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adult">{t("myself")}</SelectItem>
            <SelectItem value="child">{t("child")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">
            {forChild ? t("childFirstName") : t("firstName")} *
          </Label>
          <Input id="firstName" name="firstName" required maxLength={60} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">
            {forChild ? t("childLastName") : t("lastName")} *
          </Label>
          <Input id="lastName" name="lastName" required maxLength={60} />
        </div>
      </div>

      {forChild ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="guardianName">{t("guardianName")}</Label>
            <Input id="guardianName" name="guardianName" maxLength={60} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guardianRelationship">
              {t("guardianRelationship")}
            </Label>
            <select
              id="guardianRelationship"
              name="guardianRelationship"
              defaultValue=""
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">{t("preferNotToSay")}</option>
              {GUARDIAN_RELATIONSHIPS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {t(
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
          {forChild ? t("guardianEmail") : t("email")}
        </Label>
        <Input id="booking-email" name="email" type="email" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="booking-phone">
          {forChild ? t("guardianPhone") : t("phone")}
        </Label>
        <Input id="booking-phone" name="phone" type="tel" maxLength={40} />
      </div>
      <p className="text-muted-foreground text-xs">
        {forChild ? t("contactNoteChild") : t("contactNoteAdult")}
      </p>

      <div className="grid gap-2">
        <Label htmlFor="booking-location">{t("location")}</Label>
        <Select name="locationId" required onValueChange={setLocationId}>
          <SelectTrigger id="booking-location">
            <SelectValue placeholder={t("chooseLocation")} />
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
        <Label htmlFor="booking-discipline">{t("martialArt")}</Label>
        <Select name="disciplineId" required onValueChange={setDisciplineId}>
          <SelectTrigger id="booking-discipline">
            <SelectValue placeholder={t("chooseMartialArt")} />
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
        <Label htmlFor="booking-session">{t("preferredClass")}</Label>
        <Select name="session" defaultValue="">
          <SelectTrigger id="booking-session">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("noPreference")}</SelectItem>
            {matchingSessions.map((session) => {
              const dateLabel = format.dateTime(
                new Date(`${session.date}T00:00:00Z`),
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                },
              );
              const label = session.full
                ? t("classOptionFull", {
                    courseName: session.courseName,
                    date: dateLabel,
                    time: session.startTime,
                  })
                : t("classOption", {
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
        <p className="text-muted-foreground text-xs">{t("sessionNote")}</p>
      </div>

      <Button type="submit" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
