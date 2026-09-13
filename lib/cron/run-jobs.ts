import { prisma } from "@/lib/prisma";
import { getAuditRetention, getEmailLogRetention } from "@/lib/settings";
import { storage } from "@/lib/storage";
import { findOrphanFileKeys } from "@/lib/storage/orphan-sweep";

export type ScheduledJobsResult = {
  prunedAudit?: number;
  prunedResetTokens?: number;
  prunedEmails?: number;
  prunedFiles?: number;
  prunedFileKeys?: string[];
};

// Runs every scheduled job once: log pruning and the orphaned-file sweep.
// Phase 0 jobs are all idempotent housekeeping — calling this more often
// than needed is always safe. Domain jobs (class reminders, payment
// follow-ups, birthday emails) are added in their own phases.
export async function runScheduledJobs(
  clockNow: Date = new Date(),
): Promise<ScheduledJobsResult> {
  const now = clockNow;
  const result: ScheduledJobsResult = {};

  // --- audit log pruning ---
  const retentionDays = await getAuditRetention();
  if (retentionDays > 0) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const { count } = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      result.prunedAudit = count;
    }
  }

  // --- consumed/expired password reset token pruning ---
  const resetCutoff = new Date(now);
  resetCutoff.setDate(resetCutoff.getDate() - 7);
  const { count: prunedResetTokens } =
    await prisma.passwordResetToken.deleteMany({
      where: { createdAt: { lt: resetCutoff } },
    });
  if (prunedResetTokens > 0) {
    result.prunedResetTokens = prunedResetTokens;
  }

  // --- email log pruning ---
  const emailLogRetentionDays = await getEmailLogRetention();
  if (emailLogRetentionDays > 0) {
    const emailCutoff = new Date(now);
    emailCutoff.setDate(emailCutoff.getDate() - emailLogRetentionDays);
    const { count: prunedEmails } = await prisma.notificationLog.deleteMany({
      where: { sentAt: { lt: emailCutoff } },
    });
    if (prunedEmails > 0) {
      result.prunedEmails = prunedEmails;
    }
  }

  // --- orphaned file sweep ---
  // Every storage writer must be reflected here (AGENTS.md storage-writer
  // rule). Phase 0 writers: the brand logo (appearance.logoKey).
  const [storedFiles, appearance] = await Promise.all([
    storage.list(),
    prisma.appSetting.findUnique({ where: { key: "appearance.logoKey" } }),
  ]);
  const referencedKeys = new Set<string>();
  const logoKey = appearance?.value;
  if (typeof logoKey === "string" && logoKey.length > 0) {
    referencedKeys.add(logoKey);
  }
  const orphanKeys = findOrphanFileKeys({ storedFiles, referencedKeys, now });
  const deletedFileKeys: string[] = [];
  for (const key of orphanKeys) {
    try {
      await storage.delete(key);
      deletedFileKeys.push(key);
    } catch {
      // Best-effort; will be retried on the next run.
    }
  }
  if (deletedFileKeys.length > 0) {
    result.prunedFiles = deletedFileKeys.length;
    result.prunedFileKeys = deletedFileKeys;
    // Attributability: log every removal with its key so incidents can be
    // reconstructed from server logs alone.
    console.log(
      `[cron] orphan sweep removed ${deletedFileKeys.length} file(s): ${deletedFileKeys.join(", ")}`,
    );
  }

  await prisma.appSetting.upsert({
    where: { key: "cron.lastRun" },
    update: { value: now.toISOString() },
    create: { key: "cron.lastRun", value: now.toISOString(), category: "cron" },
  });

  return result;
}
