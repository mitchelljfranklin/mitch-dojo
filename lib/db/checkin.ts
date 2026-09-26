import { prisma } from "@/lib/prisma";
import { getStudentSuspension } from "@/lib/db/memberships";
import { logSystemAudit, AUDIT_ACTIONS } from "@/lib/db/audit";

// Raw check-in capability token stored per location (like mitch-risk portal
// links): the QR/link needs to embed the token, so it must be retrievable.
// Regenerating invalidates the previous QR/link immediately.
export async function regenerateCheckinToken(
  locationId: string,
): Promise<string> {
  const token = generateToken();
  await prisma.location.update({
    where: { id: locationId },
    data: { checkinToken: token },
  });
  return token;
}

export async function getLocationIdByCheckinToken(
  token: string,
): Promise<string | null> {
  const location = await prisma.location.findUnique({
    where: { checkinToken: token },
    select: { id: true },
  });
  return location?.id ?? null;
}

export async function getCheckinToken(
  locationId: string,
): Promise<string | null> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { checkinToken: true },
  });
  return location?.checkinToken ?? null;
}

function utcMidnightOf(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

export type CheckinSession = {
  id: string;
  courseName: string;
  trainerName: string | null;
  startTime: string;
  endTime: string;
  students: {
    studentId: string;
    name: string;
    checkedIn: boolean;
  }[];
};

// The public check-in page payload: today's scheduled sessions at one
// location, each with its tap-to-check-in roster.
export async function getCheckinPageData(
  locationId: string,
  now: Date = new Date(),
): Promise<{
  locationName: string | null;
  sessions: CheckinSession[];
}> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  });
  if (!location) return { locationName: null, sessions: [] };

  const today = utcMidnightOf(now);

  const sessions = await prisma.classSession.findMany({
    where: { locationId, date: today, status: "SCHEDULED" },
    orderBy: { startTime: "asc" },
    include: {
      course: { select: { name: true, trainer: { select: { name: true } } } },
    },
  });

  const rosterStudents = await prisma.student.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      locations: { some: { locationId } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      sessionId: { in: sessions.map((session) => session.id) },
      status: { in: ["PRESENT", "LATE"] },
    },
    select: { sessionId: true, studentId: true },
  });
  const checkedInKeys = new Set(
    attendanceRows.map((row) => `${row.sessionId}|${row.studentId}`),
  );

  return {
    locationName: location.name,
    sessions: sessions.map((session) => ({
      id: session.id,
      courseName: session.course.name,
      trainerName: session.course.trainer?.name ?? null,
      startTime: session.startTime,
      endTime: session.endTime,
      students: rosterStudents.map((student) => ({
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        checkedIn: checkedInKeys.has(`${session.id}|${student.id}`),
      })),
    })),
  };
}

// Public check-in: records a PRESENT for one roster student on one of the
// location's sessions. Callers must have validated the token; this re-checks
// the session/student against the location before writing.
export async function checkInStudent(
  locationId: string,
  sessionId: string,
  studentId: string,
): Promise<"ok" | "not_found" | "suspended"> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { locationId: true, status: true, date: true },
  });
  if (!session || session.locationId !== locationId) return "not_found";
  // A cancelled session isn't held — refuse a stale form or crafted POST.
  if (session.status !== "SCHEDULED") return "not_found";

  const today = utcMidnightOf(new Date());
  if (session.date.getTime() !== today.getTime()) return "not_found";

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      status: { in: ["ACTIVE", "TRIAL"] },
      locations: { some: { locationId } },
    },
    select: { id: true },
  });
  if (!student) return "not_found";

  // Overdue memberships block self-service check-in (Settings → Memberships
  // sets the threshold; 0 disables). Staff can still mark attendance manually.
  const suspension = await getStudentSuspension(studentId);
  if (suspension.suspended) return "suspended";

  await prisma.attendance.upsert({
    where: {
      sessionId_studentId: { sessionId, studentId },
    },
    update: { status: "PRESENT", source: "CHECKIN", markedAt: new Date() },
    create: {
      sessionId,
      studentId,
      status: "PRESENT",
      source: "CHECKIN",
    },
  });

  // Anonymous public writes are auditable like the booking path.
  await logSystemAudit(
    AUDIT_ACTIONS.UPDATE_ATTENDANCE,
    "ClassSession",
    sessionId,
    { studentId, source: "CHECKIN" },
  );

  return "ok";
}

// URL-safe 32-byte token, same entropy class as the auth tokens.
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
