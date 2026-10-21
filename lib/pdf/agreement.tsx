import { Document, Page, Text, View } from "@react-pdf/renderer";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";
import type { AgreementPdfLabels } from "./labels";

export type AgreementPdfInput = {
  documentTitle: string;
  version: number;
  bodyMarkdown: string;
  studentName: string;
  orgName: string;
};

export type AgreementPdfData = AgreementPdfInput & {
  lines: { text: string; heading: boolean }[];
};

// Markdown-lite rendering: "# " lines become bold headings, everything else
// a plain paragraph. Good enough for printable school policy documents.
export function shapeAgreementPdf(input: AgreementPdfInput): AgreementPdfData {
  const lines = input.bodyMarkdown
    .split("\n")
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw) => ({
      text: raw.replace(/^#+\s*/, ""),
      heading: raw.startsWith("#"),
    }));
  return { ...input, lines };
}

export function AgreementPdfDocument({
  brand,
  data,
  labels,
}: {
  brand: PdfBrand;
  data: AgreementPdfData;
  labels: AgreementPdfLabels;
}) {
  return (
    <Document
      title={`${data.documentTitle} — ${data.studentName}`}
      author={brand.orgName}
    >
      <Page
        size="A4"
        style={[
          pdfStyles.page,
          { fontFamily: labels.fontFamily, direction: labels.direction },
        ]}
      >
        <PdfBrandHeader brand={brand} />

        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
          {data.documentTitle}
        </Text>
        <Text style={pdfStyles.muted}>{labels.versionLine(data.version)}</Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          {data.lines.map((line, index) =>
            line.heading ? (
              <Text key={index} style={{ fontWeight: "bold", fontSize: 12 }}>
                {line.text}
              </Text>
            ) : (
              <Text key={index} style={{ fontSize: 10, lineHeight: 1.5 }}>
                {line.text}
              </Text>
            ),
          )}
        </View>

        <View style={{ marginTop: 32, gap: 24 }}>
          <View>
            <Text style={pdfStyles.muted}>
              {labels.member} — {data.studentName}
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#71717a",
                width: 240,
                marginTop: 18,
              }}
            />
            <Text style={[pdfStyles.muted, { fontSize: 8 }]}>
              {labels.signature}
            </Text>
          </View>
          <View>
            <Text style={pdfStyles.muted}>{labels.date}</Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#71717a",
                width: 240,
                marginTop: 18,
              }}
            />
            <Text style={[pdfStyles.muted, { fontSize: 8 }]}>
              {labels.dateSigned}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.footer} fixed>
          {labels.footer(
            data.orgName,
            data.documentTitle,
            data.version,
            data.studentName,
          )}
        </Text>
      </Page>
    </Document>
  );
}
