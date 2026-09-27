-- AlterTable
ALTER TABLE "students" ADD COLUMN     "trialTrainingTimeId" TEXT;

-- AlterTable
ALTER TABLE "training_times" ADD COLUMN     "capacity" INTEGER;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_trialTrainingTimeId_fkey" FOREIGN KEY ("trialTrainingTimeId") REFERENCES "training_times"("id") ON DELETE SET NULL ON UPDATE CASCADE;
