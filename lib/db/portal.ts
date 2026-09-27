import { prisma } from "@/lib/prisma";
import { expiryFromNow, generateAccessToken, hashToken } from "@/lib/tokens";
import {
  TRAINED_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/schemas/attendance";

// Member portal (Phase 10): magic-link tokens and the read-only data the
// member sees. Staff trigger link delivery from the student record; the
// raw token travels by email and is exchanged for an httpOnly cookie.

const PORTAL_TOKEN_TTL_DAYS = 30;

// --------------- tokens ---------------

export type PortalLinkResult =
  | { outcome: "sent"; recipient: string; expiresAt: Date; url: string }
  | { outcome: "no_recipient" };

export async function createPortalLink(
  studentId: string,
  appUrl: string,
  now: Date = new Date(),
): Promise<PortalLinkResult> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { email: true, guardianEmail: true },
  });
  if (!student) throw new Error("Student not found.");

  const recipient =
    student.email?.trim() || student.guardianEmail?.trim() || null;
  if (!recipient) {
    return { outcome: "no_recipient" };
  }

  const rawToken = generateAccessToken();
  const expiresAt = expiryFromNow(PORTAL_TOKEN_TTL_DAYS, now);
  await prisma.portalToken.create({
    data: {
      studentId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  return {
    outcome: "sent",
    recipient,
    expiresAt,
    // The raw token only exists here — it travels in the email link.
    url: `${appUrl}/portal/welcome?token=${encodeURIComponent(rawToken)}`,
  };
}

export async function verifyPortalToken(
  rawToken: string,
  now: Date = new Date(),
): Promise<string | null> {
  if (!rawToken) return null;
  const record = await prisma.portalToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { studentId: true, expiresAt: true },
  });
  if (!record || record.expiresAt < now) return null;
  return record.studentId;
}

// --------------- household tokens ---------------

export type PortalAccess = {
  studentId: string | null;
  householdId: string | null;
};

// A portal token may target a single student or a whole household.
export async function resolvePortalToken(
  rawToken: string,
  now: Date = new Date(),
): Promise<PortalAccess | null> {
  if (!rawToken) return null;
  const record = await prisma.portalToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: { studentId: true, householdId: true, expiresAt: true },
  });
  if (!record || record.expiresAt < now) return null;
  return { studentId: record.studentId, householdId: record.householdId };
}

export async function createHouseholdPortalLink(
  householdId: string,
  appUrl: string,
  now: Date = new Date(),
): Promise<PortalLinkResult> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: {
      contactEmail: true,
      students: { select: { email: true, guardianEmail: true } },
    },
  });
  if (!household) throw new Error("Household not found.");

  const recipient =
    household.contactEmail?.trim() ||
    household.students
      .map((student) => student.email?.trim() || student.guardianEmail?.trim())
      .find((email): email is string => Boolean(email)) ||
    null;
  if (!recipient) {
    return { outcome: "no_recipient" };
  }

  const rawToken = generateAccessToken();
  const expiresAt = expiryFromNow(PORTAL_TOKEN_TTL_DAYS, now);
  await prisma.portalToken.create({
    data: { householdId, tokenHash: hashToken(rawToken), expiresAt },
  });

  return {
    outcome: "sent",
    recipient,
    expiresAt,
    url: `${appUrl}/portal/welcome?token=${encodeURIComponent(rawToken)}`,
  };
}

export async function getHouseholdPortalChildren(householdId: string) {
  return prisma.student.findMany({
    where: { householdId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });
}

// True when the token grants access to this student — either a direct student
// token, or a household token whose household contains the student.
export async function portalHasStudent(
  rawToken: string,
  studentId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const access = await resolvePortalToken(rawToken, now);
  if (!access) return false;
  if (access.studentId) return access.studentId === studentId;
  if (access.householdId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, householdId: access.householdId },
      select: { id: true },
    });
    return Boolean(student);
  }
  return false;
}

// --------------- portal self-service ---------------

export type PortalContact = {
  studentId: string;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  emailOptOut: boolean;
};

export async function getPortalContact(
  studentId: string,
): Promise<PortalContact | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      phone: true,
      addressLine: true,
      city: true,
      state: true,
      postcode: true,
      country: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      guardianName: true,
      guardianEmail: true,
      guardianPhone: true,
      guardianRelationship: true,
      emailOptOut: true,
    },
  });
  if (!student) return null;
  return { studentId: student.id, ...student };
}

