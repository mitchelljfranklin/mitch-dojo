import "dotenv/config";

import { Prisma, PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PGlite } from "@electric-sql/pglite";

import { SYSTEM_ROLE_DEFINITIONS } from "../lib/permissions";

// Mirrors the adapter selection in lib/prisma.ts. Deliberately does not
// import lib/env: the seed runs from the Prisma CLI (and CI) where only the
// database connection and provider are guaranteed to be set.
type DatabaseProvider = "postgres" | "pglite";

function resolveDatabaseProvider(
  rawProvider: string | undefined,
): DatabaseProvider {
  return rawProvider === "pglite" ? "pglite" : "postgres";
}

function resolveDataDir(): string {
  if (process.env.DATABASE_DIR) return process.env.DATABASE_DIR;
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    return process.env.DATABASE_URL.slice("file:".length);
  }
  throw new Error("PGlite seed requires DATABASE_DIR to be set.");
}

type DefaultSetting = {
  category: string;
  key: string;
  value: Prisma.InputJsonValue;
  isSecret?: boolean;
};

const defaultSettings: DefaultSetting[] = [
  { category: "organization", key: "organization.name", value: "My Dojo" },
  { category: "organization", key: "organization.supportEmail", value: "" },
  {
    category: "operations",
    key: "operations.loginRateLimitPerMin",
    value: 10,
  },
  {
    category: "operations",
    key: "operations.emailLogRetentionDays",
    value: 14,
  },
  {
    category: "operations",
    key: "operations.sessionTimeoutMinutes",
    value: 30,
  },
  {
    category: "operations",
    key: "operations.passwordResetPerMin",
    value: 1,
  },
  { category: "files", key: "files.maxUploadMb", value: 20 },
  {
    category: "files",
    key: "files.allowedExtensions",
    value: ["pdf", "png", "jpg", "jpeg", "docx", "xlsx"],
  },
  { category: "audit", key: "audit.retentionDays", value: 90 },
  { category: "appearance", key: "appearance.primaryHex", value: "" },
  { category: "appearance", key: "appearance.secondaryHex", value: "" },
  { category: "appearance", key: "appearance.logoKey", value: "" },
  { category: "appearance", key: "appearance.borderRadius", value: 10 },
  { category: "appearance", key: "appearance.pageWidth", value: "constrained" },
  { category: "cron", key: "cron.internalSchedulerEnabled", value: true },
];

async function createClient(provider: DatabaseProvider): Promise<PrismaClient> {
  if (provider === "pglite") {
    const dataDir = resolveDataDir();
    const client = new PGlite(dataDir);
    const adapter = new PrismaPGlite(client);
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

async function run(): Promise<void> {
  const prisma = await createClient(
    resolveDatabaseProvider(process.env.DATABASE_PROVIDER),
  );

  try {
    console.log("Seeding system roles...");
    for (const definition of SYSTEM_ROLE_DEFINITIONS) {
      await prisma.role.upsert({
        where: { name: definition.name },
        update: {
          description: definition.description,
          permissions: [...definition.permissions],
          isSystem: true,
        },
        create: {
          name: definition.name,
          description: definition.description,
          permissions: [...definition.permissions],
          isSystem: true,
        },
      });
    }

    console.log("Seeding default settings...");
    for (const setting of defaultSettings) {
      await prisma.appSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: {
          category: setting.category,
          key: setting.key,
          value: setting.value,
          isSecret: setting.isSecret ?? false,
        },
      });
    }

    console.log("Seeding default location...");
    await prisma.location.upsert({
      where: { name: "Main Dojo" },
      update: {},
      create: { name: "Main Dojo", isActive: true, sortOrder: 0 },
    });

    const adminCount = await prisma.user.count();
    if (adminCount === 0) {
      console.log(
        "No users yet — the first admin is created via /setup in the app.",
      );
    } else {
      console.log(`Existing users: ${adminCount} (skipping admin creation).`);
    }

    console.log("Seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
