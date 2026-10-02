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

// "Moved more than once" starts hidden: neutral wording can still be heard as criticism.
const DEFAULT_HIDDEN_OBSERVATIONS = ['MOVED'];

export function hiddenObservationKinds(): string[] {
  return readJson<string[]>(HIDDEN_OBSERVATIONS_KEY) ?? DEFAULT_HIDDEN_OBSERVATIONS;
}

export function setHiddenObservationKinds(kinds: string[]): void {
  writeJson(HIDDEN_OBSERVATIONS_KEY, kinds);
}

const PAUSE_SETTINGS_KEY = 'proairetos.pauseSettings';

export type PauseSettings = { minutes: 1 | 3; anchor: 'breath' | 'feet' | 'sounds' };

export function loadPauseSettings(): PauseSettings {
  return readJson<PauseSettings>(PAUSE_SETTINGS_KEY) ?? { minutes: 1, anchor: 'breath' };
}

export function savePauseSettings(settings: PauseSettings): void {
  writeJson(PAUSE_SETTINGS_KEY, settings);
}

const LAST_BACKUP_KEY = 'proairetos.lastBackup';

export function lastBackupDate(): string | null {
  return readJson<string>(LAST_BACKUP_KEY);
}

export function recordBackup(): void {
  writeJson(LAST_BACKUP_KEY, new Date().toISOString());
}

/** Removes every per-device preference this app stored. */
export function clearPreferences(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('proairetos.'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

// ---------- Journal draft ----------

export type JournalDraft = { body: string; weather?: string; valueIds?: string[]; promptKey?: string };

const JOURNAL_DRAFT_KEY = 'proairetos.journalDraft';

/** What was being written when the journal was left, so leaving never loses words. */
export function loadJournalDraft(): JournalDraft | null {
  return readJson<JournalDraft>(JOURNAL_DRAFT_KEY);
}

export function saveJournalDraft(draft: JournalDraft | null): void {
  writeJson(JOURNAL_DRAFT_KEY, draft && (draft.body.trim() || draft.weather || draft.valueIds?.length) ? draft : null);
}

// ---------- Name ----------

const NAME_KEY = 'proairetos.displayName';

/** The name the person chose to be greeted by, if any. Kept on this device only. */
export function displayName(): string {
  return readJson<string>(NAME_KEY) ?? '';
}

export function setDisplayName(name: string): void {
  writeJson(NAME_KEY, name.trim() || null);
}

// ---------- When a day turns over ----------

const DAY_SETTINGS_KEY = 'proairetos.daySettings';

export type StoredDaySettings = { startHour: number; followShifts: boolean };

export function loadDaySettings(): StoredDaySettings {
  const stored = readJson<Partial<StoredDaySettings>>(DAY_SETTINGS_KEY) ?? {};
  const startHour = Number.isInteger(stored.startHour) && stored.startHour! >= 0 && stored.startHour! <= 5 ? stored.startHour! : 0;
  return { startHour, followShifts: stored.followShifts ?? true };
}

export function saveDaySettings(settings: StoredDaySettings): void {
  writeJson(DAY_SETTINGS_KEY, settings);
}

// ---------- Dictation ----------

const DICTATION_KEY = 'proairetos.dictationAccepted';

/** Whether the person has read, and accepted, where dictated speech goes. */
export function dictationAccepted(): boolean {
  return readJson<boolean>(DICTATION_KEY) === true;
}

export function acceptDictation(): void {
  writeJson(DICTATION_KEY, true);
}

// ---------- Calendar feed ----------

const FEED_KEY = 'proairetos.calendarFeed';

export type StoredFeedOptions = { shifts: boolean; shiftLabels: boolean; protectedTime: boolean; tasks: boolean };

export type StoredFeed = { enabled: boolean; options: StoredFeedOptions };

export function loadCalendarFeed(): StoredFeed {
  const stored = readJson<Partial<StoredFeed>>(FEED_KEY);
  return {
    enabled: stored?.enabled === true,
    options: { shifts: true, shiftLabels: false, protectedTime: false, tasks: false, ...stored?.options },
  };
}

export function saveCalendarFeed(feed: StoredFeed): void {
  writeJson(FEED_KEY, feed);
}

// ---------- Quiet offers ----------
// A practice is sometimes offered at a natural moment. At most one a day,
// never repeated once the person says "not for me", and all of them can be
// turned off.

export type OfferKind = 'sit-with-it' | 'up-to-you';

const OFFERS_KEY = 'proairetos.quietOffers';

type OfferState = { on: boolean; hidden: OfferKind[]; lastShown?: string };

function offerState(): OfferState {
  const stored = readJson<Partial<OfferState>>(OFFERS_KEY) ?? {};
  return { on: stored.on ?? true, hidden: stored.hidden ?? [], lastShown: stored.lastShown };
}

export function quietOffersOn(): boolean {
  return offerState().on;
}

export function setQuietOffers(on: boolean): void {
  writeJson(OFFERS_KEY, { ...offerState(), on });
}

export function hiddenOffers(): OfferKind[] {
  return offerState().hidden;
}

/** "Not for me": this kind of offer never appears again (until restored in Settings). */
export function hideOffer(kind: OfferKind): void {
  const state = offerState();
  writeJson(OFFERS_KEY, { ...state, hidden: [...new Set([...state.hidden, kind])] });
}

export function restoreOffers(): void {
  writeJson(OFFERS_KEY, { ...offerState(), hidden: [] });
}

/**
 * Whether an offer may appear now, and if so, records it as today's one
 * offer. `today` is a local date.
 */
export function takeOffer(kind: OfferKind, today: string): boolean {
  const state = offerState();
  if (!state.on || state.hidden.includes(kind) || state.lastShown === today) return false;
  writeJson(OFFERS_KEY, { ...state, lastShown: today });
  return true;
}

// ---------- Closing the day ----------

const CLOSED_DAY_KEY = 'proairetos.closedDay';

/** The last day the person closed, so the link rests until the next one. */
export function closedDay(): string | null {
  return readJson<string>(CLOSED_DAY_KEY);
}

export function setClosedDay(date: string | null): void {
  writeJson(CLOSED_DAY_KEY, date);
}
