import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { directionAlong, transition, type Direction } from '../transitions';
import { onRemoteChanges, syncSoon } from '../sync/syncController';

/*
 * The shell the newer family apps share (Diaita, Philia, Ergon): routes with the phone's back button, sliding
 * tabs, one undo bar, a tab bar that becomes a rail on computers, settings kept in browser storage (so they go
 * with backups and, sealed, to the person's other devices), and a welcome page. The look comes from
 * askesis.css; each app sets its own colours on `:root.<app>`.
 */

// ---------- Settings in browser storage ----------

export type Stored<T> = {
  load: () => T;
  save: (next: T) => void;
  use: () => T;
};

/** A value kept under one key, merged over defaults, shared by every screen and every open tab. */
export function stored<T extends object>(key: string, defaults: () => T): Stored<T> {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | undefined;
  const load = (): T => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cache?.value ?? defaults();
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = defaults();
    try {
      if (raw) value = Array.isArray(value) ? (JSON.parse(raw) as T) : { ...value, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      // Unreadable: start from the defaults.
    }
    cache = { raw, value };
    return value;
  };
  const save = (next: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or blocked: shown until the page closes.
      cache = { raw: null, value: next };
    }
    listeners.forEach((listener) => listener());
    syncSoon();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => (event.key === key || event.key === null) && listener();
    window.addEventListener('storage', onStorage);
    const offSync = onRemoteChanges(listener);
    return () => {
      offSync();
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  };
  return { load, save, use: () => useSyncExternalStore(subscribe, load) };
}

export type Collection<T extends { id: string }> = {
  list: () => T[];
  get: (id: string) => T | undefined;
  put: (record: T) => void;
  remove: (id: string) => void;
  use: () => T[];
};

/**
 * Records kept one per key (`prefix` + id), so sync carries each on its own and an edit on one phone never
 * overwrites a different record edited on another.
 */
export function collection<T extends { id: string }>(prefix: string): Collection<T> {
  const listeners = new Set<() => void>();
  let cache: { signature: string; value: T[] } | undefined;
  const read = (): T[] => {
    const raws: string[] = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(prefix)) raws.push(localStorage.getItem(key) ?? '');
      }
    } catch {
      return cache?.value ?? [];
    }
    raws.sort();
    const signature = raws.join('\n');
    if (cache && cache.signature === signature) return cache.value;
    const value: T[] = [];
    for (const raw of raws) {
      try {
        const record = JSON.parse(raw) as T;
        if (record && typeof record.id === 'string') value.push(record);
      } catch {
        // An unreadable record is left where it is.
      }
    }
    cache = { signature, value };
    return value;
  };
  const changed = () => {
    listeners.forEach((listener) => listener());
    syncSoon();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith(prefix)) && listener();
    window.addEventListener('storage', onStorage);
    const offSync = onRemoteChanges(listener);
    return () => {
      offSync();
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  };
  return {
    list: read,
    get: (id) => read().find((record) => record.id === id),
    put: (record) => {
      try {
        localStorage.setItem(prefix + record.id, JSON.stringify(record));
      } catch {
        // Storage full or blocked.
      }
      changed();
    },
    remove: (id) => {
      try {
        localStorage.removeItem(prefix + id);
      } catch {
        // Nothing to remove.
      }
      changed();
    },
    use: () => useSyncExternalStore(subscribe, read),
  };
}

// ---------- Undo ----------

type Offer = { id: number; message: string; run?: () => void };
let offer: Offer | null = null;
let offerTimer = 0;
let offerCount = 0;
const offerListeners = new Set<() => void>();
const offerChanged = () => offerListeners.forEach((listener) => listener());

export function offerUndo(message: string, run?: () => void, seconds = 7): void {
  window.clearTimeout(offerTimer);
  offerCount += 1;
  offer = { id: offerCount, message, run };
  offerChanged();
  offerTimer = window.setTimeout(() => {
    offer = null;
    offerChanged();
  }, seconds * 1000);
}

/** A short message with no undo (a change that cannot be taken back, or plain news). */
export function say(message: string): void {
  offerUndo(message, undefined, 3);
}

