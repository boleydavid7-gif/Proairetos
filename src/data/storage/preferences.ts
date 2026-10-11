import { defaultNoticeSettings, normalizeLeadMinutes, type NoticeSettings } from '../../core/notify/notices';
import { sessions, type SessionId } from '../../core/meditate/sessions';
import type { SitKind, SitSetup } from '../../core/meditate/setup';
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

export function localDayKey(day: Date): string {
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

// Screens that show a preference can listen, so a change (an undo, say) shows at once.
const preferenceListeners = new Set<() => void>();

export function subscribePreferences(listener: () => void): () => void {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

/** Tells open screens that settings changed under them (sync brought new ones). */
export function notifyPreferences(): void {
  preferenceListeners.forEach((listener) => listener());
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved across reloads in this browser; the app still works this visit.
  }
  preferenceListeners.forEach((listener) => listener());
}

const FOCUS_KEY = 'proairetos.focusSession';

export function loadFocusSession<T>(): T | null {
  return readJson<T>(FOCUS_KEY);
}

export function saveFocusSession(session: unknown): void {
  writeJson(FOCUS_KEY, session);
}

const FOCUS_BREATH_KEY = 'proairetos.focusBreath';

/** Whether a focus session begins with one breath; off until chosen. */
export function loadFocusBreath(): boolean {
  return readJson<boolean>(FOCUS_BREATH_KEY) === true;
}

export function saveFocusBreath(on: boolean): void {
  writeJson(FOCUS_BREATH_KEY, on);
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

export type OfferKind = 'sit-with-it' | 'up-to-you' | 'backup' | 'think-it-through';

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

// ---------- From a while ago ----------

const KEPT_KEY = 'proairetos.keptConcerns';

/** When the person last chose "still with me" for each old concern. */
export function keptConcerns(): Record<string, string> {
  return readJson<Record<string, string>>(KEPT_KEY) ?? {};
}

export function keepConcern(id: string, at: Date = new Date()): void {
  writeJson(KEPT_KEY, { ...keptConcerns(), [id]: at.toISOString() });
}

// ---------- What Today shows ----------
// Each part of Today that asks something can be set aside for good with
// "Not for me", and brought back in Settings.

export type TodayPart =
  | 'line'
  | 'look-ahead'
  | 'intention'
  | 'path'
  | 'schedule-prompt'
  | 'capture'
  | 'a-while-ago'
  | 'close-day'
  | 'open-time'
  // Parts elsewhere in the app, chosen in Settings > What's included.
  | 'brain-dump'
  | 'sort-through'
  | 'energy'
  | 'goals'
  | 'people'
  | 'words'
  | 'insights'
  | 'meditate'
  | 'decisions'
  | 'weekly-review'
  | 'gratitude'
  | 'three-good-things'
  // Runs from Askesis, the training app beside Proairetos.
  | 'askesis'
  // Meals from SOMA, the recipe app beside Proairetos.
  | 'soma'
  // Bill dates from Oikonomia in Days ahead.
  | 'bill-dates'
  // Bills coming up from Oikonomia, shown on Today only if chosen.
  | 'bills'
  // What was written on this day in an earlier year; off until chosen.
  | 'on-this-day'
  // Water from HYDROS during a work block, shown on Today only if chosen.
  | 'water'
  // Study from Praxis: in Done today and Reflect, and blocks to look at again on Today.
  | 'praxis'
  // One highlight a day from Theoria, shown on Today only if chosen.
  | 'highlight'
  // Tonight's sleep from Diaita, on Today once Diaita is in use.
  | 'diaita'
  // Birthdays from Philia: coming up on Today, and on their day in Days ahead.
  | 'birthdays'
  | 'birthday-dates'
  // Chores from Ergon whose day has come, on Today.
  | 'chores';

/** Parts that stay off until the person turns them on in Settings. */
const OPT_IN_PARTS: readonly TodayPart[] = ['bills', 'on-this-day', 'water', 'highlight'];
const TODAY_OPT_IN_KEY = 'proairetos.todayOptIn';

const TODAY_HIDDEN_KEY = 'proairetos.todayHidden';

// The set-aside link is useful to some people and distracting to others. It
// is deliberately off until someone turns it on in Settings.
const SHOW_NOT_FOR_ME_KEY = 'proairetos.showNotForMe';

export function showNotForMe(): boolean {
  return readJson<boolean>(SHOW_NOT_FOR_ME_KEY) ?? false;
}

export function showNotForMeSnapshot(): string {
  return showNotForMe() ? 'on' : 'off';
}

export function setShowNotForMe(on: boolean): void {
  writeJson(SHOW_NOT_FOR_ME_KEY, on);
}

/** A string snapshot, so screens can read it live without re-rendering forever. */
export function todayHiddenSnapshot(): string {
  const chosen = readJson<TodayPart[]>(TODAY_OPT_IN_KEY) ?? [];
  const offByDefault = OPT_IN_PARTS.filter((part) => !chosen.includes(part));
  return [...(readJson<TodayPart[]>(TODAY_HIDDEN_KEY) ?? []), ...offByDefault].join(',');
}

/** The parts the person set aside. (Parts that start off are not in this list until chosen and set aside again.) */
export function todayHidden(): TodayPart[] {
  return readJson<TodayPart[]>(TODAY_HIDDEN_KEY) ?? [];
}

/**
 * A new person starts with a lighter Today: the line, intention, path,
 * their day, and capture. The rest is one switch away in Settings. Only
 * set when nothing was chosen yet, so no one's choices change.
 */
export function startLight(): void {
  if (readJson<TodayPart[]>(TODAY_HIDDEN_KEY) !== null) return;
  writeJson(TODAY_HIDDEN_KEY, ['look-ahead', 'open-time', 'a-while-ago', 'close-day'] satisfies TodayPart[]);
}

export function setTodayPartShown(part: TodayPart, shown: boolean): void {
  if (OPT_IN_PARTS.includes(part)) {
    const chosen = new Set(readJson<TodayPart[]>(TODAY_OPT_IN_KEY) ?? []);
    if (shown) chosen.add(part);
    else chosen.delete(part);
    writeJson(TODAY_OPT_IN_KEY, [...chosen]);
    return;
  }
  const hidden = new Set((readJson<TodayPart[]>(TODAY_HIDDEN_KEY) ?? []));
  if (shown) hidden.delete(part);
  else hidden.add(part);
  writeJson(TODAY_HIDDEN_KEY, [...hidden]);
}

const PART_SEEN_KEY = 'proairetos.todayPartSeen';
/** "Not for me" waits until a part has been around on this many days. */
export const NOT_FOR_ME_AFTER_DAYS = 3;

/**
 * Notes the day a part of Today was shown and says whether it has been
 * around long enough to offer "Not for me". A new part is left to be met
 * first; the quiet link comes later, and Settings always has the switch.
 */
export function partSeen(part: TodayPart, today = new Date()): boolean {
  const seen = readJson<Record<string, string[]>>(PART_SEEN_KEY) ?? {};
  const days = seen[part] ?? [];
  if (days.length >= NOT_FOR_ME_AFTER_DAYS) return true;
  const day = localDayKey(today);
  if (!days.includes(day)) {
    seen[part] = [...days, day];
    writeJson(PART_SEEN_KEY, seen);
  }
  return (seen[part] ?? days).length >= NOT_FOR_ME_AFTER_DAYS;
}

// ---------- Lighter view ----------

const LIGHTER_KEY = 'proairetos.lighterToday';

/**
 * Today shrunk to one next thing, a pause, and capture, for the day the
 * person chose it. It eases back by itself the next day; lasting choices
 * live in Settings > What's included.
 */
export function lighterToday(day: string): boolean {
  return readJson<string>(LIGHTER_KEY) === day;
}

export function setLighterToday(on: boolean, day = ''): void {
  writeJson(LIGHTER_KEY, on ? day : null);
}

// ---------- Energy, as the person says it ----------

const ENERGY_KEY = 'proairetos.energy';

export type Energy = 'full' | 'some' | 'low';

/** Set by the person for one day only; it never carries over, and the app never guesses it. */
export function energyFor(date: string): Energy | undefined {
  const stored = readJson<{ date: string; energy: Energy }>(ENERGY_KEY);
  return stored?.date === date ? stored.energy : undefined;
}

export function setEnergy(date: string, energy: Energy | undefined): void {
  writeJson(ENERGY_KEY, energy ? { date, energy } : null);
}

// ---------- Overlaps the person chose to keep ----------

const KEPT_OVERLAPS_KEY = 'proairetos.keptOverlaps';

/** Keys ("id@time") of overlaps the person said were fine. Moving the item makes a new key, so a new overlap is shown again. */
export function keptOverlaps(): string {
  return (readJson<string[]>(KEPT_OVERLAPS_KEY) ?? []).join('\n');
}

export function keepOverlap(key: string): void {
  const kept = readJson<string[]>(KEPT_OVERLAPS_KEY) ?? [];
  // Only the most recent are kept, so nothing piles up.
  writeJson(KEPT_OVERLAPS_KEY, [...kept.filter((k) => k !== key), key].slice(-50));
}

// ---------- Quiet hours for reminders ----------

const QUIET_KEY = 'proairetos.quietHours';

export type StoredQuietHours = { on: boolean; start: string; end: string; duringProtected: boolean };

export function loadQuietHours(): StoredQuietHours {
  return { on: true, start: '22:00', end: '07:00', duringProtected: true, ...readJson<Partial<StoredQuietHours>>(QUIET_KEY) };
}

export function saveQuietHours(quiet: StoredQuietHours): void {
  writeJson(QUIET_KEY, quiet);
}

// ---------- Appearance ----------

const APPEARANCE_KEY = 'proairetos.appearance';

export type Appearance = {
  theme: 'system' | 'dark' | 'light';
  textSize: 'default' | 'large' | 'larger';
  /** A soft buzz when ticking something off, on phones that have one. */
  taps: boolean;
};

export function loadAppearance(): Appearance {
  return { theme: 'dark', textSize: 'default', taps: true, ...readJson<Partial<Appearance>>(APPEARANCE_KEY) };
}

export function saveAppearance(appearance: Appearance): void {
  writeJson(APPEARANCE_KEY, appearance);
}

// ---------- Meditate ----------

const MEDITATE_KEY = 'proairetos.meditate';

export type MeditateSettings = {
  tab: 'sessions' | 'breathe' | 'sounds' | 'music' | 'free';
  /** The session type chosen on Sessions. */
  session: SessionId;
  /** Which kind of sit the Sounds and Music tabs are choosing for. */
  soundsFor: SitKind;
  /** Only what the person changed, per kind of sit; the rest stays as it came. */
  setups: Partial<Record<SitKind, Partial<SitSetup>>>;
};

const meditateDefaults: MeditateSettings = {
  tab: 'sessions',
  session: sessions[0].id,
  soundsFor: sessions[0].id,
  setups: {},
};

function isSessionId(value: unknown): value is SessionId {
  return sessions.some((definition) => definition.id === value);
}

function isMeditateTab(value: unknown): value is MeditateSettings['tab'] {
  return value === 'sessions' || value === 'breathe' || value === 'sounds' || value === 'music' || value === 'free';
}

function isSitKind(value: unknown): value is SitKind {
  return value === 'breathe' || isSessionId(value);
}

function cleanMeditateSetups(value: unknown): MeditateSettings['setups'] {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const cleaned: MeditateSettings['setups'] = {};
  const kinds: readonly SitKind[] = [...sessions.map((definition) => definition.id), 'breathe'];
  const keys: readonly (keyof SitSetup)[] = ['minutes', 'pace', 'counts', 'bells', 'breathSounds', 'sounds', 'music'];
  for (const kind of kinds) {
    const raw = source[kind];
    if (!raw || typeof raw !== 'object') continue;
    const setup = raw as Record<string, unknown>;
    const next: Partial<SitSetup> = {};
    for (const key of keys) if (key in setup) next[key] = setup[key] as never;
    if (Object.keys(next).length) cleaned[kind] = next;
  }
  return cleaned;
}

export function loadMeditate(): MeditateSettings {
  const saved = readJson<Partial<MeditateSettings>>(MEDITATE_KEY) ?? {};
  const session = isSessionId(saved.session) ? saved.session : meditateDefaults.session;
  return {
    tab: isMeditateTab(saved.tab) ? saved.tab : meditateDefaults.tab,
    session,
    soundsFor: isSitKind(saved.soundsFor) ? saved.soundsFor : session,
    setups: cleanMeditateSetups(saved.setups),
  };
}

export function saveMeditate(settings: MeditateSettings): void {
  writeJson(MEDITATE_KEY, settings);
}

// ---------- Notifications ----------

const NOTIFY_KEY = 'proairetos.notify';

/** Up to three "HH:MM" times, in order; the default pair if none are usable. */
function bellTimes(saved: unknown): string[] {
  const times = Array.isArray(saved) ? saved.filter((t): t is string => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) : [];
  return times.length ? [...new Set(times)].sort().slice(0, 3) : defaultNoticeSettings.bellAt;
}

/** What notifies, and how; device-only, like quiet hours. */
export function loadNotify(): NoticeSettings {
  const saved = readJson<Partial<NoticeSettings>>(NOTIFY_KEY) ?? {};
  return {
    ...defaultNoticeSettings,
    ...saved,
    calendarLead: normalizeLeadMinutes(saved.calendarLead, defaultNoticeSettings.calendarLead),
    scheduleLead: normalizeLeadMinutes(saved.scheduleLead, defaultNoticeSettings.scheduleLead),
    bellAt: bellTimes(saved.bellAt),
  };
}

export function saveNotify(settings: NoticeSettings): void {
  writeJson(NOTIFY_KEY, settings);
}
