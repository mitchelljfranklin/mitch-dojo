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

    console.log("Seeding standard belt range...");
    const standardRange = [
      { name: "White", colorHex: "#FFFFFF", order: 0, requiredTrainings: 0 },
      { name: "Yellow", colorHex: "#FFD700", order: 1, requiredTrainings: 12 },
      { name: "Orange", colorHex: "#FF8C00", order: 2, requiredTrainings: 24 },
      { name: "Green", colorHex: "#228B22", order: 3, requiredTrainings: 36 },
      { name: "Blue", colorHex: "#0057B8", order: 4, requiredTrainings: 48 },
      { name: "Brown", colorHex: "#8B4513", order: 5, requiredTrainings: 60 },
      { name: "Black", colorHex: "#000000", order: 6, requiredTrainings: 80 },
    ];
    for (const entry of standardRange) {
      await prisma.beltRangeEntry.upsert({
        where: { name: entry.name },
        update: {},
        create: entry,
      });
    }

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
