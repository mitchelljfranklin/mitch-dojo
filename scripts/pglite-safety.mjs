// Safety tooling for the embedded PGlite database, used by the migration
// runner (and therefore by the Docker entrypoint on every deployment update).
//
// backupDataDir: before migrations apply, snapshot the data directory and
// keep the last few copies. If an update ever fails midway (power loss, full
// disk), recovery for a non-technical owner is "swap the folder back".
//
// findModifiedMigrations: the ledger stores each applied migration's
// checksum; a file whose checksum no longer matches was edited after being
// applied. Editing shipped migrations is never allowed (add a new migration
// instead) — surfaced here as a warning, not an error, so a stored
// deployment still boots.
//
// Plain JavaScript (no TS syntax): the runner executes via bare node.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_KEEP = 3;

export async function backupDataDir(dataDir, options) {
  const keep = options?.keep ?? DEFAULT_KEEP;
  const backupDir = options?.backupDir ?? `${dataDir}-backups`;
  const clockNow = options?.clockNow ?? new Date();

  // First run: the database does not exist yet, so there is nothing to copy.
  if (!existsSync(dataDir)) {
    return null;
  }

  mkdirSync(backupDir, { recursive: true });
  const stamp = clockNow
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
  const destination = join(backupDir, `pglite-backup-${stamp}`);
  cpSync(dataDir, destination, { recursive: true });

  pruneOldBackups(backupDir, keep);
  return destination;
}

function pruneOldBackups(backupDir, keep) {
  const entries = readdirSync(backupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("pglite-backup-"))
    .sort();
  // Sorted ascending by timestamp: delete everything except the newest N.
  const stale = entries.slice(0, Math.max(0, entries.length - keep));
  for (const name of stale) {
    rmSync(join(backupDir, name), { recursive: true, force: true });
  }
}

// Compares the ledger's recorded checksums against the current migration
// files. Returns the names of applied migrations whose file was modified
// after application — a discipline violation to warn about, never to
// refuse booting over.
export function findModifiedMigrations(appliedEntries, currentChecksums) {
  const modified = [];
  for (const [migrationName, recordedChecksum] of appliedEntries) {
    const currentChecksum = currentChecksums.get(migrationName);
    if (currentChecksum && currentChecksum !== recordedChecksum) {
      modified.push(migrationName);
    }
  }
  return modified;
}
