import { Document, Page, Text, View } from "@react-pdf/renderer";

import { formatDate } from "@/lib/utils";

import { PdfBrandHeader, pdfStyles, type PdfBrand } from "./brand";

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

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Present",
  LATE: "Late",
  EXCUSED: "Excused",
  ABSENT: "Absent",
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

function statusLabel(status: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

export function AttendanceSheetPdfDocument({
  brand,
  data,
}: {
  brand: PdfBrand;
  data: AttendanceSheetData;
}) {
  return (
    <Document
      title={`${data.courseName} — attendance ${formatDate(data.date)}`}
      author={brand.orgName}
    >
      <Page size="A4" style={pdfStyles.page}>
        <PdfBrandHeader brand={brand} />

        <View>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16 }}>
            Attendance — {data.courseName}
          </Text>
          <Text style={pdfStyles.muted}>
            {formatDate(data.date)} · {data.startTime}–{data.endTime} ·{" "}
            {data.locationName}
            {data.trainerName ? ` · Trainer: ${data.trainerName}` : ""}
          </Text>
          {data.status === "CANCELLED" ? (
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#b91c1c" }}>
              This session was cancelled.
            </Text>
          ) : null}
        </View>

        <Text style={pdfStyles.sectionTitle}>Roster</Text>
        <View style={pdfStyles.tableHeader}>
          <Text style={CELL_NAME}>Student</Text>
          <Text style={CELL_STATUS}>Status</Text>
        </View>
        {data.entries.length === 0 ? (
          <Text style={pdfStyles.muted}>No students assigned.</Text>
        ) : (
          data.entries.map((entry, index) => (
            <View key={index} style={pdfStyles.tableRow} wrap={false}>
              <Text style={CELL_NAME}>{entry.name}</Text>
              <Text style={CELL_STATUS}>{statusLabel(entry.status)}</Text>
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
            {data.entries.length} student
            {data.entries.length === 1 ? "" : "s"}
            {data.unmarkedCount > 0
              ? ` · ${data.unmarkedCount} not marked`
              : ""}
          </Text>
          <Text style={CELL_STATUS}>
            {data.presentCount} present · {data.trainedCount} trained
          </Text>
        </View>

        <Text style={pdfStyles.footer} fixed>
          {brand.orgName} — attendance for {data.courseName} on{" "}
          {formatDate(data.date)}
        </Text>
      </Page>
    </Document>
  );
}
