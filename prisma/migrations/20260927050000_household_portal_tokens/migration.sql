-- AlterTable
ALTER TABLE "portal_tokens" ALTER COLUMN "studentId" DROP NOT NULL,
ADD COLUMN     "householdId" TEXT;

-- CreateIndex
CREATE INDEX "portal_tokens_householdId_idx" ON "portal_tokens"("householdId");

-- AddForeignKey
ALTER TABLE "portal_tokens" ADD CONSTRAINT "portal_tokens_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
