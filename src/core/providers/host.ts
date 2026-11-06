import type { AppManifest } from '../apps/manifest';
import { enforceHome, enforceSearch, mayProvideHome, mayProvideCalendar, enforceCalendar, enforceNotices, mayProvideNotices, mayProvideSearch, type Rejection } from './policy';
import type { CalendarLine, HomeRow, NoticeLine, Provider, ProviderContext, SearchProjection } from './types';

/*
 * The one caller of providers. It checks that the app is added and usable, that the person has this capability on,
 * and that the manifest allows it, runs the provider, and cuts the output down to what the manifest permits.
 */

export type HostContext = ProviderContext & {
  /** The app is added in the Store and may be used (trial or bought). */
  isUsable(app: string): boolean;
  /** The person's switch for this app and capability (the default when never chosen). */
  enabled(app: string, capability: string): boolean;
  /**
   * Notices only: whether the person's own switch for this app's notices (Settings > Notifications) is on. There is no
   * other switch for notices. Absent means off, so a host built without it asks no provider.
   */
  noticeSwitch?(app: string): boolean;
};

export type SearchOutcome = { results: SearchProjection[]; rejected: Rejection[]; /** How long each provider that ran took, in milliseconds. */ timings: { app: string; ms: number; rows: number }[] };

export async function searchProjections(providers: readonly Provider<'search'>[], manifest: readonly AppManifest[], ctx: HostContext): Promise<SearchOutcome> {
  const results: SearchProjection[] = [];
  const rejected: Rejection[] = [];
  const timings: SearchOutcome['timings'] = [];
  for (const provider of providers) {
    const app = manifest.find((each) => each.id === provider.app);
    const refusal = mayProvideSearch(app, provider);
    if (refusal) {
      rejected.push(refusal);
      continue;
    }
    if (!ctx.isUsable(provider.app) || !ctx.enabled(provider.app, 'search')) continue;
    let output: SearchProjection[];
    const started = performance.now();
    try {
      output = await provider.read(ctx);
    } catch (error) {
      rejected.push({ app: provider.app, reason: `its provider could not read: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const cut = enforceSearch(app!, output, ctx.today);
    timings.push({ app: provider.app, ms: Math.round((performance.now() - started) * 100) / 100, rows: cut.kept.length });
    results.push(...cut.kept);
    rejected.push(...cut.rejected);
  }
  return { results, rejected, timings };
}

export type HomeOutcome = { rows: HomeRow[]; rejected: Rejection[]; timings: { app: string; ms: number; rows: number }[] };

/**
 * The lines the apps put on Today. A provider runs only for an app that is added and usable and that the person has
 * not set aside ("Apps on Today"), and only the lines of a summary survive (`enforceHome`).
 */
export async function homeRows(providers: readonly Provider<'home'>[], manifest: readonly AppManifest[], ctx: HostContext): Promise<HomeOutcome> {
  const rows: HomeRow[] = [];
  const rejected: Rejection[] = [];
  const timings: HomeOutcome['timings'] = [];
  for (const provider of providers) {
    const app = manifest.find((each) => each.id === provider.app);
    const refusal = mayProvideHome(app, provider);
    if (refusal) {
      rejected.push(refusal);
      continue;
    }
    if (!ctx.isUsable(provider.app) || !ctx.enabled(provider.app, 'home')) continue;
    const started = performance.now();
    let output: HomeRow[];
    try {
      output = await provider.read(ctx);
    } catch (error) {
      rejected.push({ app: provider.app, reason: `its provider could not read: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const cut = enforceHome(app!, output);
    timings.push({ app: provider.app, ms: Math.round((performance.now() - started) * 100) / 100, rows: cut.kept.length });
    rows.push(...cut.kept);
    rejected.push(...cut.rejected);
  }
  return { rows, rejected, timings };
}

export type CalendarOutcome = { lines: CalendarLine[]; rejected: Rejection[]; timings: { app: string; ms: number; rows: number }[] };

/**
 * The lines the apps put on the calendar for a visible range. A provider runs only for an app that is added and usable
 * and whose calendar the person has on, and only the lines of a calendar survive (`enforceCalendar`). The range is
 * `ctx.range`; a provider expands what repeats inside it and nothing beyond.
 */
export async function calendarLines(providers: readonly Provider<'calendar'>[], manifest: readonly AppManifest[], ctx: HostContext): Promise<CalendarOutcome> {
  const lines: CalendarLine[] = [];
  const rejected: Rejection[] = [];
  const timings: CalendarOutcome['timings'] = [];
  for (const provider of providers) {
    const app = manifest.find((each) => each.id === provider.app);
    const refusal = mayProvideCalendar(app, provider);
    if (refusal) {
      rejected.push(refusal);
      continue;
    }
    if (!ctx.isUsable(provider.app) || !ctx.enabled(provider.app, 'calendar')) continue;
    const started = performance.now();
    let output: CalendarLine[];
    try {
      output = await provider.read(ctx);
    } catch (error) {
      rejected.push({ app: provider.app, reason: `its provider could not read: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const cut = enforceCalendar(app!, output, ctx.range);
    timings.push({ app: provider.app, ms: Math.round((performance.now() - started) * 100) / 100, rows: cut.kept.length });
    lines.push(...cut.kept);
    rejected.push(...cut.rejected);
  }
  return { lines, rejected, timings };
}

export type NoticeOutcome = { notices: NoticeLine[]; rejected: Rejection[]; timings: { app: string; ms: number; rows: number }[] };

/**
 * The notices the apps put forward for the range in `ctx.range` (now until the end of the horizon). A provider runs only
 * for an app that is added and usable and whose notice switch the person has on, and only the notices of a notice survive
 * (`enforceNotices`). A key another app already used is dropped and reported, so a notice shows once.
 */
export async function noticeLines(providers: readonly Provider<'notices'>[], manifest: readonly AppManifest[], ctx: HostContext): Promise<NoticeOutcome> {
  const notices: NoticeLine[] = [];
  const rejected: Rejection[] = [];
  const timings: NoticeOutcome['timings'] = [];
  const range = ctx.range ?? { from: ctx.now, until: ctx.now };
  const taken = new Set<string>();
  for (const provider of providers) {
    const app = manifest.find((each) => each.id === provider.app);
    const refusal = mayProvideNotices(app, provider);
    if (refusal) {
      rejected.push(refusal);
      continue;
    }
    if (!ctx.isUsable(provider.app) || !(ctx.noticeSwitch?.(provider.app) ?? false)) continue;
    const started = performance.now();
    let output: NoticeLine[];
    try {
      output = await provider.read(ctx);
    } catch (error) {
      rejected.push({ app: provider.app, reason: `its provider could not read: ${error instanceof Error ? error.message : String(error)}` });
      continue;
    }
    const cut = enforceNotices(app!, output, range);
    const fresh = cut.kept.filter((line) => {
      if (!taken.has(line.key)) return true;
      rejected.push({ app: provider.app, reason: `a key another app already used (${line.key})` });
      return false;
    });
    fresh.forEach((line) => taken.add(line.key));
    timings.push({ app: provider.app, ms: Math.round((performance.now() - started) * 100) / 100, rows: fresh.length });
    notices.push(...fresh);
    rejected.push(...cut.rejected);
  }
  // An earlier key that is another notice's key would hide that notice, so such a notice loses its earlier keys and keeps its own.
  const current = new Set(notices.map((line) => line.key));
  const clean = notices.map((line) => {
    if (!line.also?.some((earlier) => current.has(earlier))) return line;
    rejected.push({ app: line.ref.app, reason: `an earlier key that is another notice\u2019s key (${line.key})` });
    const { also: _also, ...rest } = line;
    return rest;
  });
  return { notices: clean, rejected, timings };
}
