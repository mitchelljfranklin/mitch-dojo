-- The documents model became school-managed (add/delete/enable/disable,
-- title-driven naming, version history). The previous shape stored a fixed
-- type per document; the feature is days old, so the tables are rebuilt
-- rather than migrated row-by-row (prior test signatures are disposable).
DROP TABLE IF EXISTS "student_agreements";
DROP TABLE IF EXISTS "agreement_document_versions";
DROP TABLE IF EXISTS "agreement_documents";
DROP TYPE IF EXISTS "AgreementType";

-- CreateTable
CREATE TABLE "agreement_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreement_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_agreements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedByName" TEXT NOT NULL,
    "method" "AgreementSignatureMethod" NOT NULL DEFAULT 'PORTAL',
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agreement_documents_sortOrder_idx" ON "agreement_documents"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_document_versions_documentId_version_key" ON "agreement_document_versions"("documentId", "version");

-- CreateIndex
CREATE INDEX "agreement_document_versions_documentId_idx" ON "agreement_document_versions"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_agreements_studentId_documentId_key" ON "student_agreements"("studentId", "documentId");

-- CreateIndex
CREATE INDEX "student_agreements_documentId_idx" ON "student_agreements"("documentId");

-- CreateIndex
CREATE INDEX "student_agreements_studentId_idx" ON "student_agreements"("studentId");

-- AddForeignKey
ALTER TABLE "agreement_documents" ADD CONSTRAINT "agreement_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_document_versions" ADD CONSTRAINT "agreement_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "agreement_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_document_versions" ADD CONSTRAINT "agreement_document_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_agreements" ADD CONSTRAINT "student_agreements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_agreements" ADD CONSTRAINT "student_agreements_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "agreement_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_agreements" ADD CONSTRAINT "student_agreements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;