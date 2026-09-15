export function backupDataDir(
  dataDir: string,
  options?: {
    keep?: number;
    backupDir?: string;
    clockNow?: Date;
  },
): Promise<string | null>;
export function findModifiedMigrations(
  appliedEntries: Map<string, string>,
  currentChecksums: Map<string, string>,
): string[];
