-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "invoices_locationId_idx" ON "invoices"("locationId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
