/**
 * iCalendar (RFC 5545) text for a calendar feed: what Apple, Google, and
 * Microsoft calendars read from a subscription link or a downloaded file.
 */
export type CalendarEvent = {
  /** Stable across rebuilds, so calendars update an event instead of duplicating it. */
  uid: string;
  title: string;
  /** Timed event. */
  start?: Date;
  end?: Date;
  /** All-day event, local "YYYY-MM-DD". */
  date?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

function utcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

const dateValue = (date: string) => date.replace(/-/g, '');

function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

/** Text values escape backslash, semicolon, comma, and newlines. */
export function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 bytes continue on the next line after a space, never splitting a character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let limit = 75;
  for (const char of line) {
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
      limit = 74; // continuation lines start with a space
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(events: readonly CalendarEvent[], options: { name: string; now: Date }): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Proairetos//Calendar feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  const stamp = utcStamp(options.now);
  for (const event of events) {
    lines.push('BEGIN:VEVENT', `UID:${escapeText(event.uid)}@proairetos`, `DTSTAMP:${stamp}`);
    if (event.date) {
      lines.push(`DTSTART;VALUE=DATE:${dateValue(event.date)}`, `DTEND;VALUE=DATE:${nextDate(event.date)}`);
    } else if (event.start && event.end) {
      lines.push(`DTSTART:${utcStamp(event.start)}`, `DTEND:${utcStamp(event.end)}`);
    } else {
      continue;
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`, 'TRANSP:OPAQUE', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