export function UndoBar() {
  const current = useSyncExternalStore(
    (listener) => {
      offerListeners.add(listener);
      return () => offerListeners.delete(listener);
    },
    () => offer,
  );
  if (!current) return null;
  return (
    <div className="family-toast" role="status" key={current.id}>
      <span>{current.message}</span>
      {current.run && (
        <button
          type="button"
          onClick={() => {
            window.clearTimeout(offerTimer);
            offer = null;
            offerChanged();
            current.run?.();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

// ---------- Routes ----------

export type Nav<R> = { go: (route: R) => void; swap: (route: R) => void; back: () => void };

/** Routes kept in history, so the phone's back gesture and the browser's back button both work. */
export function useRoutes<R extends { name: string }>(app: string, tabs: readonly string[], initial: () => R, home: R) {
  const [route, setRoute] = useState<R>(initial);
  const [lastTab, setLastTab] = useState<R>(home);
  const isTab = (name: string) => tabs.includes(name);
  const current = useRef(route);
  current.current = route;

  useEffect(() => {
    history.replaceState({ [app]: route }, '');
    const onPop = (event: PopStateEvent) => {
      const next = (event.state as Record<string, R> | null)?.[app];
      transition('back', () => setRoute(next ?? home));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (isTab(route.name)) setLastTab(route);
    window.scrollTo(0, 0);
  }, [route]);

  const directionTo = (next: R): Direction => {
    const from = current.current.name;
    if (isTab(from) && isTab(next.name)) return directionAlong(tabs as string[], from, next.name);
    return isTab(next.name) && !isTab(from) ? 'back' : 'forward';
  };
  const go = useCallback((next: R) => {
    history.pushState({ [app]: next }, '');
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const swap = useCallback((next: R) => {
    history.replaceState({ [app]: next }, '');
    if (next.name === current.current.name && isTab(next.name)) return;
    transition(directionTo(next), () => setRoute(next));
  }, []);
  const back = useCallback(() => {
    if ((history.state as Record<string, unknown> | null)?.[app] && history.length > 1) history.back();
    else swap(lastTab);
  }, [lastTab, swap]);
  return { route, nav: { go, swap, back } as Nav<R>, isTab: isTab(route.name) };
}

// ---------- Pieces ----------

export type TabDef<T extends string> = { id: T; label: string; Icon: (props: { size?: number }) => ReactNode };

export function TabBar<T extends string>({ tabs, current, onPick }: { tabs: readonly TabDef<T>[]; current: T | undefined; onPick: (tab: T) => void }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="tab-bar__item" aria-current={current === id ? 'page' : undefined} onClick={() => onPick(id)}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Brand({ name, mark, light = false }: { name: string; mark: ReactNode; light?: boolean }) {
  return (
    <div className={`brand${light ? ' brand--light' : ''}`}>
      {mark}
      <span className="brand__words">
        <span className="brand__name">{name}</span>
        <span className="brand__by">by Proairetos</span>
      </span>
    </div>
  );
}

export function Welcome({ name, mark, line, about, photo, photoWide, onBegin, fine = 'Everything stays on this phone until you turn on sync.' }: {
  name: string;
  mark: ReactNode;
  line: string;
  about: string;
  photo: string;
  photoWide: string;
  onBegin: () => void;
  fine?: string;
}) {
  return (
    <div className="welcome">
      <picture>
        <source media="(min-width: 62rem)" srcSet={photoWide} />
        <img className="welcome__image" src={photo} alt="" />
      </picture>
      <div className="welcome__shade" />
      <div className="welcome__content">
        {mark}
        <h1 className="welcome__name">{name}</h1>
        <p className="welcome__by">by Proairetos</p>
        <p className="welcome__line">{line}</p>
        <span className="welcome__rule" aria-hidden="true" />
        <p className="welcome__about">{about}</p>
        <div className="welcome__actions">
          <button type="button" className="button-main" onClick={onBegin}>
            Begin
          </button>
          <p className="fine">{fine}</p>
        </div>
      </div>
    </div>
  );
}

/** The newer apps' shared main: page with its transition, the undo bar, and the tab bar (rail on computers). */
export function Shell<T extends string>({ page, routeKey, tabs, current, onPick, showTabs }: {
  page: ReactNode;
  routeKey: string;
  tabs: readonly TabDef<T>[];
  current: T | undefined;
  onPick: (tab: T) => void;
  showTabs: boolean;
}) {
  return (
    <div className={'shell' + (showTabs ? ' shell--tabs' : '')}>
      <main key={routeKey} className="page-enter">
        {page}
      </main>
      <UndoBar />
      {showTabs && <TabBar tabs={tabs} current={current} onPick={onPick} />}
    </div>
  );
}
