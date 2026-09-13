-- CreateTable
CREATE TABLE "belt_range_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "requiredTrainings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belt_range_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "belt_range_entries_name_key" ON "belt_range_entries"("name");

-- CreateIndex
CREATE INDEX "belt_range_entries_order_idx" ON "belt_range_entries"("order");