// Writes only the member-editable contact fields; identity/medical/status are
// untouched even if a crafted submission includes them.
export async function updatePortalContact(
  studentId: string,
  input: {
    email: string | null;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    guardianName: string | null;
    guardianEmail: string | null;
    guardianPhone: string | null;
    guardianRelationship: string | null;
  },
): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: {
      email: input.email,
      phone: input.phone,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state,
      postcode: input.postcode,
      country: input.country,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      guardianName: input.guardianName,
      guardianEmail: input.guardianEmail,
      guardianPhone: input.guardianPhone,
      guardianRelationship: input.guardianRelationship,
    },
  });
}

export async function updatePortalEmailPreference(
  studentId: string,
  emailOptOut: boolean,
): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: { emailOptOut },
  });
}

// --------------- portal data ---------------

export type PortalStudent = NonNullable<
  Awaited<ReturnType<typeof getPortalStudent>>
>;

export async function getPortalStudent(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      email: true,
      phone: true,
      joinedAt: true,
      locations: { include: { location: { select: { name: true } } } },
      disciplines: { include: { discipline: { select: { name: true } } } },
      belts: {
        orderBy: { awardedAt: "desc" },
        select: {
          id: true,
          beltName: true,
          colorHex: true,
          awardedAt: true,
          // Used to keep one "current" belt per discipline (a member training
          // several arts has a latest award in each).
          beltRangeEntry: { select: { disciplineId: true } },
        },
      },
    },
  });
}

export type PortalUpcomingSession = {
  id: string;
  courseName: string;
  locationName: string;
  date: Date;
  startTime: string;
  endTime: string;
  trainerName: string | null;
};

// Upcoming scheduled sessions at the member's locations for their
// disciplines — the same audience rule the class reminders use.
export async function getPortalUpcomingSessions(
  studentId: string,
  now: Date = new Date(),
): Promise<PortalUpcomingSession[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      locations: { select: { locationId: true } },
      disciplines: { select: { disciplineId: true } },
    },
  });
  if (!student) return [];

  const locationIds = student.locations.map((link) => link.locationId);
  const disciplineIds = student.disciplines.map((link) => link.disciplineId);
  if (locationIds.length === 0 || disciplineIds.length === 0) return [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 14);

  const sessions = await prisma.classSession.findMany({
    where: {
      status: "SCHEDULED",
      date: { gte: today, lte: horizon },
      locationId: { in: locationIds },
      course: { isActive: true, disciplineId: { in: disciplineIds } },
    },
    include: {
      course: { select: { name: true, trainer: { select: { name: true } } } },
      location: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 50,
  });

  return sessions.map((session) => ({
    id: session.id,
    courseName: session.course.name,
    locationName: session.location.name,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    trainerName: session.course.trainer?.name ?? null,
  }));
}

export async function getPortalAttendance(studentId: string) {
  const [recent, total] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId,
        status: { in: TRAINED_STATUSES as unknown as AttendanceStatusValue[] },
      },
      orderBy: { session: { date: "desc" } },
      take: 10,
      select: {
        status: true,
        session: {
          select: {
            date: true,
            course: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendance.count({
      where: {
        studentId,
        status: { in: TRAINED_STATUSES as unknown as AttendanceStatusValue[] },
      },
    }),
  ]);

  return {
    total,
    recent: recent.map((row) => ({
      status: row.status as string,
      date: row.session.date,
      courseName: row.session.course.name,
      locationName: row.session.location.name,
    })),
  };
}

export type PortalInvoice = {
  id: string;
  number: number;
  status: string;
  issueDate: Date;
  dueDate: Date;
  totalCents: number;
  paidCents: number;
};

export async function getPortalInvoices(studentId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { studentId, status: { not: "VOID" } },
    include: {
      items: { select: { quantity: true, unitPriceCents: true } },
      payments: { select: { amountCents: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const rows: PortalInvoice[] = invoices.map((invoice) => {
    const subtotalCents = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );
    const totalCents = subtotalCents + invoice.taxCents;
    const paidCents = invoice.payments.reduce(
      (sum, payment) => sum + payment.amountCents,
      0,
    );
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalCents,
      paidCents,
    };
  });

  const outstandingCents = rows.reduce(
    (sum, row) => sum + (row.totalCents - row.paidCents),
    0,
  );
  return { rows, outstandingCents };
}
