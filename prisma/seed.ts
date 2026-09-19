import "dotenv/config";

import { mkdirSync } from "node:fs";
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
    // PGlite is single-process — refuse when a dev server may be holding
    // the data directory (the guard exits the process on a detected server).
    const { assertNoDevServer } = await import(
      new URL("../scripts/pglite-guard.mjs", import.meta.url).href
    );
    await assertNoDevServer();

    const dataDir = resolveDataDir();
    // PGlite does not create missing parent directories on first run.
    mkdirSync(dataDir, { recursive: true });
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

    console.log("Seeding disciplines with belt ladders...");
    // Karate: 9-belt kyu ladder (cumulative totals, Black ~ 3 years at
    // 2 sessions/week — edit thresholds in the belts page).
    const karate = await prisma.discipline.upsert({
      where: { name: "Karate" },
      update: {},
      create: { name: "Karate" },
    });
    const karateLadder = [
      { name: "White", colorHex: "#FFFFFF", order: 0, requiredTrainings: 0 },
      { name: "Yellow", colorHex: "#FFD700", order: 1, requiredTrainings: 25 },
      { name: "Orange", colorHex: "#FF8C00", order: 2, requiredTrainings: 50 },
      { name: "Green", colorHex: "#228B22", order: 3, requiredTrainings: 100 },
      { name: "Blue", colorHex: "#0057B8", order: 4, requiredTrainings: 150 },
      { name: "Purple", colorHex: "#7B2D8E", order: 5, requiredTrainings: 200 },
      { name: "Brown", colorHex: "#8B4513", order: 6, requiredTrainings: 250 },
      { name: "Red", colorHex: "#DC2626", order: 7, requiredTrainings: 280 },
      { name: "Black", colorHex: "#000000", order: 8, requiredTrainings: 300 },
    ];
    for (const entry of karateLadder) {
      await prisma.beltRangeEntry.upsert({
        where: {
          disciplineId_name: { disciplineId: karate.id, name: entry.name },
        },
        update: {},
        create: { ...entry, disciplineId: karate.id },
      });
    }

    // Jujitsu: 6-belt ladder to demonstrate multi-discipline support.
    const jujitsu = await prisma.discipline.upsert({
      where: { name: "Jujitsu" },
      update: {},
      create: { name: "Jujitsu" },
    });
    const jujitsuLadder = [
      { name: "White", colorHex: "#FFFFFF", order: 0, requiredTrainings: 0 },
      { name: "Yellow", colorHex: "#FFD700", order: 1, requiredTrainings: 30 },
      { name: "Green", colorHex: "#228B22", order: 2, requiredTrainings: 70 },
      { name: "Blue", colorHex: "#0057B8", order: 3, requiredTrainings: 120 },
      { name: "Brown", colorHex: "#8B4513", order: 4, requiredTrainings: 180 },
      { name: "Black", colorHex: "#000000", order: 5, requiredTrainings: 260 },
    ];
    for (const entry of jujitsuLadder) {
      await prisma.beltRangeEntry.upsert({
        where: {
          disciplineId_name: { disciplineId: jujitsu.id, name: entry.name },
        },
        update: {},
        create: { ...entry, disciplineId: jujitsu.id },
      });
    }

    console.log("Seeding agreement document templates...");
    // Three compliance documents with generic placeholder text — each school
    // replaces the bodies in Admin → Documents (editing creates version 2).
    const agreementTemplates = [
      {
        title: "Privacy information notice",
        sortOrder: 1,
        body:
          "# Privacy information notice\n\n" +
          "Replace this text with your school's privacy notice: what personal " +
          "and health information you collect, why you collect it, who you share " +
          "it with, and how members can access or correct their data.\n\n" +
          "By signing, the member confirms they have read and understood this notice.",
      },
      {
        sortOrder: 2,
        title: "Informed consent — contact sport",
        body:
          "# Informed consent\n\n" +
          "Replace this text with your informed-consent statement: the risks of " +
          "participating in martial arts as a contact activity, the member's " +
          "responsibility to declare medical conditions, and your conditions of " +
          "participation.\n\n" +
          "By signing, the member confirms they have read and understood this consent.",
      },
      {
        sortOrder: 3,
        title: "Safety, respect & discipline expectations",
        body:
          "# Safety and expectations\n\n" +
          "Replace this text with your safety rules and expectations: what may " +
          "and may not be worn, jewellery and grooming, respect and discipline " +
          "on the mats, and the consequences of breaches.\n\n" +
          "By signing, the member confirms they have read and understood these expectations.",
      },
    ];
    for (const template of agreementTemplates) {
      const existing = await prisma.agreementDocument.findFirst({
        where: { title: template.title },
        select: { id: true },
      });
      if (!existing) {
        // Version 0 = the seeded content; the school's first edit in the app
        // becomes version 1.
        await prisma.agreementDocument.create({
          data: {
            title: template.title,
            bodyMarkdown: template.body,
            version: 0,
            sortOrder: template.sortOrder,
          },
        });
      }
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
