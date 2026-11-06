import type { AppId, AppManifest } from '../../core/apps/manifest';
import { calendarLines, sourceChanged, type CalendarLine, type HostContext, type Provider } from '../../core/providers';
import { toLocalDate } from '../../core/scheduling/dates';

/*
 * What the apps put on the calendar, kept per app and per visible range. An app's lines for a range are derived when the
 * calendar asks for them (only for an app that is added and usable), and again only when something that app reads
 * changes, its own records change here, the day turns over, or the lines are older than the age limit. One app's change
 * never derives another's lines. Nothing is stored: results are held in memory and rebuilt from records already on the
 * device. A repeating date is expanded by the provider inside the range asked for, never beyond it.
 */
export const CALENDAR_MAX_AGE_MS = 5 * 60_000;
/** How many ranges an app keeps at once (the ones the person has been moving between). */
const RANGES_KEPT = 6;

export type CalendarRange = { from: Date; until: Date };

export type CalendarDeps = {
  manifest: readonly AppManifest[];
  load(app: AppId): Promise<readonly Provider<'calendar'>[]>;
  context(range: CalendarRange, now: Date): HostContext;
  usable(app: string): boolean;
  enabled(app: string): boolean;
  onSynced(listener: (collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void): () => void;
  onChoices(listener: () => void): () => void;
  now(): Date;
};

type Held = { lines: CalendarLine[]; at: number; day: string; stale: boolean };
type Entry = { providers: readonly Provider<'calendar'>[]; ranges: Map<string, Held>; offs: (() => void)[] };

const rangeKey = (range: CalendarRange) => `${range.from.getTime()}|${range.until.getTime()}`;

export function createCalendarStore(deps: CalendarDeps) {
  const entries = new Map<AppId, Entry>();
  const listeners = new Set<() => void>();
  const derivations: { app: string; ms: number }[] = [];
  let started: (() => void)[] = [];
  let version = 0;
  let running = false;

  const order = (id: AppId) => deps.manifest.findIndex((app) => app.id === id);
  const eligible = () => deps.manifest.filter((app) => app.status !== 'retired' && app.provides?.includes('calendar') && deps.usable(app.id) && deps.enabled(app.id)).map((app) => app.id);
  const changed = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };
  const stale = (entry: Entry) => entry.ranges.forEach((held) => { held.stale = true; });
  const maxAge = (entry: Entry) => Math.min(CALENDAR_MAX_AGE_MS, ...entry.providers.map((provider) => provider.maxAgeMs ?? CALENDAR_MAX_AGE_MS));

  async function entryFor(app: AppId): Promise<Entry | undefined> {
    const known = entries.get(app);
    if (known) return known;
    const providers = await deps.load(app);
    if (!providers.length) return undefined;
    if (entries.has(app)) return entries.get(app);
    const entry: Entry = { providers, ranges: new Map(), offs: [] };
    // Once the calendar is being read, an app's own record changes reach it.
    if (running) watch(entry);
    entries.set(app, entry);
    return entry;
  }

  function watch(entry: Entry) {
    for (const provider of entry.providers) {
      const off = provider.subscribe?.(() => {
        stale(entry);
        changed();
      });
      if (off) entry.offs.push(off);
    }
  }

  async function derive(app: AppId, entry: Entry, range: CalendarRange): Promise<CalendarLine[]> {
    const now = deps.now();
    const key = rangeKey(range);
    const held = entry.ranges.get(key);
    const today = toLocalDate(now);
    if (held && !held.stale && held.day === today && now.getTime() - held.at <= maxAge(entry)) return held.lines;
    const started = performance.now();
    const out = await calendarLines(entry.providers, deps.manifest, { ...deps.context(range, now), range });
    const ms = Math.round((performance.now() - started) * 100) / 100;
    derivations.push({ app, ms });
    try {
      performance.mark(`provider-derive:calendar:${app}`, { detail: { ms } });
    } catch {
      // Marking is optional.
    }
    entry.ranges.delete(key);
    entry.ranges.set(key, { lines: out.lines, at: now.getTime(), day: today, stale: false });
    while (entry.ranges.size > RANGES_KEPT) entry.ranges.delete(entry.ranges.keys().next().value as string);
    return out.lines;
  }

  function start() {
    started = [
      deps.onSynced((collections, ids) => {
        let any = false;
        for (const entry of entries.values()) {
          if (entry.providers.some((provider) => sourceChanged(provider.sources, collections, ids))) {
            stale(entry);
            any = true;
          }
        }
        if (any) changed();
      }),
      deps.onChoices(() => {
        const wanted = eligible();
        for (const [app, entry] of entries) {
          if (wanted.includes(app)) continue;
          entry.offs.forEach((off) => off());
          entries.delete(app);
        }
        changed();
      }),
    ];
    for (const entry of entries.values()) watch(entry);
  }

  function stop() {
    started.forEach((off) => off());
    started = [];
    for (const entry of entries.values()) {
      entry.offs.forEach((off) => off());
      entry.offs = [];
    }
  }

  return {
    /** Tells the calendar's reader when any app's lines may have changed; the reader asks `lines` again. */
    subscribe(listener: () => void) {
      // Once started, the store keeps watching what its apps read, so moving between Today and Days ahead reuses what it holds.
      if (!running) {
        running = true;
        start();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** For a test: stops watching and forgets what is held. */
    dispose() {
      stop();
      running = false;
      entries.clear();
      listeners.clear();
    },
    version: () => version,
    /** Every eligible app's lines inside a range (or only those of `only`), in the manifest's order; only what is missing or out of date is derived. */
    async lines(range: CalendarRange, only?: readonly AppId[]): Promise<CalendarLine[]> {
      const out: CalendarLine[] = [];
      const all = eligible();
      const wanted = (only ? all.filter((app) => only.includes(app)) : all).sort((a, b) => order(a) - order(b));
      for (const app of entries.keys()) if (!all.includes(app)) {
        entries.get(app)?.offs.forEach((off) => off());
        entries.delete(app);
      }
      for (const app of wanted) {
        const entry = await entryFor(app);
        if (entry) out.push(...(await derive(app, entry, range)));
      }
      return out;
    },
    derivations: () => derivations.slice(),
    /** Marks an app's lines out of date (a change the store was not told of). */
    invalidate(app?: AppId) {
      for (const [id, entry] of entries) if (!app || id === app) stale(entry);
      changed();
    },
  };
}

export type CalendarStore = ReturnType<typeof createCalendarStore>;
