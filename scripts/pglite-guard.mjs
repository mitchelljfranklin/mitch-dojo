// Guard for every command that opens the PGlite data directory
// (migrate-pglite.mjs, the lite branch of the seed). PGlite is
// single-process: a second process opening the same DATABASE_DIR aborts the
// running instance (WASM `Aborted()`) and can corrupt the directory on disk.
// Windows does not enforce an exclusive lock, so we probe for a running dev
// server ourselves and refuse to proceed.
//
// The probe targets /api/health — it exists on every deployment of this app,
// is deliberately DB-free, and any responder on the port means the data
// directory must not be opened. Refusing is always the safe direction.
//
// Plain JavaScript (no TS syntax): migrate-pglite.mjs runs via bare node.

const HEALTH_URL =
  process.env.PGLITE_GUARD_HEALTH_URL ?? "http://localhost:3000/api/health";
const PROBE_TIMEOUT_MS = 1_500;

export async function isPortInUse() {
  try {
    const response = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    // Any response — even a 404/500 from a different app — means the port
    // is occupied and something could be holding the data directory.
    void response;
    return true;
  } catch {
    // Connection refused / timeout → nothing listening on the port.
    return false;
  }
}

export async function assertNoDevServer() {
  if (await isPortInUse()) {
    console.error(
      "\n" +
        "  Refusing to open the PGlite data directory.\n" +
        `  Something is serving ${HEALTH_URL.replace("/api/health", "")} — a running\n` +
        "  dev server may hold this data directory, and a second process\n" +
        "  opening it crashes the server and can corrupt the database.\n" +
        "\n" +
        "  Stop the dev server (Ctrl+C), then run this command again.\n",
    );
    process.exit(1);
  }
}
