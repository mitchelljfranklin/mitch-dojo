-- CreateTable
CREATE TABLE "verification_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT false,
    "defaultValidityMonths" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_verifications" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentKey" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_types_name_key" ON "verification_types"("name");

-- CreateIndex
CREATE INDEX "trainer_verifications_typeId_idx" ON "trainer_verifications"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_verifications_trainerId_typeId_key" ON "trainer_verifications"("trainerId", "typeId");

-- AddForeignKey
ALTER TABLE "trainer_verifications" ADD CONSTRAINT "trainer_verifications_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_verifications" ADD CONSTRAINT "trainer_verifications_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "verification_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_verifications" ADD CONSTRAINT "trainer_verifications_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
