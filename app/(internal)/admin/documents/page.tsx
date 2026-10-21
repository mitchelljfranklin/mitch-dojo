import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { listDocuments, listDocumentVersions } from "@/lib/db/agreements";
import {
  toggleAgreementDocumentAction,
  deleteAgreementDocumentAction,
} from "../actions";

import { AgreementDocForm, AddDocumentForm } from "./agreement-doc-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Admin.documents");
  return { title: translate("metaTitle") };
}

export default async function AdminDocumentsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translate = await getTranslations("Admin.documents");
  const translateCommon = await getTranslations("Common");
  const documents = await listDocuments(false);
  const versionsPerDocument = await Promise.all(
    documents.map((document) => listDocumentVersions(document.id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {translate("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{translate("subtitle")}</p>
      </div>

      {documents.map((document, index) => {
        const versions = versionsPerDocument[index]!;
        return (
          <Card
            key={document.id}
            className={document.enabled ? "" : "opacity-60"}
          >
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="truncate">{document.title}</span>
                  <Badge variant="secondary">v{document.version}</Badge>
                  {document.enabled ? null : (
                    <Badge variant="outline">{translate("disabled")}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {translate("signedBy", {
                    count: document.signatureCount,
                  })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleAgreementDocumentAction}>
                  <input type="hidden" name="documentId" value={document.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={document.enabled ? "off" : "on"}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {document.enabled
                      ? translate("disable")
                      : translate("enable")}
                  </Button>
                </form>
                <ConfirmDialog
                  title={translate("deleteTitle")}
                  description={translate("deleteDescription", {
                    title: document.title,
                  })}
                  formId={`delete-document-${document.id}`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    {translateCommon("delete")}
                  </Button>
                </ConfirmDialog>
                <form
                  id={`delete-document-${document.id}`}
                  action={deleteAgreementDocumentAction}
                >
                  <input type="hidden" name="documentId" value={document.id} />
                </form>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <AgreementDocForm
                documentId={document.id}
                title={document.title}
                bodyMarkdown={document.bodyMarkdown}
                version={document.version}
              />

              <details className="text-sm">
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  {translate("versionHistory", { count: versions.length })}
                </summary>
                <div className="mt-2">
                  <Table rows={versions} />
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{translate("addTitle")}</CardTitle>
          <CardDescription>{translate("addDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AddDocumentForm />
        </CardContent>
      </Card>
    </div>
  );
}

async function Table({
  rows,
}: {
  rows: {
    id: string;
    version: number;
    title: string;
    createdAt: Date;
    createdByName: string | null;
  }[];
}) {
  const translate = await getTranslations("Admin.documents");
  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
            <th className="px-3 py-2 font-medium">
              {translate("columns.version")}
            </th>
            <th className="px-3 py-2 font-medium">
              {translate("columns.title")}
            </th>
            <th className="px-3 py-2 font-medium">
              {translate("columns.savedBy")}
            </th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
