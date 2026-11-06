import type { AppManifest } from '../apps/manifest';
import { refKey, type CalendarLine, type HomeRow, type Provider, type SearchProjection } from './types';

/*
 * The enforcement. A provider is not trusted: whatever it returns is cut down to what the manifest allows for its app
 * before anything else sees it. Unknown fields are rejected, not passed through.
 */

export type Rejection = { app: string; reason: string };

const DAY = 86_400_000;

const dayOf = (value: string): string => value.slice(0, 10);

/** The first day inside a rolling window of `days` days ending today (today counts as day one). */
export function windowStart(today: string, days: number): string {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - (days - 1) * DAY).toISOString().slice(0, 10);
}

/** Whether a provider's output is allowed to reach universal search at all. */
export function mayProvideSearch(app: AppManifest | undefined, provider: Provider<'search'>): Rejection | null {
  if (!app) return { app: provider.app, reason: 'not in the manifest' };
  if (app.status === 'retired') return { app: app.id, reason: 'retired apps provide nothing' };
  if (!app.provides?.includes('search')) return { app: app.id, reason: 'the manifest does not list search for this app' };
  if (!app.search) return { app: app.id, reason: 'its search fields are not classified' };
  // Private never leaves its app, and shared is not built yet: only the person's own search is open.
  if (provider.privacy !== 'own-search' || app.search.privacy !== 'own-search') return { app: app.id, reason: `class ${provider.privacy} is not available to universal search` };
  return null;
}

/** Cuts a provider's search output down to the manifest's allowed fields and window. */
export function enforceSearch(app: AppManifest, projections: readonly SearchProjection[], today: string): { kept: SearchProjection[]; rejected: Rejection[] } {
  const rules = app.search!;
  const allowed = new Set(rules.indexes);
  const excluded = new Set(rules.excludes);
  const rejected: Rejection[] = [];
  const kept: SearchProjection[] = [];
  const start = rules.windowDays ? windowStart(today, rules.windowDays) : undefined;
  const seen = new Set<string>();
  for (const projection of projections) {
    if (projection.ref.app !== app.id) {
      rejected.push({ app: app.id, reason: `a record that belongs to ${projection.ref.app}` });
      continue;
    }
    if (!allowed.has(projection.titleField) || excluded.has(projection.titleField)) {
      rejected.push({ app: app.id, reason: `title field "${projection.titleField}" is not allowed` });
      continue;
    }
    if (start && dayOf(projection.at) < start) continue;
    const key = refKey(projection.ref);
    if (seen.has(key)) {
      rejected.push({ app: app.id, reason: `the same record twice (${key})` });
      continue;
    }
    seen.add(key);
    const fields = projection.fields.filter((field) => {
      if (allowed.has(field.name) && !excluded.has(field.name)) return true;
      rejected.push({ app: app.id, reason: `field "${field.name}" is not allowed` });
      return false;
    });
    kept.push({ ...projection, fields });
  }
  return { kept, rejected };
}

/** Whether a provider's output may reach Today at all. */
export function mayProvideHome(app: AppManifest | undefined, provider: Provider<'home'>): Rejection | null {
  if (!app) return { app: provider.app, reason: 'not in the manifest' };
  if (app.status === 'retired') return { app: app.id, reason: 'retired apps provide nothing' };
  if (!app.provides?.includes('home')) return { app: app.id, reason: 'the manifest does not list home for this app' };
  if (!app.home || !app.today?.group) return { app: app.id, reason: 'its lines on Today are not classified' };
  // Only the person's own Today: private never leaves its app, and shared is not built.
  if (provider.privacy === 'private' || provider.privacy === 'shared') return { app: app.id, reason: `class ${provider.privacy} is not available to Today` };
  return null;
}

const HOME_KEYS = new Set(['ref', 'group', 'title', 'detail', 'open', 'icon', 'progress', 'swipe', 'notForMe']);
const ICONS = new Set(['list', 'person', 'suitcase']);

/**
 * Cuts a provider's lines for Today down to what a line may be: the app's own, in the app's own group, with only the
 * keys of a summary, a way in that stays inside the app, and no repeat of another line (so nothing appears twice).
 */
