import { prisma } from "@/lib/prisma";
import { sendBulkEmail } from "@/lib/email/mailer";
import { computeInvoiceFinancials, startOfToday } from "@/lib/db/memberships";

export type CampaignAudienceType =
  "ALL" | "LOCATION" | "DISCIPLINE" | "COURSE" | "OVERDUE";

export type CampaignRecipient = { studentId: string; email: string };

export const CAMPAIGN_AUDIENCE_LABELS: Record<CampaignAudienceType, string> = {
  ALL: "All active members",
  LOCATION: "Members at a location",
  DISCIPLINE: "Members training a discipline",
  COURSE: "Members in a course",
  OVERDUE: "Members with an overdue balance",
};

async function resolveRecipients(
  audienceType: CampaignAudienceType,
  audienceRefId: string | null,
): Promise<{ recipients: CampaignRecipient[]; label: string }> {
  let label = CAMPAIGN_AUDIENCE_LABELS[audienceType];
  let students: {
    id: string;
    email: string | null;
    guardianEmail: string | null;
    emailOptOut: boolean;
  }[] = [];

  if (audienceType === "ALL") {
    students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        email: true,
        guardianEmail: true,
        emailOptOut: true,
      },
    });
  } else if (audienceType === "LOCATION" && audienceRefId) {
    const location = await prisma.location.findUnique({
      where: { id: audienceRefId },
      select: { name: true },
    });
    label = `Members at ${location?.name ?? "a location"}`;
    students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        locations: { some: { locationId: audienceRefId } },
      },
      select: {
        id: true,
        email: true,
        guardianEmail: true,
        emailOptOut: true,
      },
    });
  } else if (audienceType === "DISCIPLINE" && audienceRefId) {
    const discipline = await prisma.discipline.findUnique({
      where: { id: audienceRefId },
      select: { name: true },
    });
    label = `${discipline?.name ?? "A discipline"} members`;
    students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        disciplines: { some: { disciplineId: audienceRefId } },
      },
      select: {
        id: true,
        email: true,
        guardianEmail: true,
        emailOptOut: true,
      },
    });
  } else if (audienceType === "COURSE" && audienceRefId) {
    const course = await prisma.course.findUnique({
      where: { id: audienceRefId },
      select: { name: true, locationId: true, disciplineId: true },
    });
    if (course) {
      label = `${course.name} members`;
      students = await prisma.student.findMany({
        where: {
          status: "ACTIVE",
          locations: { some: { locationId: course.locationId } },
          disciplines: { some: { disciplineId: course.disciplineId } },
        },
        select: {
          id: true,
          email: true,
          guardianEmail: true,
          emailOptOut: true,
        },
      });
    }
  } else if (audienceType === "OVERDUE") {
    label = "Members with an overdue balance";
    const invoices = await prisma.invoice.findMany({
      where: { status: "OPEN", dueDate: { lt: startOfToday() } },
      select: {
        studentId: true,
        taxCents: true,
        items: { select: { quantity: true, unitPriceCents: true } },
        payments: { select: { amountCents: true } },
        student: {
          select: {
            email: true,
            guardianEmail: true,
            emailOptOut: true,
          },
        },
      },
    });
    const seen = new Set<string>();
    const overdue: {
      id: string;
      email: string | null;
      guardianEmail: string | null;
      emailOptOut: boolean;
    }[] = [];
    for (const invoice of invoices) {
      if (seen.has(invoice.studentId)) continue;
      if (computeInvoiceFinancials(invoice).balanceCents <= 0) continue;
      seen.add(invoice.studentId);
      overdue.push({
        id: invoice.studentId,
        email: invoice.student.email,
        guardianEmail: invoice.student.guardianEmail,
        emailOptOut: invoice.student.emailOptOut,
      });
    }
    students = overdue;
  }

  // Student → guardian email fallback, deduped by address. Members who paused
  // non-essential email are skipped (campaigns are marketing).
  const byEmail = new Map<string, CampaignRecipient>();
  for (const student of students) {
    if (student.emailOptOut) continue;
    const email = (
      student.email?.trim() ||
      student.guardianEmail?.trim() ||
      ""
    ).toLowerCase();
    if (!email || byEmail.has(email)) continue;
    byEmail.set(email, { studentId: student.id, email });
  }

  return { recipients: [...byEmail.values()], label };
}

export async function createCampaign(input: {
  subject: string;
  body: string;
  audienceType: CampaignAudienceType;
  audienceRefId: string | null;
  createdById: string | null;
}): Promise<{ id: string; recipientCount: number; label: string }> {
  const { recipients, label } = await resolveRecipients(
    input.audienceType,
    input.audienceRefId,
  );

  const campaign = await prisma.emailCampaign.create({
    data: {
      subject: input.subject,
      body: input.body,
      audienceType: input.audienceType,
      audienceRefId: input.audienceRefId,
      audienceLabel: label,
      recipients,
      recipientCount: recipients.length,
      status: "QUEUED",
      createdById: input.createdById,
    },
    select: { id: true },
  });

  return { id: campaign.id, recipientCount: recipients.length, label };
}

export type CampaignRow = {
  id: string;
  subject: string;
  audienceLabel: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
};

export async function listCampaigns(limit = 50): Promise<CampaignRow[]> {
  return prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      subject: true,
      audienceLabel: true,
      recipientCount: true,
      sentCount: true,
      failedCount: true,
      status: true,
      createdAt: true,
      sentAt: true,
    },
  });
}

// Sends the next batch of queued campaigns. Idempotent: each recipient has a
// dedup key, so a replayed tick (or a crash that didn't persist sentCount)
// never double-sends. Drained by the scheduler to avoid request timeouts.
export async function processCampaigns(batchSize = 25): Promise<number> {
  let totalSent = 0;

  for (;;) {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { status: { in: ["QUEUED", "SENDING"] } },
      orderBy: { createdAt: "asc" },
    });
    if (!campaign) break;

    const recipients = campaign.recipients as CampaignRecipient[];
    const slice = recipients.slice(
      campaign.sentCount,
      campaign.sentCount + batchSize,
    );

    if (slice.length === 0) {
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "SENT", sentAt: campaign.sentAt ?? new Date() },
      });
      break;
    }

    let sent = 0;
    let failed = 0;
    for (const recipient of slice) {
      const assessmentId = `campaign:${campaign.id}:${recipient.email}`;
      const already = await prisma.notificationLog.findFirst({
        where: { assessmentId },
        select: { id: true },
      });
      if (already) {
        sent++;
        continue;
      }
      const result = await sendBulkEmail(
        recipient.email,
        campaign.subject,
        campaign.body,
        {
          assessmentId,
          sentById: campaign.createdById ?? undefined,
        },
      );
      if (result.ok) sent++;
      else failed++;
    }

    const nextSent = campaign.sentCount + sent;
    const nextFailed = campaign.failedCount + failed;
    const done = nextSent + nextFailed >= recipients.length;
    totalSent += sent;

    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        sentCount: nextSent,
        failedCount: nextFailed,
        status: done ? "SENT" : "SENDING",
        sentAt: done ? new Date() : null,
      },
    });

    // One campaign per tick keeps each run bounded; the next tick continues.
    break;
  }

  return totalSent;
}
