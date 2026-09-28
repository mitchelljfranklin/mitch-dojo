import { type Prisma } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { type TrainerInput } from "@/lib/schemas/trainer";

export type TrainerWithCounts = Awaited<
  ReturnType<typeof listTrainers>
>[number];

export async function listTrainers(): Promise<
  {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    bio: string | null;
    isActive: boolean;
    userId: string | null;
    userName: string | null;
    courseCount: number;
  }[]
> {
  const trainers = await prisma.trainer.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      user: { select: { name: true } },
      _count: { select: { courses: true } },
    },
  });

  return trainers.map((trainer) => ({
    id: trainer.id,
    name: trainer.name,
    email: trainer.email,
    phone: trainer.phone,
    bio: trainer.bio,
    isActive: trainer.isActive,
    userId: trainer.userId,
    userName: trainer.user?.name ?? null,
    courseCount: trainer._count.courses,
  }));
}

export function getTrainer(id: string) {
  return prisma.trainer.findUnique({ where: { id } });
}

export function createTrainer(input: TrainerInput) {
  return prisma.trainer.create({ data: input });
}

export function updateTrainer(id: string, input: TrainerInput) {
  return prisma.trainer.update({ where: { id }, data: input });
}

// Deleting a trainer keeps their courses (trainerId is SetNull); the audit
// log preserves the name via the audit entry itself.
export async function deleteTrainer(id: string): Promise<void> {
  await prisma.trainer.delete({ where: { id } });
}

export async function listLinkableUsers(): Promise<
  { id: string; name: string; email: string; linkedTrainerId: string | null }[]
> {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      trainerProfile: { select: { id: true } },
    },
  });
  // Return every user with their linked trainer (if any); the picker includes
  // a user when they are unlinked OR linked to the trainer being edited, so
  // an already-linked account shows (and stays linked) rather than blanking.
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    linkedTrainerId: user.trainerProfile?.id ?? null,
  }));
}

export function buildTrainerNameMap(
  trainers: { id: string; name: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const trainer of trainers) map.set(trainer.id, trainer.name);
  return map;
}

export type TrainerWhere = Prisma.TrainerWhereInput;