export function enforceHome(app: AppManifest, rows: readonly HomeRow[]): { kept: HomeRow[]; rejected: Rejection[] } {
  const kept: HomeRow[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();
  const no = (reason: string) => rejected.push({ app: app.id, reason });
  for (const row of rows) {
    const extra = Object.keys(row).filter((key) => !HOME_KEYS.has(key));
    if (extra.length) { no(`a line with ${extra.join(', ')}, which a line may not carry`); continue; }
    if (row.ref.app !== app.id) { no(`a line about ${row.ref.app}`); continue; }
    if (row.group !== app.today?.group) { no(`a line in the ${row.group} group; the manifest says ${app.today?.group}`); continue; }
    if (typeof row.detail !== 'string' || (row.title !== undefined && typeof row.title !== 'string')) { no('a line whose words are not text'); continue; }
    if (typeof row.open !== 'string' || !row.open.startsWith(app.urls.href) || row.open.includes('//')) { no(`a line that opens ${String(row.open)}, outside ${app.urls.href}`); continue; }
    if (row.icon !== undefined && !ICONS.has(row.icon)) { no(`a glyph ${String(row.icon)}`); continue; }
    if (row.progress && !(Number.isFinite(row.progress.value) && row.progress.value >= 0 && row.progress.value <= 1 && typeof row.progress.label === 'string')) { no('a progress that is not between 0 and 1'); continue; }
    if (row.swipe && (typeof row.swipe.id !== 'string' || !row.swipe.id)) { no('a pull with no id'); continue; }
    const key = refKey(row.ref) + '|' + (row.swipe?.id ?? '');
    if (seen.has(key)) { no(`the same line twice (${key})`); continue; }
    seen.add(key);
    kept.push(row);
  }
  return { kept, rejected };
}

/** Whether a provider's output may reach the calendar at all. */
export function mayProvideCalendar(app: AppManifest | undefined, provider: Provider<'calendar'>): Rejection | null {
  if (!app) return { app: provider.app, reason: 'not in the manifest' };
  if (app.status === 'retired') return { app: app.id, reason: 'retired apps provide nothing' };
  if (!app.provides?.includes('calendar')) return { app: app.id, reason: 'the manifest does not list calendar for this app' };
  if (!app.calendar) return { app: app.id, reason: 'its calendar lines are not classified' };
  // The person's own calendar: private never leaves its app, and shared is not built.
  if (provider.privacy === 'private' || provider.privacy === 'shared') return { app: app.id, reason: `class ${provider.privacy} is not available to the calendar` };
  return null;
}

const CALENDAR_KEYS = new Set(['ref', 'kind', 'title', 'detail', 'open', 'day', 'until', 'start', 'end', 'location', 'done', 'color']);
const KINDS = new Set(['event', 'deadline', 'recurring', 'info']);
const COLORS = new Set(['amber', 'violet', 'sage', 'sky', 'rose', 'slate']);
const DAY_FORM = /^\d{4}-\d{2}-\d{2}$/;
const localDay = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

/**
 * Cuts a provider's lines for the calendar down to what a line may be: the app's own, of a kind the manifest lists,
 * with only the keys of a line, real days (a span ends after it starts), a time only on an event, a way in that stays
 * inside the app, and no repeat of another line, so a record shows once. A line outside the visible range is dropped.
 */
export function enforceCalendar(app: AppManifest, lines: readonly CalendarLine[], range?: { from: Date; until: Date }): { kept: CalendarLine[]; rejected: Rejection[] } {
  const kept: CalendarLine[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();
  const no = (reason: string) => rejected.push({ app: app.id, reason });
  const fromDay = range && localDay(range.from);
  const untilDay = range && localDay(range.until);
  for (const line of lines) {
    const extra = Object.keys(line).filter((key) => !CALENDAR_KEYS.has(key));
    if (extra.length) { no(`a line with ${extra.join(', ')}, which a calendar line may not carry`); continue; }
    if (line.ref.app !== app.id) { no(`a line about ${line.ref.app}`); continue; }
    if (!KINDS.has(line.kind) || !app.calendar?.kinds.includes(line.kind)) { no(`a ${String(line.kind)} line; the manifest lists ${app.calendar?.kinds.join(', ')}`); continue; }
    if (typeof line.title !== 'string' || !line.title || (line.detail !== undefined && typeof line.detail !== 'string') || (line.location !== undefined && typeof line.location !== 'string')) { no('a line whose words are not text'); continue; }
    if (typeof line.open !== 'string' || !line.open.startsWith(app.urls.href) || line.open.includes('//')) { no(`a line that opens ${String(line.open)}, outside ${app.urls.href}`); continue; }
    if (typeof line.day !== 'string' || !DAY_FORM.test(line.day)) { no(`a line on ${String(line.day)}, which is not a day`); continue; }
    if (line.until !== undefined && (typeof line.until !== 'string' || !DAY_FORM.test(line.until) || line.until <= line.day)) { no('a span that does not end after it starts'); continue; }
    if (line.kind === 'event') {
      const timed = line.start instanceof Date && line.end instanceof Date && !Number.isNaN(line.start.getTime()) && !Number.isNaN(line.end.getTime()) && line.end > line.start;
      if (!timed) { no('an event with no valid time'); continue; }
      if (localDay(line.start!) !== line.day || line.until !== undefined) { no('an event whose day is not the day it starts'); continue; }
    } else if (line.start !== undefined || line.end !== undefined) { no(`a ${line.kind} line with a time`); continue; }
    if (line.done !== undefined && typeof line.done !== 'boolean') { no('a line whose met state is not yes or no'); continue; }
    if (line.color !== undefined && !COLORS.has(line.color)) { no(`a color ${String(line.color)}`); continue; }
    const key = `${refKey(line.ref)}|${line.day}`;
    if (seen.has(key)) { no(`the same line twice (${key})`); continue; }
    seen.add(key);
    if (range && fromDay && untilDay) {
      const last = line.start && line.end ? localDay(new Date(line.end.getTime() - 1)) : line.until ? line.until : line.day;
      const inside = line.start && line.end ? line.start < range.until && line.end > range.from : line.until ? line.day < untilDay && last > fromDay : line.day >= fromDay && line.day < untilDay;
      if (!inside) continue;
    }
    kept.push(line);
  }
  return { kept, rejected };
}
