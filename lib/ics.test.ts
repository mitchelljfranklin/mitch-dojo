import { describe, expect, it } from "vitest";

import { buildIcs, formatIcsDateTime } from "./ics";

describe("formatIcsDateTime", () => {
  it("formats a local wall-clock timestamp", () => {
    expect(formatIcsDateTime(new Date(2026, 8, 15, 18, 30, 0))).toBe(
      "20260915T183000",
    );
  });
});

describe("buildIcs", () => {
  const event = {
    uid: "session-1@mitch-dojo",
    start: new Date(2026, 8, 15, 18, 0),
    end: new Date(2026, 8, 15, 19, 0),
    summary: "Karate, beginners; all ages",
    location: "Main Dojo",
  };

  it("wraps events in a VCALENDAR with LF-normalised CRLF line endings", () => {
    const ics = buildIcs([event], new Date(2026, 8, 1, 9, 0));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260915T180000");
    expect(ics).toContain("DTEND:20260915T190000");
    expect(ics).toContain("LOCATION:Main Dojo");
    // Commas/semicolons in the summary are escaped.
    expect(ics).toContain("SUMMARY:Karate\\, beginners\\; all ages");
  });

  it("folds content lines longer than 75 octets", () => {
    const longSummary = "A".repeat(120);
    const ics = buildIcs([{ ...event, summary: longSummary }]);
    const lines = ics.split("\r\n");
    const summaryLines = lines.filter(
      (line) => line.startsWith("SUMMARY") || line.startsWith(" "),
    );
    expect(summaryLines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
  });

  it("omits empty optional fields", () => {
    const ics = buildIcs([{ ...event, location: null, description: null }]);
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
  });
});
