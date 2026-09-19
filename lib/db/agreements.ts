import { prisma } from "@/lib/prisma";

// Compliance documents: versioned school-specific agreements (privacy
// notice, informed consent, safety expectations) and the per-student
// signature records against them. The latest version of each type is the
// active one; re-signing is required only when it changes.

export const AGREEMENT_TYPES = ["PRIVACY", "CONSENT", "SAFETY"] as const;

export type AgreementTypeValue = (typeof AGREEMENT_TYPES)[number];

export const AGREEMENT_TYPE_LABELS: Record<AgreementTypeValue, string> = {
  PRIVACY: "Privacy notice",
  CONSENT: "Informed consent",
  SAFETY: "Safety expectations",
};

function isAgreementType(value: string): value is AgreementTypeValue {
  return (AGREEMENT_TYPES as readonly string[]).includes(value);
}

export function toAgreementType(value: string): AgreementTypeValue | null {
  return isAgreementType(value) ? value : null;
}

export type ActiveDocument = {
  id: string;
  type: AgreementTypeValue;
  version: number;
  title: string;
  bodyMarkdown: string;
  createdAt: Date;
};

// The active document per type (latest version), ordered consistently.
export async function listActiveDocuments(): Promise<ActiveDocument[]> {
  const rows = await prisma.agreementDocument.findMany({
    orderBy: [{ type: "asc" }, { version: "desc" }],
  });
  const latestByType = new Map<AgreementTypeValue, ActiveDocument>();
  for (const row of rows) {
    if (!latestByType.has(row.type)) {
      latestByType.set(row.type, {
        id: row.id,
        type: row.type,
        version: row.version,
        title: row.title,
        bodyMarkdown: row.bodyMarkdown,
        createdAt: row.createdAt,
      });
    }
  }
  // Stable order: PRIVACY, CONSENT, SAFETY.
  return AGREEMENT_TYPES.map((type) => latestByType.get(type)).filter(
    (document): document is ActiveDocument => document !== undefined,
  );
}

export async function getActiveDocument(
  type: AgreementTypeValue,
): Promise<ActiveDocument | null> {
  const all = await listActiveDocuments();
  return all.find((document) => document.type === type) ?? null;
}

export type DocumentVersionRow = {
  id: string;
  version: number;
  title: string;
  createdAt: Date;
  createdByName: string | null;
  signatureCount: number;
};

export async function listDocumentVersions(
  type: AgreementTypeValue,
): Promise<DocumentVersionRow[]> {
  const rows = await prisma.agreementDocument.findMany({
    where: { type },
    orderBy: { version: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { signatures: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title,
    createdAt: row.createdAt,
    createdByName: row.createdBy?.name ?? null,
    signatureCount: row._count.signatures,
  }));
}

// Saves a NEW version of the document (immutable history) — version is
// max(existing)+1 per type.
export async function createDocumentVersion(input: {
  type: AgreementTypeValue;
  title: string;
  bodyMarkdown: string;
  createdById: string | null;
}): Promise<number> {
  const latest = await prisma.agreementDocument.findFirst({
    where: { type: input.type },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  await prisma.agreementDocument.create({
    data: {
      type: input.type,
      version,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      createdById: input.createdById,
    },
  });
  return version;
}

export type AgreementStatus = {
  type: AgreementTypeValue;
  label: string;
  title: string;
  // The active version the student should be on.
  activeVersion: number;
  documentId: string;
  bodyMarkdown: string;
  // Signed state against the ACTIVE version.
  signed: boolean;
  signedAt: Date | null;
  signedByName: string | null;
  method: "PORTAL" | "STAFF" | null;
  // The version the signature was made against (when outdated).
  signedVersion: number | null;
  // True when a signature exists but against an older version.
  reSignRequired: boolean;
};

export async function getStudentAgreementStatuses(
  studentId: string,
): Promise<AgreementStatus[]> {
  const [activeDocuments, signatures] = await Promise.all([
    listActiveDocuments(),
    prisma.studentAgreement.findMany({
      where: { studentId },
      include: {
        document: { select: { id: true, type: true, version: true } },
      },
      orderBy: { signedAt: "desc" },
    }),
  ]);

  return activeDocuments.map((document) => {
    // The most recent signature for this type — may be an older version.
    const signature = signatures.find(
      (row) => row.document.type === document.type,
    );
    const signed = signature?.document.id === document.id;
    return {
      type: document.type,
      label: AGREEMENT_TYPE_LABELS[document.type],
      title: document.title,
      activeVersion: document.version,
      documentId: document.id,
      bodyMarkdown: document.bodyMarkdown,
      signed,
      signedAt: signed ? signature!.signedAt : null,
      signedByName: signed ? signature!.signedByName : null,
      method: signed ? signature!.method : null,
      signedVersion: signature ? signature.document.version : null,
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
  await prisma.studentAgreement.upsert({
    where: {
      studentId_documentId: {
        studentId: input.studentId,
        documentId: input.documentId,
      },
    },
    update: {
      signedAt: input.signedAt,
      signedByName: input.signedByName,
      method: "STAFF",
      recordedById: input.recordedById,
    },
    create: {
      studentId: input.studentId,
      documentId: input.documentId,
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
  await prisma.studentAgreement.upsert({
    where: {
      studentId_documentId: {
        studentId: input.studentId,
        documentId: input.documentId,
      },
    },
    update: {
      signedAt: new Date(),
      signedByName: input.signedByName,
      method: "PORTAL",
      recordedById: null,
    },
    create: {
      studentId: input.studentId,
      documentId: input.documentId,
      signedAt: new Date(),
      signedByName: input.signedByName,
      method: "PORTAL",
    },
  });
}

export async function getAgreementDocumentById(
  documentId: string,
): Promise<ActiveDocument | null> {
  const row = await prisma.agreementDocument.findUnique({
    where: { id: documentId },
  });
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    version: row.version,
    title: row.title,
    bodyMarkdown: row.bodyMarkdown,
    createdAt: row.createdAt,
  };
}
