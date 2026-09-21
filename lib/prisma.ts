import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

import { PrismaClient } from "../prisma/generated/prisma/client";
import { resolveDatabaseProvider } from "@/lib/env";

const require = createRequire(import.meta.url);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// One schema, one migration set, two connection modes:
//   DATABASE_PROVIDER=postgres -> @prisma/adapter-pg over DATABASE_URL (server mode)
//   DATABASE_PROVIDER=pglite   -> embedded PGlite at DATABASE_DIR (lite mode)
// PGlite runs real PostgreSQL (WASM), so schema semantics are identical in
// both modes; only the adapter differs.
function createPrismaClient(): PrismaClient {
  const provider = resolveDatabaseProvider(process.env.DATABASE_PROVIDER);

  if (provider === "pglite") {
    const dataDir = process.env.DATABASE_DIR!;
    // PGlite does not create missing parent directories on first run.
    mkdirSync(dataDir, { recursive: true });
    const { PGlite } = require("@electric-sql/pglite");
    const { PrismaPGlite } = require("pglite-prisma-adapter");
    const client = new PGlite(dataDir);
    const adapter = new PrismaPGlite(client);
    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// The globalThis dedupe is unconditional — the standalone build duplicates
// lib/prisma across module graphs (pages vs route handlers), and each copy
// would otherwise create its OWN PrismaClient. With PGlite that means
// multiple engines over one data dir: split state (stale reads on logo
// routes etc.) and on-disk corruption risk. One client per process, always.
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma;
