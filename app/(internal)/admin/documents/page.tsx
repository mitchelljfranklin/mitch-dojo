import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listActiveDocuments, listDocumentVersions } from "@/lib/db/agreements";

import { AgreementDocForm } from "./agreement-doc-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Documents" };

export default async function AdminDocumentsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const documents = await listActiveDocuments();
  const versionsPerType = await Promise.all(
    documents.map((document) => listDocumentVersions(document.type)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm">
          The agreements members read and sign: privacy notice, informed
          consent, and safety expectations. Editing a document creates a new
          version and requires everyone to re-sign it.
        </p>
      </div>

      {documents.map((document, index) => {
        const versions = versionsPerType[index]!;
        return (
          <Card key={document.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {document.title}
                <Badge variant="secondary">v{document.version}</Badge>
              </CardTitle>
              <CardDescription>
                Signed by {versions[0]?.signatureCount ?? 0} member
                {(versions[0]?.signatureCount ?? 0) === 1 ? "" : "s"} on the
                current version.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <AgreementDocForm
                type={document.type}
                title={document.title}
                bodyMarkdown={document.bodyMarkdown}
                version={document.version}
              />

              <details className="text-sm">
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  Version history ({versions.length})
                </summary>
                <div className="mt-2">
                  <Table rows={versions} />
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Table({
  rows,
}: {
  rows: {
    id: string;
    version: number;
    title: string;
    createdAt: Date;
    createdByName: string | null;
    signatureCount: number;
  }[];
}) {
  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
            <th className="px-3 py-2 font-medium">Version</th>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Saved by</th>
            <th className="px-3 py-2 font-medium">Signatures</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0">
              <td className="px-3 py-2">v{row.version}</td>
              <td className="px-3 py-2">{row.title}</td>
              <td className="text-muted-foreground px-3 py-2">
                {row.createdByName ?? "—"}
              </td>
              <td className="text-muted-foreground px-3 py-2">
                {row.signatureCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
