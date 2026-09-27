import { prisma } from "@/lib/prisma";
import { getDisciplineProgress, recordPromotion } from "@/lib/db/belts";
import { sendEmail } from "@/lib/email/mailer";
import { getOrganizationSettings } from "@/lib/settings";

// A grading day: the eligible students are snapshotted at creation with their
// next belt as the target, then outcomes are recorded (which award the belt).

export async function createGradingEvent(input: {
  disciplineId: string;
  name: string;
  date: Date;
  locationId: string | null;
  notes: string | null;
  createdById: string | null;
}): Promise<{ id: string; studentCount: number }> {
  const { rows, belts } = await getDisciplineProgress(input.disciplineId);
  const eligible = rows.filter((row) => row.isEligible && row.nextBeltName);

  const event = await prisma.gradingEvent.create({
    data: {
      disciplineId: input.disciplineId,
      name: input.name,
      date: input.date,
      locationId: input.locationId,
      notes: input.notes,
      createdById: input.createdById,
      students: {
        create: eligible.map((row) => ({
          studentId: row.studentId,
          targetBeltRangeEntryId:
            belts.find((belt) => belt.name === row.nextBeltName)?.id ?? null,
        })),
      },
    },
    select: { id: true },
  });

  return { id: event.id, studentCount: eligible.length };
}

export type GradingEventListRow = {
  id: string;
  name: string;
  date: Date;
  status: string;
  locationName: string | null;
  studentCount: number;
  promotedCount: number;
};

export async function listGradingEvents(
  disciplineId: string,
): Promise<GradingEventListRow[]> {
  const events = await prisma.gradingEvent.findMany({
    where: { disciplineId },
    orderBy: { date: "desc" },
    include: {
      location: { select: { name: true } },
      students: { select: { outcome: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date,
    status: event.status,
    locationName: event.location?.name ?? null,
    studentCount: event.students.length,
    promotedCount: event.students.filter(
      (student) => student.outcome === "PROMOTED",
    ).length,
  }));
}

export async function getGradingEvent(eventId: string) {
  return prisma.gradingEvent.findUnique({
    where: { id: eventId },
    include: {
      discipline: { select: { id: true, name: true } },
      location: { select: { name: true } },
      students: {
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              guardianEmail: true,
              email: true,
            },
          },
          targetBeltRangeEntry: { select: { name: true } },
        },
      },
    },
  });
}

export async function setGradingOutcome(
  eventId: string,
  studentId: string,
  outcome: "PENDING" | "PROMOTED" | "ABSENT",
  actorId: string | null,
): Promise<void> {
  const row = await prisma.gradingEventStudent.findUnique({
    where: { eventId_studentId: { eventId, studentId } },
    include: { event: { select: { date: true, name: true } } },
  });
  if (!row) throw new Error("That student is not on this grading event.");

  // Award the belt once, the first time the outcome is set to PROMOTED.
  if (outcome === "PROMOTED" && row.outcome !== "PROMOTED") {
    if (!row.targetBeltRangeEntryId) {
      throw new Error("This student has no target belt on the event.");
    }
    await recordPromotion({
      studentId,
      beltRangeEntryId: row.targetBeltRangeEntryId,
      awardedAt: row.event.date,
      notes: `Grading event: ${row.event.name}`,
      awardedById: actorId,
    });
  }

  await prisma.gradingEventStudent.update({
    where: { eventId_studentId: { eventId, studentId } },
    data: { outcome },
  });
}

export async function closeGradingEvent(eventId: string): Promise<void> {
  await prisma.gradingEvent.update({
    where: { id: eventId },
    data: { status: "CLOSED" },
  });
}

// Emails the guardians of every still-pending invitee, once per student.
export async function sendGradingInvites(eventId: string): Promise<number> {
  const event = await prisma.gradingEvent.findUnique({
    where: { id: eventId },
    include: {
      discipline: { select: { name: true } },
      students: {
        where: { outcome: "PENDING" },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              guardianEmail: true,
            },
          },
        },
      },
    },
  });
  if (!event) throw new Error("Grading event not found.");

  const { name: appName } = await getOrganizationSettings();
  const eventDate = event.date.toISOString().slice(0, 10);
  let sent = 0;

  for (const row of event.students) {
    const recipient =
      row.student.email?.trim() || row.student.guardianEmail?.trim();
    if (!recipient) continue;
    const result = await sendEmail(
      recipient,
      "gradingInvite",
      {
        appName,
        studentName: `${row.student.firstName} ${row.student.lastName}`,
        disciplineName: event.discipline.name,
        eventName: event.name,
        eventDate,
      },
      { assessmentId: `grading-invite:${eventId}:${row.student.id}` },
    );
    if (result.ok) sent++;
  }

  return sent;
}
