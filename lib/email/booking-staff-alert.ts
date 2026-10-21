import { sendEmail } from "@/lib/email/mailer";
import {
  getCommunicationsSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { formatClassTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

// One branded alert per staff recipient when a public /book submission
// creates a trial. Best-effort: sendEmail already logs failures to the
// email log, and a delivery problem must never fail the booking itself.
// Deduped per booking via assessmentId, matching the prospect confirmation.
export async function sendBookingStaffAlert(booking: {
  studentId: string;
  firstName: string;
  lastName: string;
  bookingFor: "adult" | "child";
  guardianName: string | null;
  email: string | null;
  phone: string | null;
  sessionCourseName: string | null;
  sessionDate: string | null;
  sessionStartTime: string | null;
}): Promise<void> {
  const [communications, organization] = await Promise.all([
    getCommunicationsSettings(),
    getOrganizationSettings(),
  ]);
  if (!communications.bookingStaffAlertsEnabled) return;
  if (communications.bookingStaffAlertRecipients.length === 0) return;

  const translate = await getTranslations({
    locale: organization.defaultLocale,
    namespace: "Email",
  });

  const contact =
    [booking.email, booking.phone].filter(Boolean).join(" / ") ||
    translate("bookingStaff.contactNotProvided");
  const bookingFor =
    booking.bookingFor === "child"
      ? booking.guardianName
        ? translate("bookingStaff.childWithGuardian", {
            guardian: booking.guardianName,
          })
        : translate("bookingStaff.child")
      : translate("bookingStaff.adult");
  const studentName = `${booking.firstName} ${booking.lastName}`.trim();
  const classTime =
    formatClassTime(
      booking.sessionDate,
      booking.sessionStartTime,
      translate("at"),
      organization.defaultLocale,
    ) ?? translate("bookingStaff.noPreference");

  for (const recipient of communications.bookingStaffAlertRecipients) {
    try {
      await sendEmail(
        recipient,
        "bookingStaff",
        {
          appName: organization.name,
          studentName,
          bookingFor,
          contact,
          className:
            booking.sessionCourseName || translate("bookingStaff.noPreference"),
          classTime,
        },
        { assessmentId: `booking-staff:${booking.studentId}` },
      );
    } catch (error: unknown) {
      // The email log holds any failure for staff; the booking stands.
      console.error(
        "[booking] staff alert failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
