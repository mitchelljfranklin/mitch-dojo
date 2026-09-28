import { prisma } from "@/lib/prisma";

// Trainer verifications (Blue Card / WWCC / first-aid certs / insurance …).
// The category list is school-owned data, so nothing jurisdiction-specific is
// hardcoded. Status is derived from the record's expiry, never stored.

const DEFAULT_WINDOW_DAYS = 60;

export type VerificationStatus = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";

export type VerificationTypeRow = {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  requiresExpiry: boolean;
  defaultValidityMonths: number | null;
  isActive: boolean;
  sortOrder: number;
  recordCount: number;
};

export async function listVerificationTypes(
  enabledOnly = false,
): Promise<VerificationTypeRow[]> {
  const rows = await prisma.verificationType.findMany({
    where: enabledOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { verifications: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    required: row.required,
    requiresExpiry: row.requiresExpiry,
    defaultValidityMonths: row.defaultValidityMonths,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    recordCount: row._count.verifications,
  }));
}

export async function getVerificationType(id: string) {
  return prisma.verificationType.findUnique({ where: { id } });
}

export async function createVerificationType(input: {
  name: string;
  description: string | null;
  required: boolean;
  requiresExpiry: boolean;
  defaultValidityMonths: number | null;
  isActive: boolean;
}): Promise<{ id: string }> {
  const last = await prisma.verificationType.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const created = await prisma.verificationType.create({
    data: { ...input, sortOrder: (last?.sortOrder ?? 0) + 1 },
    select: { id: true },
  });
  return { id: created.id };
}

export async function updateVerificationType(
  id: string,
  input: {
    name: string;
    description: string | null;
    required: boolean;
    requiresExpiry: boolean;
    defaultValidityMonths: number | null;
    isActive: boolean;
  },
): Promise<void> {
  await prisma.verificationType.update({ where: { id }, data: input });
}

export async function setVerificationTypeActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await prisma.verificationType.update({ where: { id }, data: { isActive } });
}

export async function deleteVerificationType(id: string): Promise<void> {
  const count = await prisma.trainerVerification.count({
    where: { typeId: id },
  });
  if (count > 0) {
    throw new Error(
      "This type has records against it — disable it instead of deleting.",
    );
  }
  await prisma.verificationType.delete({ where: { id } });
}

// --------------- status ---------------

// Pure: derive a record's status from its expiry date.
export function verificationStatus(
  expiresAt: Date | null,
  now: Date = new Date(),
  windowDays: number = DEFAULT_WINDOW_DAYS,
): VerificationStatus {
  if (!expiresAt) return "VALID";
  if (expiresAt.getTime() < now.getTime()) return "EXPIRED";
  const windowEnd = now.getTime() + windowDays * 86_400_000;
  return expiresAt.getTime() <= windowEnd ? "EXPIRING" : "VALID";
}

// --------------- records ---------------

export type TrainerVerificationRow = {
  typeId: string;
  typeName: string;
  typeDescription: string | null;
  required: boolean;
  requiresExpiry: boolean;
  defaultValidityMonths: number | null;
  recordId: string | null;
  referenceNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  documentKey: string | null;
  notes: string | null;
  status: VerificationStatus;
};

export type TrainerVerificationView = {
  rows: TrainerVerificationRow[];
  summary: { expired: number; expiring: number; missing: number };
};

export async function getTrainerVerificationView(
  trainerId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  now: Date = new Date(),
): Promise<TrainerVerificationView> {
  const [types, records] = await Promise.all([
    prisma.verificationType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.trainerVerification.findMany({ where: { trainerId } }),
  ]);

  let expired = 0;
  let expiring = 0;
  let missing = 0;

  const rows: TrainerVerificationRow[] = types.map((type) => {
    const record = records.find((row) => row.typeId === type.id) ?? null;
    const status = record
      ? verificationStatus(record.expiresAt, now, windowDays)
      : "MISSING";
    if (status === "EXPIRED") expired++;
    else if (status === "EXPIRING") expiring++;
    else if (status === "MISSING" && type.required) missing++;

    return {
      typeId: type.id,
      typeName: type.name,
      typeDescription: type.description,
      required: type.required,
      requiresExpiry: type.requiresExpiry,
      defaultValidityMonths: type.defaultValidityMonths,
      recordId: record?.id ?? null,
      referenceNumber: record?.referenceNumber ?? null,
      issuedAt: record?.issuedAt ?? null,
      expiresAt: record?.expiresAt ?? null,
      documentKey: record?.documentKey ?? null,
      notes: record?.notes ?? null,
      status,
    };
  });

  return { rows, summary: { expired, expiring, missing } };
}

