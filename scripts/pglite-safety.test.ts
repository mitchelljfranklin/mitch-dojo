import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  backupDataDir,
  findModifiedMigrations,
} from "../scripts/pglite-safety.mjs";

let workDir: string;

function makeDataDir(name: string): string {
  const dir = join(workDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "PG_VERSION"), "17");
  return dir;
}

function backupNames(backupDir: string): string[] {
  return readdirSync(backupDir).sort();
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "pglite-safety-"));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("backupDataDir", () => {
  it("copies the data directory into a timestamped backup folder", async () => {
    const dataDir = makeDataDir("db");
    const backupDir = join(workDir, "backups-a");

    const destination = await backupDataDir(dataDir, {
      backupDir,
      clockNow: new Date("2026-09-15T10:00:00Z"),
    });

    expect(destination).toContain("pglite-backup-2026-09-15T10-00-00");
    expect(existsSync(join(destination!, "PG_VERSION"))).toBe(true);
  });

  it("returns null when the database does not exist yet", async () => {
    const backupDir = join(workDir, "backups-b");
    const result = await backupDataDir(join(workDir, "missing"), { backupDir });

    expect(result).toBeNull();
    expect(existsSync(backupDir)).toBe(false);
  });

  it("keeps only the newest backups and prunes older ones", async () => {
    const dataDir = makeDataDir("db-rotate");
    const backupDir = join(workDir, "backups-rotate");

    for (let index = 0; index < 5; index++) {
      await backupDataDir(dataDir, {
        backupDir,
        keep: 3,
        clockNow: new Date(Date.UTC(2026, 8, 15, 10, index)),
      });
    }

    const remaining = backupNames(backupDir);
    expect(remaining).toHaveLength(3);
    // Newest three survive (minutes 02, 03, 04).
    expect(remaining[0]).toContain("T10-02");
    expect(remaining[2]).toContain("T10-04");
  });
});

describe("findModifiedMigrations", () => {
  it("reports applied migrations whose file checksum changed", () => {
    const applied = new Map([
      ["20260901_init", "checksum-a"],
      ["20260902_members", "checksum-b"],
    ]);
    const current = new Map([
      ["20260901_init", "checksum-a"],
      // The members migration was edited after application.
      ["20260902_members", "checksum-changed"],
    ]);

    expect(findModifiedMigrations(applied, current)).toEqual([
      "20260902_members",
    ]);
  });

  it("ignores unapplied files and deleted files", () => {
    const applied = new Map([["20260901_init", "checksum-a"]]);
    const current = new Map([
      ["20260901_init", "checksum-a"],
      ["20260902_new", "checksum-new"],
    ]);

    expect(findModifiedMigrations(applied, current)).toEqual([]);
  });
});
