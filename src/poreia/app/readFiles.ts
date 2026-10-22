import type { ExternalEvent } from '../../core/calendar/readIcs';
import { readConfirmation, type ReadBooking } from '../core/confirmations';
import type { BookingKind } from '../core/model';

/*
 * A booking from a file, read on the device: a screenshot or photo of a confirmation or boarding pass (the family's
 * photo reader), a PDF (its text, through the same PDF reader Theoria uses), a calendar invite (.ics, as airlines and
 * booking sites send), or a saved email, web page or text. Nothing is sent anywhere. Each reader loads only when used.
 */

export const BOOKING_FILES = 'image/*,application/pdf,.pdf,.ics,.eml,.txt,.html,.htm,text/calendar,message/rfc822,text/plain,text/html';

const isImage = (file: File) => file.type.startsWith('image/');
const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
const isIcs = (file: File) => file.type === 'text/calendar' || /\.ics$/i.test(file.name);

export const fitsBooking = (file: File) => isImage(file) || isPdf(file) || isIcs(file) || /\.(eml|txt|html?)$/i.test(file.name) || file.type.startsWith('text/');

/** A saved email's body as plain text: quoted-printable undone, HTML kept for its JSON-LD and words. */
export function emailText(raw: string): string {
  return raw
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** Words a page shows, with any schema.org JSON-LD kept whole for the reader. */
function pageText(html: string): string {
  const scripts = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  const words = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  return [...scripts, words].join('\n');
}

const KIND_WORDS: [RegExp, BookingKind][] = [
  [/\b(flight|boarding|airline|gate)\b/i, 'flight'],
  [/\b(hotel|check-?in|stay|apartment|airbnb)\b/i, 'stay'],
  [/\b(train|rail)\b/i, 'train'],
  [/\b(car rental|rental car|pick-?up)\b/i, 'car'],
  [/\b(tour)\b/i, 'tour'],
  [/\b(reservation|table)\b/i, 'food'],
];

const pad = (n: number) => String(n).padStart(2, '0');
const day = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const clock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** The first event of a calendar invite as a booking: title, dates and times, place. */
export function bookingFromEvent(event: ExternalEvent): ReadBooking {
  const kind = KIND_WORDS.find(([words]) => words.test(`${event.title} ${event.location ?? ''}`))?.[1] ?? 'event';
  if (event.allDay) {
    const last = new Date(`${event.allDay.until}T12:00:00`);
    last.setDate(last.getDate() - 1);
    return { kind, title: event.title, startDate: event.allDay.from, endDate: day(last) > event.allDay.from ? day(last) : undefined, address: event.location };
  }
  return { kind, title: event.title, startDate: day(event.start), startTime: clock(event.start), endDate: day(event.end), endTime: clock(event.end), address: event.location };
}

/** What a file says, as words for the confirmation reader (or a booking straight from an invite). */
export async function readBookingFile(file: File, onProgress?: (share: number) => void): Promise<{ booking?: ReadBooking; text: string }> {
  if (isImage(file)) {
    const { readPhotoText } = await import('../../app/family/ocr');
    const text = await readPhotoText(file, onProgress);
    return { booking: readConfirmation(text), text };
  }
  if (isPdf(file)) {
    const { pdfText } = await import('../../theoria/data/pdf');
    const { chapters } = await pdfText(await file.arrayBuffer());
    const text = chapters.map((chapter) => chapter.content ?? '').join('\n');
    return { booking: readConfirmation(text), text };
  }
  const raw = await file.text();
  if (isIcs(file) || /BEGIN:VCALENDAR/.test(raw)) {
    const { readIcs } = await import('../../core/calendar/readIcs');
    const events = readIcs(raw, { start: new Date(Date.now() - 365 * 86_400_000), end: new Date(Date.now() + 2 * 365 * 86_400_000) });
    const description = raw.match(/DESCRIPTION:([\s\S]*?)\r?\n[A-Z-]+[:;]/)?.[1]?.replace(/\r?\n /g, '').replace(/\\n/g, '\n') ?? '';
    const fromWords = description ? readConfirmation(description) : undefined;
    if (events[0]) return { booking: { ...bookingFromEvent(events[0]), ...(fromWords?.confirmation ? { confirmation: fromWords.confirmation } : {}), ...(fromWords?.provider ? { provider: fromWords.provider } : {}) }, text: description };
    return { booking: fromWords, text: description };
  }
  const text = /<html|<body|<div/i.test(raw) ? pageText(emailText(raw)) : emailText(raw);
  return { booking: readConfirmation(text), text };
}
