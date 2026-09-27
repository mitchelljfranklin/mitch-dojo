// Minimal iCalendar (RFC 5545) builder for "add to calendar" downloads. Times
// are emitted as local wall-clock (floating) values — the timetable is local
// by definition, and floating times avoid shipping a VTIMEZONE per export.

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string | null;
  description?: string | null;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Local wall-clock timestamp (no Z), e.g. 20260915T183000.
export function formatIcsDateTime(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold content lines at 75 octets per RFC 5545 (continuation lines start with
// a space). Byte-aware so multi-byte characters don't split mid-sequence.
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    // 74 to leave room for the leading space on continuations.
    if (currentBytes + charBytes > 74 && current.length > 0) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  if (current.length > 0) parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mitch-Dojo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(event.uid)}`);
    lines.push(`DTSTAMP:${formatIcsDateTime(now)}Z`);
    lines.push(`DTSTART:${formatIcsDateTime(event.start)}`);
    lines.push(`DTEND:${formatIcsDateTime(event.end)}`);
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
