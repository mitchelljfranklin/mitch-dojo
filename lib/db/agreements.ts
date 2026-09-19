import { prisma } from "@/lib/prisma";

// Compliance documents: school-managed agreements (privacy notice, informed
// consent, safety expectations — or anything else a school adds). The count
// is not fixed: documents can be added, renamed (the title IS the display
// name), enabled/disabled, and deleted. Each document carries a version;
// editing creates a new version row (immutable history), signatures bind to
// the version they signed, and the compliance surface reports "re-sign
// required" when a document's version moves past a signature.

// Fresh/seeded documents start at version 0 so the school's first edit
// reads as version 1.
const INITIAL_VERSION = 0;

export type ActiveDocument = {
  id: string;
  title: string;
  bodyMarkdown: string;
  enabled: boolean;
  version: number;
  signatureCount: number;
};

// All documents in display order (creation order). `enabledOnly` trims to
// the ones the portal/compliance surfaces should show.
export async function listDocuments(
  enabledOnly = false,
): Promise<ActiveDocument[]> {
  const rows = await prisma.agreementDocument.findMany({
    where: enabledOnly ? { enabled: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { signatures: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    bodyMarkdown: row.bodyMarkdown,
    enabled: row.enabled,
    version: row.version,
    signatureCount: row._count.signatures,
  }));
}

export async function getAgreementDocumentById(
  documentId: string,
): Promise<ActiveDocument | null> {
  const row = await prisma.agreementDocument.findUnique({
    where: { id: documentId },
    include: { _count: { select: { signatures: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    bodyMarkdown: row.bodyMarkdown,
    enabled: row.enabled,
    version: row.version,
    signatureCount: row._count.signatures,
  };
}

export type DocumentVersionRow = {
  id: string;
  version: number;
  title: string;
  createdAt: Date;
  createdByName: string | null;
};

export async function listDocumentVersions(
  documentId: string,
): Promise<DocumentVersionRow[]> {
  const rows = await prisma.agreementVersion.findMany({
    where: { documentId },
    orderBy: { version: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title,
    createdAt: row.createdAt,
    createdByName: row.createdBy?.name ?? null,
  }));
}

// Creates a new document starting at version 0 (the provided title/body).
export async function createDocument(input: {
  title: string;
  bodyMarkdown: string;
  createdById: string | null;
}): Promise<{ id: string; version: number }> {
  const last = await prisma.agreementDocument.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const document = await prisma.agreementDocument.create({
    data: {
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      version: INITIAL_VERSION,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      createdById: input.createdById,
      versions: {
        create: {
          version: INITIAL_VERSION,
          title: input.title,
          bodyMarkdown: input.bodyMarkdown,
          createdById: input.createdById,
        },
      },
    },
    select: { id: true },
  });
  return { id: document.id, version: INITIAL_VERSION };
}

// Saves an edit as a NEW version (immutable history) — version = current+1,
// and a version-history row is written for it.
export async function createDocumentVersion(input: {
  documentId: string;
  title: string;
  bodyMarkdown: string;
  createdById: string | null;
}): Promise<number> {
  const document = await prisma.agreementDocument.findUnique({
    where: { id: input.documentId },
    select: { version: true },
  });
  if (!document) {
    throw new Error("Document not found.");
  }
  const version = document.version + 1;
  await prisma.$transaction([
    prisma.agreementDocument.update({
      where: { id: input.documentId },
      data: {
        title: input.title,
        bodyMarkdown: input.bodyMarkdown,
        version,
      },
    }),
    prisma.agreementVersion.create({
      data: {
        documentId: input.documentId,
        version,
        title: input.title,
        bodyMarkdown: input.bodyMarkdown,
        createdById: input.createdById,
      },
    }),
  ]);
  return version;
}

export async function setDocumentEnabled(
  documentId: string,
  enabled: boolean,
): Promise<void> {
  await prisma.agreementDocument.update({
    where: { id: documentId },
    data: { enabled },
  });
}

// Deleting a document removes its version history and signatures (cascade)
// — the compliance record for those signatures goes with it.
export async function deleteDocument(documentId: string): Promise<void> {
  await prisma.agreementDocument.delete({ where: { id: documentId } });
}

export type AgreementStatus = {
  documentId: string;
  title: string;
  bodyMarkdown: string;
  // The current version the student should be on.
  activeVersion: number;
  // Signed state against the current version.
  signed: boolean;
  signedAt: Date | null;
  signedByName: string | null;
  method: "PORTAL" | "STAFF" | null;
  signedVersion: number | null;
  // True when a signature exists but against an older version.
  reSignRequired: boolean;
};

export async function getStudentAgreementStatuses(
  studentId: string,
): Promise<AgreementStatus[]> {
  const [documents, signatures] = await Promise.all([
    listDocuments(true),
    prisma.studentAgreement.findMany({
      where: { studentId },
      orderBy: { signedAt: "desc" },
    }),
  ]);

  return documents.map((document) => {
    const signature = signatures.find((row) => row.documentId === document.id);
    const signed =
      Boolean(signature) && signature!.version === document.version;
    return {
      documentId: document.id,
      title: document.title,
      bodyMarkdown: document.bodyMarkdown,
      activeVersion: document.version,
      signed,
      signedAt: signature?.signedAt ?? null,
      signedByName: signature?.signedByName ?? null,
      method: signature?.method ?? null,
      signedVersion: signature?.version ?? null,
      reSignRequired: Boolean(signature) && !signed,
    };
  });
}

export async function getStudentAgreementSummary(studentId: string): Promise<{
  signedCount: number;
  total: number;
  reSignRequired: boolean;
}> {
  const statuses = await getStudentAgreementStatuses(studentId);
  return {
    signedCount: statuses.filter((status) => status.signed).length,
    total: statuses.length,
    reSignRequired: statuses.some((status) => status.reSignRequired),
  };
}

// Records a signature (staff-recorded paper signing). Upsert semantics per
// (student, document) so re-recording overwrites the same version's row.
export async function recordStudentSignature(input: {
  studentId: string;
  documentId: string;
  signedAt: Date;
  signedByName: string;
  recordedById: string | null;
}): Promise<void> {
  const document = await prisma.agreementDocument.findUnique({
    where: { id: input.documentId },
    select: { version: true },
  });
  if (!document) {
    throw new Error("Document not found.");
  }
  await prisma.studentAgreement.upsert({
    where: {
      studentId_documentId: {
        studentId: input.studentId,
        documentId: input.documentId,
      },
    },
    update: {
      version: document.version,
      signedAt: input.signedAt,
      signedByName: input.signedByName,
      method: "STAFF",
      recordedById: input.recordedById,
    },
    create: {
      studentId: input.studentId,
      documentId: input.documentId,
      version: document.version,
      signedAt: input.signedAt,
      signedByName: input.signedByName,
      method: "STAFF",
      recordedById: input.recordedById,
    },
  });
}

// Portal signing — same upsert, method PORTAL (the portal token identity
// authorises the write; no staff user involved).
export async function signAgreementViaPortal(input: {
  studentId: string;
  documentId: string;
  signedByName: string;
}): Promise<void> {
  const document = await prisma.agreementDocument.findUnique({
    where: { id: input.documentId },
    select: { version: true },
  });
  if (!document) {
    throw new Error("Document not found.");
  }
  await prisma.studentAgreement.upsert({
    where: {
      studentId_documentId: {
        studentId: input.studentId,
        documentId: input.documentId,
      },
    },
    update: {
      version: document.version,
      signedAt: new Date(),
      signedByName: input.signedByName,
      method: "PORTAL",
      recordedById: null,
    },
    create: {
      studentId: input.studentId,
      documentId: input.documentId,
      version: document.version,
      signedAt: new Date(),
      signedByName: input.signedByName,
      method: "PORTAL",
    },
  });
}
