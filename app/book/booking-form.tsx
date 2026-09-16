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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name *</Label>
          <Input id="firstName" name="firstName" required maxLength={60} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name *</Label>
          <Input id="lastName" name="lastName" required maxLength={60} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="booking-email">Email</Label>
        <Input id="booking-email" name="email" type="email" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="booking-phone">Phone</Label>
        <Input id="booking-phone" name="phone" type="tel" maxLength={40} />
      </div>
      <p className="text-muted-foreground text-xs">
        Please leave either an email or a phone number so we can confirm your
        spot.
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
                value={`${session.courseName}|${session.date}`}
              >
                {session.courseName} — {formatDateLabel(session.date)} at{" "}
                {session.startTime}
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
