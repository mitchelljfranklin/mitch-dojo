import { sendEmail } from "@/lib/email/mailer";
import {
  getCommunicationsSettings,
  getOrganizationSettings,
} from "@/lib/settings";
import { formatClassTime } from "@/lib/utils";

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

  const contact =
    [booking.email, booking.phone].filter(Boolean).join(" / ") ||
    "not provided";
  const bookingFor =
    booking.bookingFor === "child"
      ? booking.guardianName
        ? `Child (guardian: ${booking.guardianName})`
        : "Child"
      : "Adult";
  const studentName = `${booking.firstName} ${booking.lastName}`.trim();
  const classTime =
    formatClassTime(booking.sessionDate, booking.sessionStartTime) ??
    "no preference";

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
          className: booking.sessionCourseName || "no preference",
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