// Batch summary per trainer, for list badges/filters.
export async function getVerificationSummaries(
  windowDays: number = DEFAULT_WINDOW_DAYS,
  now: Date = new Date(),
): Promise<
  Map<string, { expired: number; expiring: number; missing: number }>
> {
  const [types, records] = await Promise.all([
    prisma.verificationType.findMany({
      where: { isActive: true },
      select: { id: true, required: true },
    }),
    prisma.trainerVerification.findMany({
      select: { trainerId: true, typeId: true, expiresAt: true },
    }),
  ]);

  const summaries = new Map<
    string,
    { expired: number; expiring: number; missing: number }
  >();
  const seen = new Set<string>();

  for (const record of records) {
    const summary = summaries.get(record.trainerId) ?? {
      expired: 0,
      expiring: 0,
      missing: 0,
    };
    const status = verificationStatus(record.expiresAt, now, windowDays);
    if (status === "EXPIRED") summary.expired++;
    else if (status === "EXPIRING") summary.expiring++;
    summaries.set(record.trainerId, summary);
    seen.add(`${record.trainerId}|${record.typeId}`);
  }

  // Missing required types: trainers with no record for a required type.
  const trainers = await prisma.trainer.findMany({ select: { id: true } });
  for (const trainer of trainers) {
    const summary = summaries.get(trainer.id) ?? {
      expired: 0,
      expiring: 0,
      missing: 0,
    };
    for (const type of types) {
      if (!type.required) continue;
      if (!seen.has(`${trainer.id}|${type.id}`)) summary.missing++;
    }
    summaries.set(trainer.id, summary);
  }

  return summaries;
}

export async function saveTrainerVerification(input: {
  trainerId: string;
  typeId: string;
  referenceNumber: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  notes: string | null;
  documentKey?: string | null;
  recordedById: string | null;
}): Promise<{ id: string; previousDocumentKey: string | null }> {
  const existing = await prisma.trainerVerification.findUnique({
    where: {
      trainerId_typeId: { trainerId: input.trainerId, typeId: input.typeId },
    },
    select: { id: true, documentKey: true },
  });

  const data = {
    referenceNumber: input.referenceNumber,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    notes: input.notes,
    recordedById: input.recordedById,
    ...(input.documentKey !== undefined
      ? { documentKey: input.documentKey }
      : {}),
  };

  if (existing) {
    await prisma.trainerVerification.update({
      where: { id: existing.id },
      data,
    });
    return { id: existing.id, previousDocumentKey: existing.documentKey };
  }

  const created = await prisma.trainerVerification.create({
    data: {
      trainerId: input.trainerId,
      typeId: input.typeId,
      ...data,
    },
    select: { id: true },
  });
  return { id: created.id, previousDocumentKey: null };
}

// Removes the record and returns its document key so the caller can delete
// the stored file.
export async function deleteTrainerVerification(
  id: string,
): Promise<{ documentKey: string | null }> {
  const record = await prisma.trainerVerification.findUnique({
    where: { id },
    select: { documentKey: true },
  });
  await prisma.trainerVerification.delete({ where: { id } });
  return { documentKey: record?.documentKey ?? null };
}

export async function getTrainerVerification(
  trainerId: string,
  typeId: string,
) {
  return prisma.trainerVerification.findUnique({
    where: { trainerId_typeId: { trainerId, typeId } },
  });
}
