import { Document, Page, Text, View } from "@react-pdf/renderer";

import { formatDateUtc } from "@/lib/utils";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";
import type { AttendancePdfLabels } from "./labels";

export type AttendanceSheetEntry = {
  name: string;
  status: string | null;
};

export type AttendanceSheetInput = {
  courseName: string;
  locationName: string;
  trainerName: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  entries: AttendanceSheetEntry[];
  generatedAt: Date;
};

export type AttendanceSheetData = AttendanceSheetInput & {
  presentCount: number;
  trainedCount: number;
  unmarkedCount: number;
};

// Pure shaping: status counts for the totals row.
export function shapeAttendanceSheet(
  input: AttendanceSheetInput,
): AttendanceSheetData {
  let presentCount = 0;
  let trainedCount = 0;
  let unmarkedCount = 0;
  for (const entry of input.entries) {
    if (!entry.status) {
      unmarkedCount += 1;
    } else {
      if (entry.status === "PRESENT") presentCount += 1;
      if (entry.status === "PRESENT" || entry.status === "LATE") {
        trainedCount += 1;
      }
    }
  }
  return { ...input, presentCount, trainedCount, unmarkedCount };
}

const CELL_NAME = { flex: 1 };
const CELL_STATUS = { width: 90, textAlign: "right" as const };

function statusLabel(
  status: string | null,
  labels: AttendancePdfLabels,
): string {
  if (!status) return "—";
  return labels.statuses[status] ?? status;
}

export function AttendanceSheetPdfDocument({
  brand,
  data,
  labels,
}: {
  brand: PdfBrand;
  data: AttendanceSheetData;
  labels: AttendancePdfLabels;
}) {
  const date = formatDateUtc(data.date, labels.locale);

  return (
    <Document
      title={`${data.courseName} — ${labels.title} ${date}`}
      author={brand.orgName}
    >
      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader brand={brand} />

        <View>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16 }}>
            {labels.title} — {data.courseName}
          </Text>
          <Text style={pdfStyles.muted}>
            {date} · {data.startTime}–{data.endTime} · {data.locationName}
            {data.trainerName
              ? ` · ${labels.trainer}: ${data.trainerName}`
              : ""}
          </Text>
          {data.status === "CANCELLED" ? (
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#b91c1c" }}>
              {labels.cancelled}
            </Text>
          ) : null}
        </View>

        <Text style={pdfStyles.sectionTitle}>{labels.roster}</Text>
        <View style={pdfStyles.tableHeader}>
          <Text style={CELL_NAME}>{labels.student}</Text>
          <Text style={CELL_STATUS}>{labels.status}</Text>
        </View>
        {data.entries.length === 0 ? (
          <Text style={pdfStyles.muted}>{labels.noStudents}</Text>
        ) : (
          data.entries.map((entry, index) => (
            <View key={index} style={pdfStyles.tableRow} wrap={false}>
              <Text style={CELL_NAME}>{entry.name}</Text>
              <Text style={CELL_STATUS}>
                {statusLabel(entry.status, labels)}
              </Text>
            </View>
          ))
        )}

        <View
          style={[
            pdfStyles.tableRow,
            { fontFamily: "Helvetica-Bold", marginTop: 8 },
          ]}
        >
          <Text style={CELL_NAME}>
            {labels.studentCount(data.entries.length)}
            {data.unmarkedCount > 0
              ? ` · ${labels.notMarked(data.unmarkedCount)}`
              : ""}
          </Text>
          <Text style={CELL_STATUS}>
            {labels.totals(data.presentCount, data.trainedCount)}
          </Text>
        </View>

        <Text style={pdfStyles.footer} fixed>
          {labels.footer(brand.orgName, data.courseName, date)}
        </Text>
      </Page>
    </Document>
  );
}
