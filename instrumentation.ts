export async function register() {
  // Only the Node.js runtime hosts the scheduler, and never during
  // `next build` (instrumentation is evaluated there too).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Grant any newly added permission keys to the seeded system roles so an
  // upgraded image works without a manual reseed. Non-fatal: the DB may not
  // be reachable yet (the container entrypoint migrates before serving).
  try {
    const { convergeSystemRolePermissions } = await import("@/lib/db/roles");
    await convergeSystemRolePermissions();
  } catch (error: unknown) {
    console.error(
      "[boot] system role permission convergence failed:",
      error instanceof Error ? error.message : String(error),
    );
  }

  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
