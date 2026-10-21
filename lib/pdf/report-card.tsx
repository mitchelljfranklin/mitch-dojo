import { Document, Image, Page, Text, View } from "@react-pdf/renderer";

import { formatDate, formatDateUtc, formatMoney } from "@/lib/utils";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";
import type { ReportCardPdfLabels } from "./labels";

export type ReportCardBelt = {
  disciplineName: string;
  beltName: string;
  colorHex: string | null;
  awardedAt: Date;
};

export type ReportCardInput = {
  studentName: string;
  photoDataUrl: string | null;
  belts: ReportCardBelt[];
  trainedTotal: number;
  trainedLast30Days: number;
  balanceCents: number;
  currency: string;
  generatedAt: Date;
};

export type ReportCardData = ReportCardInput & {
  currentByDiscipline: ReportCardBelt[];
};

// Pure shaping: the current rank per discipline is the most recent award in
// each discipline (history arrives ordered newest-first).
export function shapeReportCard(input: ReportCardInput): ReportCardData {
  const currentByDiscipline: ReportCardBelt[] = [];
  const seen = new Set<string>();
  for (const belt of input.belts) {
    if (!seen.has(belt.disciplineName)) {
      seen.add(belt.disciplineName);
      currentByDiscipline.push(belt);
    }
  }
  return { ...input, currentByDiscipline };
}

export function ReportCardPdfDocument({
  brand,
  data,
  labels,
}: {
  brand: PdfBrand;
  data: ReportCardData;
  labels: ReportCardPdfLabels;
}) {
  return (
    <Document
      title={`${data.studentName} — ${labels.documentSuffix}`}
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {data.photoDataUrl ? (
            <Image
              src={data.photoDataUrl}
              style={{ width: 64, height: 64, objectFit: "cover" }}
            />
          ) : null}
          <View>
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>
              {data.studentName}
            </Text>
            <Text style={pdfStyles.muted}>
              {labels.progressLine(formatDate(data.generatedAt, labels.locale))}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>{labels.currentRank}</Text>
        {data.currentByDiscipline.length === 0 ? (
          <Text style={pdfStyles.muted}>{labels.noBelts}</Text>
        ) : (
          data.currentByDiscipline.map((belt) => (
            <View
              key={belt.disciplineName}
              style={[pdfStyles.tableRow, { alignItems: "center" }]}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: belt.colorHex ?? "#d4d4d8",
                  marginRight: 8,
                }}
              />
              <Text style={{ flex: 1 }}>{belt.disciplineName}</Text>
              <Text style={{ fontWeight: "bold" }}>{belt.beltName}</Text>
              <Text
                style={[pdfStyles.muted, { width: 90, textAlign: "right" }]}
              >
                {labels.since} {formatDateUtc(belt.awardedAt, labels.locale)}
              </Text>
            </View>
          ))
        )}

        <Text style={pdfStyles.sectionTitle}>{labels.trainingSummary}</Text>
        <View style={pdfStyles.tableRow}>
          <Text style={{ flex: 1 }}>{labels.sessionsAllTime}</Text>
          <Text style={{ fontWeight: "bold" }}>{data.trainedTotal}</Text>
        </View>
        <View style={pdfStyles.tableRow}>
          <Text style={{ flex: 1 }}>{labels.sessionsLast30}</Text>
          <Text style={{ fontWeight: "bold" }}>{data.trainedLast30Days}</Text>
        </View>
        <View style={pdfStyles.tableRow}>
          <Text style={{ flex: 1 }}>{labels.balanceDue}</Text>
          <Text style={{ fontWeight: "bold" }}>
            {formatMoney(data.balanceCents, data.currency, labels.locale)}
          </Text>
        </View>

        <Text style={pdfStyles.sectionTitle}>{labels.beltHistory}</Text>
        {data.belts.length === 0 ? (
          <Text style={pdfStyles.muted}>{labels.noHistory}</Text>
        ) : (
          <>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ flex: 1 }}>{labels.belt}</Text>
              <Text style={{ flex: 1 }}>{labels.discipline}</Text>
              <Text style={{ width: 100, textAlign: "right" }}>
                {labels.awarded}
              </Text>
            </View>
            {data.belts.map((belt, index) => (
              <View key={index} style={pdfStyles.tableRow} wrap={false}>
                <Text style={{ flex: 1 }}>{belt.beltName}</Text>
                <Text style={{ flex: 1 }}>{belt.disciplineName}</Text>
                <Text style={{ width: 100, textAlign: "right" }}>
                  {formatDateUtc(belt.awardedAt, labels.locale)}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={pdfStyles.footer} fixed>
          {labels.footer(brand.orgName, data.studentName)}
        </Text>
      </Page>
    </Document>
  );
}
