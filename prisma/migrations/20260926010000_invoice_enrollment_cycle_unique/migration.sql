-- One recurring invoice per enrollment cycle. Postgres treats NULL
-- enrollmentId values as distinct, so manually-billed invoices (NULL) are
-- unaffected. If this fails, duplicate (enrollmentId, issueDate) rows exist
-- from before the guard and must be reconciled manually.
CREATE UNIQUE INDEX "invoices_enrollmentId_issueDate_key" ON "invoices"("enrollmentId", "issueDate");
