import { describe, expect, it } from "vitest";

import { shapeReportCard, type ReportCardInput } from "./report-card";

const BASE_INPUT: ReportCardInput = {
  studentName: "Sam Carter",
  photoDataUrl: null,
  belts: [
    {
      disciplineName: "Karate",
      beltName: "Yellow",
      colorHex: "#facc15",
      awardedAt: new Date("2026-06-01"),
    },
    {
      disciplineName: "Karate",
      beltName: "White",
      colorHex: "#e4e4e7",
      awardedAt: new Date("2026-01-15"),
    },
    {
      disciplineName: "Jujitsu",
      beltName: "White",
      colorHex: "#e4e4e7",
      awardedAt: new Date("2026-02-01"),
    },
  ],
  trainedTotal: 42,
  trainedLast30Days: 6,
  balanceCents: 9500,
  currency: "USD",
  generatedAt: new Date("2026-09-17"),
};

describe("shapeReportCard", () => {
  it("picks the most recent award per discipline as the current rank", () => {
    const data = shapeReportCard(BASE_INPUT);
    const karate = data.currentByDiscipline.find(
      (belt) => belt.disciplineName === "Karate",
    );
    const jujitsu = data.currentByDiscipline.find(
      (belt) => belt.disciplineName === "Jujitsu",
    );
    expect(karate?.beltName).toBe("Yellow");
    expect(jujitsu?.beltName).toBe("White");
    expect(data.currentByDiscipline).toHaveLength(2);
  });

  it("handles a student with no belt history", () => {
    const data = shapeReportCard({ ...BASE_INPUT, belts: [] });
    expect(data.currentByDiscipline).toHaveLength(0);
  });

  it("keeps counts and balance untouched", () => {
    const data = shapeReportCard(BASE_INPUT);
    expect(data.trainedTotal).toBe(42);
    expect(data.trainedLast30Days).toBe(6);
    expect(data.balanceCents).toBe(9500);
  });
});
