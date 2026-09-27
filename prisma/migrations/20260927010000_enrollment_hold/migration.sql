-- AlterEnum
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "resumeAt" TIMESTAMP(3);
