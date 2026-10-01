// Small per-device flags. Storage can be blocked (private mode), so every access is guarded.
const ONBOARDED_KEY = 'proairetos.onboarded';

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, 'yes');
  } catch {
    // Onboarding will show again next visit; nothing else depends on this.
  }
}

const LOOK_AHEAD_KEY = 'proairetos.lookAheadSetAside';

function localDayKey(day: Date): string {
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

/** True when the person set the look-ahead aside earlier on this local day. */
export function isLookAheadSetAside(today: Date = new Date()): boolean {
  try {
    return localStorage.getItem(LOOK_AHEAD_KEY) === localDayKey(today);
  } catch {
    return false;
  }
}

export function setLookAheadAside(today: Date = new Date()): void {
  try {
    localStorage.setItem(LOOK_AHEAD_KEY, localDayKey(today));
  } catch {
    // It will show again on the next visit today; harmless.
  }
}

// ---------- Focus, visits, and pause offers ----------

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved across reloads in this browser; the app still works this visit.
  }
}

const FOCUS_KEY = 'proairetos.focusSession';

export function loadFocusSession<T>(): T | null {
  return readJson<T>(FOCUS_KEY);
}

export function saveFocusSession(session: unknown): void {
  writeJson(FOCUS_KEY, session);
}

const LAST_VISIT_KEY = 'proairetos.lastVisit';
let previousVisit: Date | null | undefined;

/** The visit before this one. Read once per app start, then today is recorded. */
export function previousVisitDate(): Date | null {
  if (previousVisit === undefined) {
    const stored = readJson<string>(LAST_VISIT_KEY);
    previousVisit = stored ? new Date(stored) : null;
  }
  writeJson(LAST_VISIT_KEY, new Date().toISOString());
  return previousVisit;
}

const PAUSE_DISMISSED_KEY = 'proairetos.pauseOffersAnswered';

export function answeredPauseOffers(): Set<string> {
  return new Set(readJson<string[]>(PAUSE_DISMISSED_KEY) ?? []);
}

export function answerPauseOffer(key: string): void {
  const keys = [...answeredPauseOffers(), key].slice(-50);
  writeJson(PAUSE_DISMISSED_KEY, keys);
}

const HIDDEN_OBSERVATIONS_KEY = 'proairetos.hiddenObservations';

export function hiddenObservationKinds(): string[] {
  return readJson<string[]>(HIDDEN_OBSERVATIONS_KEY) ?? [];
}

export function setHiddenObservationKinds(kinds: string[]): void {
  writeJson(HIDDEN_OBSERVATIONS_KEY, kinds);
}
