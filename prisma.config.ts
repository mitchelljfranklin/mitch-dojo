try {
  await import("dotenv/config");
} catch {
  // dotenv not available in production — env vars are set by Docker
}

import { defineConfig } from "prisma/config";

// Migration authoring happens against Postgres (docker) in both deployment
// modes; lite mode consumes the resulting SQL files via
// scripts/migrate-pglite.mjs. Use process.env (not the env() helper) because
// `prisma generate` runs without a database and must not fail on config load.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed-runner.cjs",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
