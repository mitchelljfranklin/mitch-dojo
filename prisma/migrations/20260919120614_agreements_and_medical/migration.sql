-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('PRIVACY', 'CONSENT', 'SAFETY');

-- CreateEnum
CREATE TYPE "AgreementSignatureMethod" AS ENUM ('PORTAL', 'STAFF');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "medicalInjuries" TEXT,
ADD COLUMN     "medicalMedications" TEXT;

-- CreateTable
CREATE TABLE "agreement_documents" (
    "id" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_agreements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedByName" TEXT NOT NULL,
    "method" "AgreementSignatureMethod" NOT NULL DEFAULT 'PORTAL',
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agreement_documents_type_version_idx" ON "agreement_documents"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_documents_type_version_key" ON "agreement_documents"("type", "version");

-- CreateIndex
CREATE INDEX "student_agreements_documentId_idx" ON "student_agreements"("documentId");

-- CreateIndex
CREATE INDEX "student_agreements_studentId_idx" ON "student_agreements"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_agreements_studentId_documentId_key" ON "student_agreements"("studentId", "documentId");

-- AddForeignKey
ALTER TABLE "agreement_documents" ADD CONSTRAINT "agreement_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_agreements" ADD CONSTRAINT "student_agreements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_agreements" ADD CONSTRAINT "student_agreements_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "agreement_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_agreements" ADD CONSTRAINT "student_agreements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
