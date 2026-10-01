"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { createTrialBooking } from "@/lib/db/trials";
import { logSystemAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { formatClassTime } from "@/lib/utils";

const BOOKINGS_PER_HOUR = 5;

const bookingFormSchema = z.object({
  // Who the trial is for: an adult (the person booking) or a child. In child
  // mode the contact details are the guardian's — stored on both the child
  // and the guardian fields so reminders and portal links reach the family.
  bookingFor: z.enum(["adult", "child"]).default("adult"),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  guardianName: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => value ?? ""),
  guardianRelationship: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => value ?? ""),
  email: z
    .union([z.literal(""), z.email()])
    .optional()
    .transform((value) => value ?? ""),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value ?? ""),
  locationId: z.string().min(1),
  disciplineId: z.string().min(1),
  session: z.string().optional().default(""),
  // Honeypot: humans never see or fill this field.
  website: z.string().max(0).optional().default(""),
});

// Public booking submission (no auth). Plain form action: on success we
// redirect to the same page with ?booked=1 (FlashToast pattern for
// post-redirect feedback); failures redirect with an error code.
export async function submitBookingAction(formData: FormData): Promise<void> {
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  if (!rateLimit("booking", clientIp, BOOKINGS_PER_HOUR)) {
    redirect("/book?error=rate");
  }

  const parsed = bookingFormSchema.safeParse({
    bookingFor: formData.get("bookingFor") ?? "adult",
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    guardianName: formData.get("guardianName") ?? "",
    guardianRelationship: formData.get("guardianRelationship") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    locationId: formData.get("locationId"),
    disciplineId: formData.get("disciplineId"),
    session: formData.get("session") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success || parsed.data.website.length > 0) {
    redirect("/book?error=invalid");
  }
  if (!parsed.data.email && !parsed.data.phone) {
    redirect("/book?error=contact");
  }

  // session is "<classSessionId>|<courseName>|<date>|<startTime>" chosen from
  // the bookable list; the name/date/time parts are re-displayed only as
  // notes, never executed.
  const [sessionId, sessionCourseName, sessionDate, sessionStartTime] = (
    parsed.data.session ? parsed.data.session.split("|") : ["", "", "", ""]
  ).map((part) => part.trim().slice(0, 120));

  const result = await createTrialBooking({
    bookingFor: parsed.data.bookingFor,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    guardianName:
      parsed.data.bookingFor === "child" ? parsed.data.guardianName : null,
    guardianRelationship:
      parsed.data.bookingFor === "child"
        ? parsed.data.guardianRelationship || null
        : null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    locationId: parsed.data.locationId,
    disciplineId: parsed.data.disciplineId,
    sessionDate: sessionDate || null,
    sessionCourseName: sessionCourseName || null,
    sessionId: sessionId || null,
  }).catch(() => null);
  if (result === null) {
    // Inactive class/discipline or a duplicate race — a friendly error,
    // never an unhandled 500 on a public page.
    redirect("/book?error=invalid");
  }

  if (result.outcome === "full") {
    redirect("/book?error=full");
  }

  if (result.outcome === "duplicate") {
    await logSystemAudit(AUDIT_ACTIONS.WEBSITE_BOOKING, "Student", undefined, {
      outcome: "duplicate",
    });
    redirect("/book?error=exists");
  }

  await logSystemAudit(
    AUDIT_ACTIONS.WEBSITE_BOOKING,
    "Student",
    result.studentId,
    {
      outcome: result.outcome,
    },
  );

  // Booking confirmation to the prospect (toggleable in Admin →
  // Communication). Deduped per booking; sent best-effort — a send failure
  // must never fail the booking itself.
  const [
    { getCommunicationsSettings },
    { sendEmail },
    { getOrganizationSettings },
  ] = await Promise.all([
    import("@/lib/settings"),
    import("@/lib/email/mailer"),
    import("@/lib/settings"),
  ]);
  const [communications, organization] = await Promise.all([
    getCommunicationsSettings(),
    getOrganizationSettings(),
  ]);
  if (communications.bookingConfirmationsEnabled && parsed.data.email) {
    const classTime =
      formatClassTime(sessionDate || null, sessionStartTime || null) ??
      "your chosen class";
    try {
      await sendEmail(
        parsed.data.email,
        "booking",
        {
          appName: organization.name,
          studentName:
            `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
          className: sessionCourseName || "trial class",
          classTime,
        },
        { assessmentId: `booking:${result.studentId}` },
      );
    } catch {
      // The email log holds the failure for staff; the booking stands.
    }
  }

  // Staff alert: one email per configured recipient so a new booking is
  // seen without watching the Trials page. Best-effort, same as above.
  const { sendBookingStaffAlert } =
    await import("@/lib/email/booking-staff-alert");
  await sendBookingStaffAlert({
    studentId: result.studentId,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    bookingFor: parsed.data.bookingFor,
    guardianName:
      parsed.data.bookingFor === "child" ? parsed.data.guardianName : null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    sessionCourseName: sessionCourseName || null,
    sessionDate: sessionDate || null,
    sessionStartTime: sessionStartTime || null,
  });

  redirect("/book?booked=1");
}
