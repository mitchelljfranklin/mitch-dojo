-- CreateEnum
CREATE TYPE "TrialStage" AS ENUM ('NEW', 'CONTACTED', 'FIRST_CLASS', 'CONVERTED', 'LOST');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "trialStage" "TrialStage";
