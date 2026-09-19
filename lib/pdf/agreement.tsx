import { Document, Page, Text, View } from "@react-pdf/renderer";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";

export type AgreementPdfInput = {
  documentTitle: string;
  documentType: string;
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
}: {
  brand: PdfBrand;
  data: AgreementPdfData;
}) {
  return (
    <Document
      title={`${data.documentTitle} — ${data.studentName}`}
      author={brand.orgName}
    >
      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader brand={brand} />

        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16 }}>
          {data.documentTitle}
        </Text>
        <Text style={pdfStyles.muted}>
          {data.documentType} · version {data.version}
        </Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          {data.lines.map((line, index) =>
            line.heading ? (
              <Text
                key={index}
                style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}
              >
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
              Member (or guardian) — {data.studentName}
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#71717a",
                width: 240,
                marginTop: 18,
              }}
            />
            <Text style={[pdfStyles.muted, { fontSize: 8 }]}>Signature</Text>
          </View>
          <View>
            <Text style={pdfStyles.muted}>Date</Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#71717a",
                width: 240,
                marginTop: 18,
              }}
            />
            <Text style={[pdfStyles.muted, { fontSize: 8 }]}>Date signed</Text>
          </View>
        </View>

        <Text style={pdfStyles.footer} fixed>
          {data.orgName} — {data.documentTitle} (v{data.version}) for{" "}
          {data.studentName}
        </Text>
      </Page>
    </Document>
  );
}
