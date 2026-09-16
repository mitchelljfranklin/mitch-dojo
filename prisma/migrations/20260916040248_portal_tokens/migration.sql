-- CreateTable
CREATE TABLE "portal_tokens" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_tokens_tokenHash_key" ON "portal_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "portal_tokens_studentId_idx" ON "portal_tokens"("studentId");

-- CreateIndex
CREATE INDEX "portal_tokens_expiresAt_idx" ON "portal_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "portal_tokens" ADD CONSTRAINT "portal_tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
