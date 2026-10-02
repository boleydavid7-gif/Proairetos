import type { ItemKind } from '../life-items/kinds';

/**
 * Reading lists and events from other apps into things to capture. Every
 * row is shown to the person before anything is saved. Readers are plain
 * functions; nothing here touches storage or the network.
 */
export type ImportRow = {
  title: string;
  notes?: string;
  kind?: ItemKind;
  /** Local date, for something planned for a day. */
  plannedFor?: string;
  /** ISO times, for something at a time. */
  scheduledAt?: string;
  endsAt?: string;
  location?: string;
  /** Already finished in the other app. */
  done?: boolean;
};

export type ImportResult = { source: string; rows: ImportRow[]; note?: string };

const BULLET = /^\s*(?:[-*•·]|\d+[.)])\s*/;
const CHECKBOX = /^\s*\[( |x|X)\]\s*/;

/** One per line, as pasted or saved from a notes app. "[x]" marks something finished. */
export function fromText(text: string): ImportResult {
  const rows: ImportRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(BULLET, '');
    const box = CHECKBOX.exec(line);
    if (box) line = line.slice(box[0].length);
    line = line.trim();
    if (line) rows.push({ title: line, ...(box && box[1].toLowerCase() === 'x' ? { done: true } : {}) });
  }
  return { source: 'a list', rows };
}

/** CSV with quoted fields, commas or semicolons. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/;

function readDate(value: string | undefined): Pick<ImportRow, 'plannedFor' | 'scheduledAt'> {
  const match = value ? ISO_DATE.exec(value.trim()) : null;
  if (!match) return {};
  if (match[2]) return { scheduledAt: new Date(`${match[1]}T${match[2]}:00`).toISOString() };
  return { plannedFor: match[1] };
}

const column = (header: string[], names: string[]) => header.findIndex((cell) => names.includes(cell.trim().toLowerCase()));

/**
 * A spreadsheet or another app's CSV export (Todoist's included). Uses a
 * title column if there is one, else the first; dates are read only when
 * written as YYYY-MM-DD, so nothing is guessed.
 */
export function fromCsv(text: string): ImportResult {
  const table = parseCsv(text);
  if (table.length === 0) return { source: 'a spreadsheet', rows: [] };
  const header = table[0];
  const titleAt = column(header, ['content', 'title', 'name', 'task', 'subject', 'item', 'to do', 'todo']);
  const hasHeader = titleAt >= 0 || header.every((cell) => /^[a-z _-]*$/i.test(cell.trim()));
  const body = hasHeader ? table.slice(1) : table;
  const at = titleAt >= 0 ? titleAt : 0;
  const notesAt = hasHeader ? column(header, ['description', 'notes', 'note', 'details']) : -1;
  const dateAt = hasHeader ? column(header, ['date', 'due', 'due date', 'deadline', 'start date']) : -1;
  const doneAt = hasHeader ? column(header, ['completed', 'done', 'status', 'complete']) : -1;
  const typeAt = hasHeader ? column(header, ['type']) : -1;
  const todoist = typeAt >= 0 && column(header, ['content']) >= 0;

  const rows: ImportRow[] = [];
  for (const cells of body) {
    // Todoist marks sections and notes in a TYPE column; only tasks become things.
    if (todoist && cells[typeAt]?.trim().toLowerCase() !== 'task') continue;
    const title = cells[at]?.trim();
    if (!title) continue;
    const done = doneAt >= 0 && /^(true|yes|y|1|x|done|completed)$/i.test(cells[doneAt]?.trim() ?? '');
    const notes = notesAt >= 0 ? cells[notesAt]?.trim() : undefined;
    rows.push({
      title,
      ...(notes ? { notes } : {}),
      ...readDate(dateAt >= 0 ? cells[dateAt] : undefined),
      ...(done ? { done } : {}),
    });
  }
  return { source: todoist ? 'Todoist' : 'a spreadsheet', rows };
}

type GoogleTask = { title?: string; notes?: string; due?: string; status?: string; deleted?: boolean };

/** Google Tasks, from Google Takeout (Tasks.json). */
export function fromGoogleTasks(json: unknown): ImportResult | undefined {
  const lists = (json as { items?: { title?: string; items?: GoogleTask[] }[] })?.items;
  if (!Array.isArray(lists) || !lists.some((list) => Array.isArray(list?.items))) return undefined;
  const rows: ImportRow[] = [];
  for (const list of lists) {
    for (const task of list.items ?? []) {
      const title = task.title?.trim();
      if (!title || task.deleted) continue;
      rows.push({
        title,
        ...(task.notes?.trim() ? { notes: task.notes.trim() } : {}),
        // Google stores a due day as midnight UTC; the day is what was meant.
        ...(task.due ? { plannedFor: task.due.slice(0, 10) } : {}),
        ...(task.status === 'completed' ? { done: true } : {}),
      });
    }
  }
  return { source: 'Google Tasks', rows };
}

type CalendarEventLike = { key: string; title: string; start: Date; end: Date; allDay?: { from: string; until: string }; location?: string };

/**
 * Events from a calendar file become things with a time. Repeating events
 * are left out: they read better as a linked calendar under Other calendars.
 */
export function fromCalendarEvents(events: readonly CalendarEventLike[]): ImportResult {
  const perUid = new Map<string, number>();
  for (const event of events) {
    const uid = event.key.slice(0, event.key.lastIndexOf(':'));
    perUid.set(uid, (perUid.get(uid) ?? 0) + 1);
  }
  let repeating = 0;
  const rows: ImportRow[] = [];
  for (const event of events) {
    const uid = event.key.slice(0, event.key.lastIndexOf(':'));
    if ((perUid.get(uid) ?? 0) > 1) {
      repeating += 1;
      continue;
    }
    rows.push({
      title: event.title,
      ...(event.location ? { location: event.location } : {}),
      ...(event.allDay
        ? { plannedFor: event.allDay.from }
        : { scheduledAt: event.start.toISOString(), ...(event.end > event.start ? { endsAt: event.end.toISOString() } : {}) }),
    });
  }
  const groups = [...perUid.values()].filter((count) => count > 1).length;
  return {
    source: 'a calendar file',
    rows,
    ...(repeating > 0
      ? { note: `${groups === 1 ? '1 repeating event was' : `${groups} repeating events were`} left out. To see them, add the calendar under Settings > Other calendars.` }
      : {}),
  };
}

export type ImportFormat = 'ics' | 'csv' | 'google' | 'text';

/** Which reader fits, from the file name and a look at the start of the text. */
export function detectFormat(text: string, fileName = ''): ImportFormat {
  const name = fileName.toLowerCase();
  if (name.endsWith('.ics') || /^\s*BEGIN:VCALENDAR/i.test(text)) return 'ics';
  if (name.endsWith('.json') || /^\s*[{[]/.test(text)) return 'google';
  if (name.endsWith('.csv')) return 'csv';
  return 'text';
}
