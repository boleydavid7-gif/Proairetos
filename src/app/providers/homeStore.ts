import type { AppId, AppManifest } from '../../core/apps/manifest';
import { homeRows, sourceChanged, type HomeRow, type HostContext, type Provider } from '../../core/providers';

/*
 * What the apps put on Today, kept per app. An app's lines are derived when Today starts (only for an app that is added,
 * usable and not set aside), and again only when something that app reads changes, its own records change here, the
 * person's day turns over, or its result is older than it should be. One app's change never derives another's lines.
 * Nothing is stored: the lines are held in memory and rebuilt from the records already on the device.
 */
export const HOME_MAX_AGE_MS = 5 * 60_000;

export type HomeDay = { today: string; start: Date; end: Date };

export type HomeDeps = {
  manifest: readonly AppManifest[];
  /** The home providers of an app (its module, loaded now). */
  load(app: AppId): Promise<readonly Provider<'home'>[]>;
  /** A context for deriving: the day Today is showing, the clock, the device's records. */
  context(day: HomeDay, now: Date): HostContext;
  usable(app: string): boolean;
  enabled(app: string): boolean;
  /** A sync changed these collections (and records in them). */
  onSynced(listener: (collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void): () => void;
  /** The person's choices changed (apps added or removed, Apps on Today). */
  onChoices(listener: () => void): () => void;
  now(): Date;
};

type Entry = { providers: readonly Provider<'home'>[]; rows: HomeRow[]; stale: boolean; at: number; day: string; offs: (() => void)[]; run: number };

export function createHomeStore(deps: HomeDeps) {
  const entries = new Map<AppId, Entry>();
  const listeners = new Set<() => void>();
  let day: HomeDay | undefined;
  let version = 0;
  let all: HomeRow[] = [];
  let started: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let working = Promise.resolve();
  const derivations: { app: string; ms: number }[] = [];

  const order = (id: AppId) => deps.manifest.find((app) => app.id === id)?.today?.order ?? 99;
  const eligible = () =>
    deps.manifest.filter((app) => app.status !== 'retired' && app.provides?.includes('home') && deps.usable(app.id) && deps.enabled(app.id)).map((app) => app.id);

  function publish() {
    const next = [...entries.entries()].sort((a, b) => order(a[0]) - order(b[0])).flatMap(([, entry]) => entry.rows);
    if (JSON.stringify(next) === JSON.stringify(all)) return;
    all = next;
    version += 1;
    listeners.forEach((listener) => listener());
  }

  function schedule() {
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      working = working.then(refresh, refresh);
    }, 0);
  }

  const maxAge = (entry: Entry) => Math.min(HOME_MAX_AGE_MS, ...entry.providers.map((provider) => provider.maxAgeMs ?? HOME_MAX_AGE_MS));

  async function derive(app: AppId, entry: Entry) {
    if (!day) return;
    const now = deps.now();
    const run = ++entry.run;
    entry.stale = false;
    entry.at = now.getTime();
    entry.day = day.today;
    const ctx = deps.context(day, now);
    const started = performance.now();
    const out = await homeRows(entry.providers, deps.manifest, ctx);
    if (run !== entry.run || entries.get(app) !== entry) return;
    entry.rows = out.rows;
    const ms = Math.round((performance.now() - started) * 100) / 100;
    derivations.push({ app, ms });
    try {
      performance.mark(`provider-derive:home:${app}`, { detail: { ms } });
    } catch {
      // Marking is optional.
    }
  }

  /** Brings the set of apps in step with the person's choices, then derives what is stale. */
  async function refresh() {
    // Nothing is derived while Today is not showing.
    if (!day || listeners.size === 0) return;
    const wanted = eligible();
    for (const [app, entry] of entries) {
      if (!wanted.includes(app)) {
        entry.offs.forEach((off) => off());
        entries.delete(app);
      }
    }
    for (const app of wanted) {
      if (entries.has(app)) continue;
      const providers = await deps.load(app);
      if (!providers.length || entries.has(app)) continue;
      const entry: Entry = { providers, rows: [], stale: true, at: 0, day: '', offs: [], run: 0 };
      for (const provider of providers) {
        const off = provider.subscribe?.(() => {
          entry.stale = true;
          schedule();
        });
        if (off) entry.offs.push(off);
      }
      entries.set(app, entry);
    }
    const now = deps.now().getTime();
    for (const [app, entry] of entries) {
      if (entry.stale || entry.day !== day.today || now - entry.at > maxAge(entry)) await derive(app, entry);
    }
    publish();
  }

  function warm() {
    if (!day) return;
    const ctx = deps.context(day, deps.now());
    for (const entry of entries.values()) for (const provider of entry.providers) provider.warm?.(ctx);
  }

  function start() {
    started = [
      deps.onSynced((collections, ids) => {
        for (const entry of entries.values()) if (entry.providers.some((provider) => sourceChanged(provider.sources, collections, ids))) entry.stale = true;
        warm();
        schedule();
      }),
      deps.onChoices(() => schedule()),
    ];
    if (typeof document !== 'undefined') {
      const onShow = () => {
        if (document.visibilityState !== 'visible') return;
        warm();
        schedule();
      };
      document.addEventListener('visibilitychange', onShow);
      started.push(() => document.removeEventListener('visibilitychange', onShow));
    }
    // A slow check, so a line that depends on the clock (Poreia's next thing) and a day that turns over are noticed.
    const tick = setInterval(schedule, 60_000);
    started.push(() => clearInterval(tick));
  }

  function stop() {
    started.forEach((off) => off());
    started = [];
    for (const entry of entries.values()) entry.offs.forEach((off) => off());
    entries.clear();
    all = [];
  }

  return {
    /** Tells the store which day Today shows; a different day derives everything again. */
    setDay(next: HomeDay) {
      const changed = !day || day.today !== next.today || day.start.getTime() !== next.start.getTime() || day.end.getTime() !== next.end.getTime();
      day = next;
      if (changed) {
        for (const entry of entries.values()) entry.stale = true;
        schedule();
      }
    },
    subscribe(listener: () => void) {
      if (listeners.size === 0) {
        start();
        warm();
        schedule();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },
    version: () => version,
    rows: (group?: HomeRow['group']) => (group ? all.filter((row) => row.group === group) : all),
    /** For a test or a measurement: waits until the store has caught up. */
    settled: async () => {
      schedule();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await working;
      await working;
    },
    derivations: () => derivations.slice(),
    /** The provider of an app's lines, once loaded (for a pull that marks). */
    provider: (app: string) => entries.get(app as AppId)?.providers.find((provider) => provider.act) ?? entries.get(app as AppId)?.providers[0],
    /** Marks an app's lines out of date (a sync or record change the store was not told of). */
    invalidate(app?: AppId) {
      for (const [id, entry] of entries) if (!app || id === app) entry.stale = true;
      schedule();
    },
  };
}

export type HomeStore = ReturnType<typeof createHomeStore>;
