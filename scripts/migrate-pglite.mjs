import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { assertNoDevServer } from "./pglite-guard.mjs";
import { backupDataDir, findModifiedMigrations } from "./pglite-safety.mjs";

// Applies prisma/migrations/*.sql to an embedded PGlite database.
// Prisma Migrate cannot drive PGlite directly (no TCP server and the
// community adapter does not implement migrate deploy yet), so this runner
// applies the exact same SQL files with a ledger table. The migration files
// stay canonical pure-PostgreSQL DDL shared with the server mode.
//
// Usage: node scripts/migrate-pglite.mjs

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");
const LEDGER_TABLE = "_mitch_dojo_migrations";

function resolveDataDir() {
  if (process.env.DATABASE_DIR) return process.env.DATABASE_DIR;
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    return process.env.DATABASE_URL.slice("file:".length);
  }
  throw new Error(
    "PGlite mode requires DATABASE_DIR (or a file: DATABASE_URL) to be set.",
  );
}

async function main() {
  const { PGlite } = await import("@electric-sql/pglite");

  await assertNoDevServer();

  const dataDir = resolveDataDir();

  // Safety net before touching the database: snapshot the current state so a
  // failed update is recoverable by restoring a folder. No-op on first run.
  const backupPath = await backupDataDir(dataDir, {
    backupDir: process.env.PGLITE_BACKUP_DIR,
  });
  if (backupPath) {
    console.log(`Backed up database to ${backupPath}`);
  }

  // PGlite does not create missing parent directories itself.
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);

  try {
    await client.exec(`
      CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
        migration_name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    if (!existsSync(MIGRATIONS_DIR)) {
      throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    }

    const ledgerRows = (
      await client.query(
        `SELECT migration_name, checksum FROM ${LEDGER_TABLE};`,
      )
    ).rows;
    const applied = new Set(ledgerRows.map((row) => row.migration_name));
    const recordedChecksums = new Map(
      ledgerRows.map((row) => [row.migration_name, row.checksum]),
    );

    const migrationDirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    // Warn when an applied migration file was edited after application.
    // Never block the boot over it — but never do it either (AGENTS.md).
    const currentChecksums = new Map();
    for (const migrationName of migrationDirs) {
      const sqlPath = join(MIGRATIONS_DIR, migrationName, "migration.sql");
      if (existsSync(sqlPath)) {
        const sql = readFileSync(sqlPath, "utf8");
        currentChecksums.set(
          migrationName,
          createHash("sha256").update(sql).digest("hex"),
        );
      }
    }
    const modified = findModifiedMigrations(
      recordedChecksums,
      currentChecksums,
    );
    for (const migrationName of modified) {
      console.warn(
        `WARNING: migration ${migrationName} was modified after it was applied. ` +
          "Never edit an applied migration — add a new one instead.",
      );
    }

    let appliedCount = 0;
    for (const migrationName of migrationDirs) {
      if (applied.has(migrationName)) continue;

      const sqlPath = join(MIGRATIONS_DIR, migrationName, "migration.sql");
      if (!existsSync(sqlPath)) continue;

      const sql = readFileSync(sqlPath, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");

      console.log(`Applying migration ${migrationName}...`);
      await client.transaction(async (tx) => {
        await tx.exec(sql);
        await tx.query(
          `INSERT INTO ${LEDGER_TABLE} (migration_name, checksum) VALUES ($1, $2);`,
          [migrationName, checksum],
        );
      });
      appliedCount++;
    }

    console.log(
      appliedCount === 0
        ? "Database is up to date — no pending migrations."
        : `Applied ${appliedCount} migration(s).`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("PGlite migration failed:", error);
  process.exit(1);
});
