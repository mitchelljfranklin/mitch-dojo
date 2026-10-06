import {
  runScheduledJobs,
  type ScheduledJobsResult,
} from "@/lib/cron/run-jobs";
import { getCronSettings } from "@/lib/settings";

// How often the internal scheduler fires. Matches the documented external
// cron cadence; jobs are idempotent so a missed or repeated tick is safe.
const SCHEDULER_TICK_MS = 5 * 60 * 1000;

// In-process lock shared by the scheduler tick and the /api/cron/run route
// (same Node process), so the two triggers can never execute jobs
// concurrently. Multi-instance deployments must enable the scheduler on
// only one instance.
let isRunInProgress = false;

export type ScheduledRunResult = ScheduledJobsResult | null;

// Runs all scheduled jobs unless a run is already executing in this
// process. Returns null when skipped because another run holds the lock.
export async function runScheduledJobsOnce(): Promise<ScheduledRunResult> {
  if (isRunInProgress) return null;
  isRunInProgress = true;
  try {
    return await runScheduledJobs();
  } finally {
    isRunInProgress = false;
  }
}

function summariseRun(result: ScheduledJobsResult): string {
  const parts: string[] = [];
  const add = (label: string, value: number | undefined) => {
    if (value !== undefined && value > 0) parts.push(`${label}=${value}`);
  };
  add("auditPruned", result.prunedAudit);
  add("resetTokensPruned", result.prunedResetTokens);
  add("portalTokensPruned", result.prunedPortalTokens);
  add("emailsPruned", result.prunedEmails);
  add("filesPruned", result.prunedFiles);
  add("sessionsGenerated", result.generatedSessions);
  add("invoicesGenerated", result.generatedInvoices);
  add("invoicesSkipped", result.skippedInvoices);
  add("holdsResumed", result.resumedEnrollments);
  add("classReminders", result.classRemindersSent);
  add("paymentReminders", result.paymentRemindersSent);
  add("birthdayEmails", result.birthdayEmailsSent);
  add("trialFollowUps", result.trialFollowUpsSent);
  add("agreementReminders", result.agreementRemindersSent);
  add("verificationReminders", result.verificationRemindersSent);
  add("campaignEmails", result.campaignsSent);
  return parts.length > 0 ? parts.join(" ") : "no work";
}

async function tick(): Promise<void> {
  try {
    const cronSettings = await getCronSettings();
    if (!cronSettings.internalSchedulerEnabled) return;

    const result = await runScheduledJobsOnce();
    if (!result) return;

    console.log(`[scheduler] run complete: ${summariseRun(result)}`);
  } catch (error) {
    // Expected during startup when the database is not reachable yet
    // (docker compose starts Postgres in parallel); retried next tick.
    console.error(
      "[scheduler] tick failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

declare global {
  var __mitchDojoSchedulerTimer: ReturnType<typeof setInterval> | undefined;
}

export function startScheduler(options?: { tickMs?: number }): void {
  if (globalThis.__mitchDojoSchedulerTimer) return;
  globalThis.__mitchDojoSchedulerTimer = setInterval(
    () => void tick(),
    options?.tickMs ?? SCHEDULER_TICK_MS,
  );
  // Run once at boot so a restart doesn't wait a full interval before the
  // first pass (reminders, invoices, session generation). Disable with
  // SCHEDULER_RUN_ON_BOOT=false (used by the e2e server so tests see a
  // deterministic state).
  if (process.env.SCHEDULER_RUN_ON_BOOT !== "false") {
    void tick();
  }
}

export function stopScheduler(): void {
  if (!globalThis.__mitchDojoSchedulerTimer) return;
  clearInterval(globalThis.__mitchDojoSchedulerTimer);
  globalThis.__mitchDojoSchedulerTimer = undefined;
}
