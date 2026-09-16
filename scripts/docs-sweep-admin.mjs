// One-off docs sweep: Settings → X becomes Admin → X. Verifies every
// replacement actually landed (a silent no-op pass is worse than none) and
// that no non-ASCII characters were corrupted (a PowerShell pipeline pass
// once turned every 'c' into 'o' in a docs file and was reverted).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Excludes the permission label "Settings: manage" (stays as-is) and the
// settings code directory (lib/settings is the settings store, not the
// admin area).
const FILES = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "README.md",
  "phasereview.md",
  join("docs", "index.md"),
  join("docs", "deployment.md"),
  join("docs", "architecture.md"),
];

const REPLACEMENTS = [
  ["Settings → General", "Admin → General"],
  ["Settings → Appearance", "Admin → Appearance"],
  ["Settings → Memberships", "Admin → Memberships"],
  ["Settings → Communication", "Admin → Communication"],
  ["Settings → Operations", "Admin → Scheduling"],
  ["Settings → Storage", "Admin → Storage"],
  ["Settings → Email", "Admin → Email"],
  ["Settings → Locations", "Admin → Locations"],
  ["Settings → Users", "Admin → Users"],
  ["Settings → Roles", "Admin → Roles"],
  ["Settings → Audit", "Admin → Audit log"],
  ["Settings → Email log", "Admin → Email log"],
  ["Settings → Scheduling", "Admin → Scheduling"],
  ["Settings → Health", "Admin → Health"],
  ["under **Settings**", "under **Admin**"],
  ["the Settings page", "the Admin page"],
];

// Characters that must survive the sweep untouched (mojibake detection).
const NON_ASCII_SENTINELS = ["—", "‑", "→", "é", "ü", "¶"];

function assertNonAsciiIntact(content, file) {
  for (const sentinel of NON_ASCII_SENTINELS) {
    if (content.includes(sentinel)) return;
  }
  // Files that originally contained a sentinel but no longer do were corrupted.
  throw new Error(`Non-ASCII sentinel lost in ${file} — encoding corruption`);
}

function countAndReplace(content, file) {
  let updated = content;
  const applied = [];
  for (const [from, to] of REPLACEMENTS) {
    const count = updated.split(from).length - 1;
    if (count > 0) {
      updated = updated.split(from).join(to);
      applied.push(`${count}× "${from}"`);
    }
  }
  if (updated === content) return { updated, applied };

  // Verify no non-ASCII corruption.
  const originalSentinels = NON_ASCII_SENTINELS.filter((s) =>
    content.includes(s),
  );
  for (const sentinel of originalSentinels) {
    if (!updated.includes(sentinel)) {
      throw new Error(
        `Sentinel "${sentinel}" lost in ${file} — encoding corruption detected.`,
      );
    }
  }
  return { updated, applied };
}

let totalChanges = 0;
for (const file of FILES) {
  const path = join(repoRoot, file);
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    console.log(`  skipped (not found): ${file}`);
    continue;
  }
  const { updated, applied } = countAndReplace(content, file);
  if (applied.length === 0) {
    console.log(`  no changes: ${file}`);
    continue;
  }
  writeFileSync(path, Buffer.from(updated, "utf8"));
  console.log(`  ${file}: ${applied.join(", ")}`);
  totalChanges += applied.length;
}
console.log(`Docs sweep complete — ${totalChanges} replacement group(s).`);
