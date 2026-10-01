"use client";

import { useMemo, useState } from "react";

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
import { GUARDIAN_RELATIONSHIPS } from "@/lib/schemas/student";
import { submitBookingAction } from "./actions";

type BookingFormProps = {
  locations: { id: string; name: string }[];
  disciplines: { id: string; name: string }[];
  sessions: BookableSession[];
};

function formatDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function BookingForm({
  locations,
  disciplines,
  sessions,
}: BookingFormProps) {
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
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="booking-for">Who is this trial for? *</Label>
        <Select
          name="bookingFor"
          defaultValue="adult"
          onValueChange={(value) => setBookingFor(value as "adult" | "child")}
        >
          <SelectTrigger id="booking-for">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adult">Myself (adult)</SelectItem>
            <SelectItem value="child">My child</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">
            {forChild ? "Child's first name" : "First name"} *
          </Label>
          <Input id="firstName" name="firstName" required maxLength={60} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">
            {forChild ? "Child's last name" : "Last name"} *
          </Label>
          <Input id="lastName" name="lastName" required maxLength={60} />
        </div>
      </div>

      {forChild ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="guardianName">Guardian name (you)</Label>
            <Input id="guardianName" name="guardianName" maxLength={60} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guardianRelationship">Relationship to child</Label>
            <select
              id="guardianRelationship"
              name="guardianRelationship"
              defaultValue=""
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">Prefer not to say</option>
              {GUARDIAN_RELATIONSHIPS.map((relationship) => (
                <option key={relationship} value={relationship}>
                  {relationship}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="booking-email">
          {forChild ? "Guardian email" : "Email"}
        </Label>
        <Input id="booking-email" name="email" type="email" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="booking-phone">
          {forChild ? "Guardian phone" : "Phone"}
        </Label>
        <Input id="booking-phone" name="phone" type="tel" maxLength={40} />
      </div>
      <p className="text-muted-foreground text-xs">
        {forChild
          ? "Children don't need their own contact — we'll keep these as the guardian's details and reach you on them."
          : "Please leave either an email or a phone number so we can confirm your spot."}
      </p>

      <div className="grid gap-2">
        <Label htmlFor="booking-location">Location *</Label>
        <Select name="locationId" required onValueChange={setLocationId}>
          <SelectTrigger id="booking-location">
            <SelectValue placeholder="Choose a location" />
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
        <Label htmlFor="booking-discipline">Martial art *</Label>
        <Select name="disciplineId" required onValueChange={setDisciplineId}>
          <SelectTrigger id="booking-discipline">
            <SelectValue placeholder="Choose a martial art" />
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
        <Label htmlFor="booking-session">Preferred class</Label>
        <Select name="session" defaultValue="">
          <SelectTrigger id="booking-session">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No preference</SelectItem>
            {matchingSessions.map((session) => (
              <SelectItem
                key={session.id}
                value={`${session.id}|${session.courseName}|${session.date}|${session.startTime}`}
                disabled={session.full}
              >
                {session.courseName} — {formatDateLabel(session.date)} at{" "}
                {session.startTime}
                {session.full ? " (full)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Optional — we will confirm your spot by email or phone.
        </p>
      </div>

      <Button type="submit" size="lg">
        Book my free trial
      </Button>
    </form>
  );
}
