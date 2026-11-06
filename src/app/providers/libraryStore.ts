import type { AppId, AppManifest } from '../../core/apps/manifest';
import type { LifeRecord } from '../../core/life-records/contract';
import { libraryRecords, sourceChanged, visibleInLibrary, type HostContext, type Provider } from '../../core/providers';
import { toLocalDate } from '../../core/scheduling/dates';

/*
 * What the apps put in the Library, kept per app. An app's entries are derived when the Library is shown (only for an app that is
 * added and usable), and again only when something that app reads changes, its own records change here, the day turns over, or its
 * result is older than its age limit. One app's change never derives another's entries. Nothing is stored: the entries are held in
 * memory while the Library is open and dropped when it is left; they are rebuilt from the records already on the device and are never
 * written to browser storage, a cache or sync.
 */
export const LIBRARY_MAX_AGE_MS = 5 * 60_000;

export type LibraryDeps = {
  manifest: readonly AppManifest[];
  /** The Library providers of an app (its module, loaded now). */
  load(app: AppId): Promise<readonly Provider<'library'>[]>;
  /** A context for deriving: the clock and the device's records. */
  context(now: Date): HostContext;
  usable(app: string): boolean;
  enabled(app: string): boolean;
  /** A sync changed these collections (and records in them). */
  onSynced(listener: (collections: readonly string[], ids?: ReadonlyMap<string, readonly string[]>) => void): () => void;
  /** The person's choices changed (apps added or removed, provider choices). */
  onChoices(listener: () => void): () => void;
  now(): Date;
};

type Entry = { providers: readonly Provider<'library'>[]; records: LifeRecord[]; stale: boolean; at: number; day: string; offs: (() => void)[]; run: number };

export function createLibraryStore(deps: LibraryDeps) {
  const entries = new Map<AppId, Entry>();
  const listeners = new Set<() => void>();
  let version = 0;
  let all: LifeRecord[] = [];
  let started: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let working = Promise.resolve();
  const derivations: { app: string; ms: number }[] = [];

  const order = (id: AppId) => deps.manifest.findIndex((app) => app.id === id);
  const eligible = () =>
    deps.manifest.filter((app) => app.status !== 'retired' && app.provides?.includes('library') && deps.usable(app.id) && deps.enabled(app.id)).map((app) => app.id);

  function publish() {
    // An entry two apps gave under one key is listed once (the first app in the manifest's order).
    const seen = new Set<string>();
    const next = [...entries.entries()]
      .sort((a, b) => order(a[0]) - order(b[0]))
      .flatMap(([, entry]) => entry.records)
      .filter((record) => (seen.has(record.key) ? false : (seen.add(record.key), true)));
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

  const maxAge = (entry: Entry) => Math.min(LIBRARY_MAX_AGE_MS, ...entry.providers.map((provider) => provider.maxAgeMs ?? LIBRARY_MAX_AGE_MS));

  async function derive(app: AppId, entry: Entry) {
    const now = deps.now();
    const run = ++entry.run;
    entry.stale = false;
    entry.at = now.getTime();
    entry.day = toLocalDate(now);
    const started = performance.now();
    const out = await libraryRecords(entry.providers, deps.manifest, deps.context(now));
    if (run !== entry.run || entries.get(app) !== entry) return;
    entry.records = out.records;
    const ms = Math.round((performance.now() - started) * 100) / 100;
    derivations.push({ app, ms });
    try {
      performance.mark(`provider-derive:library:${app}`, { detail: { ms } });
    } catch {
      // Marking is optional.
    }
  }

  /** Brings the set of apps in step with the person's choices, then derives what is stale. */
  async function refresh() {
    // Nothing is derived while the Library is not showing.
    if (listeners.size === 0) return;
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
      const entry: Entry = { providers, records: [], stale: true, at: 0, day: '', offs: [], run: 0 };
      for (const provider of providers) {
        const off = provider.subscribe?.(() => {
          entry.stale = true;
          schedule();
        });
        if (off) entry.offs.push(off);
      }
      entries.set(app, entry);
    }
    const now = deps.now();
    const today = toLocalDate(now);
    for (const [app, entry] of entries) {
      if (entry.stale || entry.day !== today || now.getTime() - entry.at > maxAge(entry)) await derive(app, entry);
    }
    publish();
  }

  function start() {
    started = [
      deps.onSynced((collections, ids) => {
        for (const entry of entries.values()) if (entry.providers.some((provider) => sourceChanged(provider.sources, collections, ids))) entry.stale = true;
        schedule();
      }),
      // A choice (an app added or removed) changes which entries show even when none changed, so what is listed is read again.
      deps.onChoices(() => {
        version += 1;
        listeners.forEach((listener) => listener());
        schedule();
      }),
    ];
    if (typeof document !== 'undefined') {
      const onShow = () => {
        if (document.visibilityState === 'visible') schedule();
      };
      document.addEventListener('visibilitychange', onShow);
      started.push(() => document.removeEventListener('visibilitychange', onShow));
    }
    // A slow check, so a day that turns over is noticed.
    const tick = setInterval(schedule, 60_000);
    started.push(() => clearInterval(tick));
  }

  function stop() {
    started.forEach((off) => off());
    started = [];
    for (const entry of entries.values()) entry.offs.forEach((off) => off());
    entries.clear();
    all = [];
    version += 1;
  }

  return {
    subscribe(listener: () => void) {
      if (listeners.size === 0) {
        start();
        schedule();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stop();
      };
    },
    version: () => version,
    /** The entries the apps give, in memory. */
    records: () => all,
    /**
     * `own` (what Proairetos itself lists, including reflections written from an app's prompt) and the apps' entries together, with
     * the entries of an app that is not added and usable left out. Nothing is changed or deleted; they return with the app.
     */
    visible: (own: readonly LifeRecord[]) => visibleInLibrary([...own, ...all], (app) => deps.usable(app) && deps.enabled(app)),
    /** For a test or a measurement: waits until the store has caught up. */
    settled: async () => {
      schedule();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await working;
      await working;
    },
    derivations: () => derivations.slice(),
    /** Marks an app's entries out of date (a sync or record change the store was not told of). */
    invalidate(app?: AppId) {
      for (const [id, entry] of entries) if (!app || id === app) entry.stale = true;
      schedule();
    },
  };
}

export type LibraryStore = ReturnType<typeof createLibraryStore>;
