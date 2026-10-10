import { promptText } from '../reflect/prompts';
import { notifications } from '../../app/notify/notifications';
import { localDayKey } from '../../data/storage/preferences';
import NotificationsSection from './NotificationsSection';
import BringInSection from './BringInSection';
import { useBackHandler } from '../../app/back/backStack';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { lock } from '../../app/lock/lock';
import { useNavigate, useReturnRoute } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { applyAppearance } from '../../app/appearance';
import { FEEDBACK_EMAIL } from '../../app/siteAddress';
import { backupService, storageMode } from '../../app/services';
import {
  ArrowLeftIcon,
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChevronRightIcon,
  CloudIcon,
  HeartIcon,
  InboxIcon,
  MoonIcon,
  NoteIcon,
  PartlyCloudyIcon,
  PenIcon,
  ShieldIcon,
  SunIcon,
} from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { countRecords, parseBackupFile, type BackupData } from '../../data/backup/format';
import {
  clearPreferences,
  displayName,
  hiddenOffers,
  loadAppearance,
  saveAppearance,
  setTodayPartShown,
  type TodayPart,
  quietOffersOn,
  restoreOffers,
  setQuietOffers,
  lastBackupDate,
  loadDaySettings,
  recordBackup,
  saveDaySettings,
  setDisplayName,
  setShowNotForMe,
  showNotForMe,
} from '../../data/storage/preferences';
import { AFTER_WORK_HOURS } from '../../core/rhythm/personalDay';
import valley from '../../assets/images/scenes/valley.webp';
import valleyWide from '../../assets/images/scenes/valley-wide.webp';
import { signOut, syncStatus } from '../../app/sync/syncController';
import AccountSection, { useSyncStatus } from './AccountSection';
import CalendarSection from './CalendarSection';
import OtherCalendarsSection from './OtherCalendarsSection';
import WeatherSection from './WeatherSection';
import { weatherSettings } from '../../app/weather/weather';
import { calendarSources } from '../../app/calendars/otherCalendars';
import type { AppRoute } from '../../app/routes/routeTypes';
import { dayName, useDailyCopies } from '../../app/family/useDailyCopies';

function download(text: string) {
  const date = localDayKey(new Date());
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `proairetos-backup-${date}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadReadable(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `proairetos-readable-${localDayKey(new Date())}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describeCounts(data: BackupData): string {
  const counts = countRecords(data);
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return [
    n(counts.lifeItems, 'item'),
    n(counts.reflections, 'reflection'),
    n(counts.decisions, 'decision'),
    n(counts.values, 'value'),
    n(counts.schedulePatterns, 'schedule'),
    ...(counts.attachments ? [n(counts.attachments, 'attachment')] : []),
    ...(counts.workouts ? [n(counts.workouts, 'workout')] : []),
    ...(counts.recipes ? [n(counts.recipes, 'recipe')] : []),
  ].join(', ');
}

function ExportSection() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(() => lastBackupDate());

  async function exportNow() {
    setBusy(true);
    try {
      download(await backupService.exportFile(password || undefined));
      recordBackup();
      setLast(lastBackupDate());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-label="Back up">
      <h2 className="section-label">Back up</h2>
      <p className="section-description">
        One file for Proairetos, Askesis and SOMA, with all their settings, photos, and files. Keep it on your phone, in your
        own cloud storage, or by email to yourself.
      </p>
      <label className="plan-field">
        <span>Password (recommended)</span>
        <input
          type="password"
          className="field-input"
          autoComplete="new-password"
          placeholder="Locks the file so only you can open it"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <p className="sheet__hint">
        {password
          ? 'Keep this password safe. Without it the backup cannot be opened, by anyone.'
          : 'Without a password the file can be read by anyone who has it, including your reflections.'}
      </p>
      <button type="button" className="chip chip--accent chip--wide" disabled={busy} onClick={exportNow}>
        {busy ? 'Preparing…' : 'Download backup'}
      </button>
      <p className="sheet__hint">
        {last
          ? `Last backup ${new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`
          : 'No backup yet.'}
      </p>
      <h2 className="section-label">A readable copy</h2>
      <p className="section-description">
        Your reflections, decisions, Compass and captures as a plain Markdown file you can open anywhere. It is not a
        backup and has no password, so keep it somewhere private.
      </p>
      <button
        type="button"
        className="chip chip--wide"
        onClick={async () => downloadReadable(await backupService.exportReadable(promptText))}
      >
        Download readable copy
      </button>
    </section>
  );
}

/** A copy made each day on this device, the last seven kept; any day can be restored. */
function DailySection() {
  const { on, turn, copies, restore } = useDailyCopies();
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="settings-card" aria-label="Daily copies">
      <h2 className="section-label">Daily copies</h2>
      <button type="button" className="toggle-row" aria-pressed={on} onClick={() => void turn(!on)}>
        <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span className="toggle-row__text">
          <span>Keep a copy each day</span>
          <span className="toggle-row__detail">On this device, the last seven days, for the family apps.</span>
        </span>
      </button>
      {copies.length > 0 && (
        <div className="chip-row">
          {copies.map((copy) => (
            <button
              key={copy.day}
              type="button"
              className="chip"
              aria-pressed={chosen === copy.day}
              onClick={() => setChosen(chosen === copy.day ? null : copy.day)}
            >
              {dayName(copy.day)}
            </button>
          ))}
        </div>
      )}
      {chosen && (
        <div className="restore-preview">
          <p className="sheet__hint">Everything currently on this device, in the family apps, will be replaced with {dayName(chosen)}’s copy.</p>
          <div className="chip-row">
            <button type="button" className="chip" onClick={() => setChosen(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="chip chip--accent"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await restore(chosen);
                } catch {
                  setError('Restoring stopped partway. Try again.');
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Restoring…' : 'Restore this copy'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ImportSection() {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState<{ data: BackupData; exportedAt: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function choose(file: File | undefined) {
    setError('');
    setReady(null);
    setPassword('');
    if (!file) return;
    const content = await file.text();
    try {
      const parsed = parseBackupFile(content);
      setText(content);
      setLocked(parsed.encrypted);
      if (!parsed.encrypted) setReady(await backupService.readFile(content));
    } catch (cause) {
      setText(null);
      setError(cause instanceof Error ? cause.message : 'This file could not be read.');
    }
  }

  async function unlock() {
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      setReady(await backupService.readFile(text, password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This backup could not be opened.');
    } finally {
      setBusy(false);
    }
  }

  async function replace() {
    if (!ready) return;
    setBusy(true);
    try {
      await backupService.replaceAll(ready.data);
      window.location.reload();
    } catch {
      setError('Restoring stopped partway. Your backup file is unchanged; try again.');
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-label="Restore">
      <h2 className="section-label">Restore from a backup</h2>
      <p className="section-description">
        Replaces what is on this device, in the family apps, with the backup. Nothing changes until you confirm.
      </p>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Backup file"
        onChange={(event) => choose(event.target.files?.[0])}
      />
      <button type="button" className="chip chip--wide" onClick={() => input.current?.click()}>
        Choose backup file
      </button>

      {locked && !ready && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            unlock();
          }}
        >
          <input
            type="password"
            className="field-input"
            aria-label="Backup password"
            placeholder="This backup is locked"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="button-accent" disabled={!password || busy}>
            {busy ? 'Opening…' : 'Open'}
          </button>
        </form>
      )}

      {ready && (
        <div className="restore-preview">
          <p>
            Backup from{' '}
            {new Date(ready.exportedAt).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            : {describeCounts(ready.data)}.
          </p>
          <p className="sheet__hint">Everything currently on this device will be replaced.</p>
          <div className="chip-row">
            <button type="button" className="chip" onClick={async () => download(await backupService.exportFile())}>
              First, save what is here
            </button>
            <button type="button" className="chip chip--accent" disabled={busy} onClick={replace}>
              {busy ? 'Restoring…' : 'Replace with this backup'}
            </button>
          </div>
        </div>
      )}

      {(text || error) && (
        <button
          type="button"
          className="button-quiet"
          onClick={() => {
            setText(null);
            setReady(null);
            setLocked(false);
            setPassword('');
            setError('');
            if (input.current) input.current.value = '';
          }}
        >
          Cancel
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function DeleteSection() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section className="settings-card" aria-label="Delete everything">
      <h2 className="section-label">Delete everything</h2>
      <p className="section-description">
        Removes all your items, reflections, decisions, values, and schedules from this device. If you use sync, this
        device is signed out first, so your other devices and encrypted account are not affected.
      </p>
      {confirming ? (
        <div className="chip-row">
          <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
            Keep my data
          </button>
          <button
            type="button"
            className="chip"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              // Sign this device out first, so the deletion stays here and is not synced to other devices.
              if (syncStatus.get().phase !== 'unavailable' && syncStatus.get().phase !== 'signed-out') await signOut();
              await backupService.deleteAll();
              clearPreferences();
              window.location.reload();
            }}
          >
            Yes, delete everything on this device
          </button>
        </div>
      ) : (
        <button type="button" className="chip chip--wide" onClick={() => setConfirming(true)}>
          Delete everything…
        </button>
      )}
    </section>
  );
}

const tabLabels: Partial<Record<AppRoute, string>> = {
  today: 'Today',
  reflect: 'Reflect',
  plan: 'Days ahead',
  calendar: 'Days ahead',
  capture: 'Capture',
  compass: 'Compass',
};

type View =
  | 'lock'
  | 'notifications'
  | 'import'
  | 'weather'
  | 'calendars'
  | 'help'
  | 'appearance'
  | 'today'
  | 'offers'
  | 'sources'
  | 'calendar'
  | 'day'
  | 'profile'
  | 'account'
  | 'backup'
  | 'privacy'
  | 'delete'
  | 'about';

// Another screen can ask Settings to open straight onto one page (say, from a backup offer).
let requestedView: View | null = null;
export function openSettingsAt(view: View): void {
  requestedView = view;
}

const viewTitles: Record<View, string> = {
  lock: 'Lock Reflect',
  notifications: 'Notifications',
  profile: 'Your name',
  day: 'When your day starts',
  calendar: 'Share to your calendar',
  calendars: 'Calendars',
  weather: 'Weather',
  offers: 'Quiet offers',
  today: 'What’s included',
  appearance: 'Appearance',
  help: 'Help & feedback',
  sources: 'Where this comes from',
  account: 'Account',
  import: 'Bring things in',
  backup: 'Back up and restore',
  privacy: 'Privacy',
  delete: 'Delete everything',
  about: 'About Proairetos',
};

/** A few related rows under a small heading. */
function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="settings-group" aria-label={label}>
      <h2 className="settings-group__label">{label}</h2>
      <div className="settings-list">{children}</div>
    </section>
  );
}

function Row({ icon, title, value, onClick }: { icon: ReactNode; title: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" className="settings-row" onClick={onClick}>
      <span className="settings-row__icon">{icon}</span>
      <span className="settings-row__text">{title}</span>
      {value && <span className="settings-row__value">{value}</span>}
      <ChevronRightIcon size={18} className="settings-row__chevron" />
    </button>
  );
}

function ProfileSection({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState(displayName);
  return (
    <form
      className="settings-card"
      aria-label="Your name"
      onSubmit={(event) => {
        event.preventDefault();
        setDisplayName(name);
        onDone();
      }}
    >
      <p className="section-description">Used only to greet you on Today. It stays on this device.</p>
      <input
        className="field-input"
        autoFocus
        autoComplete="given-name"
        aria-label="Name"
        placeholder="What would you like to be called?"
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="composer__actions">
        <button type="button" className="button-quiet" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="button-accent">
          Save
        </button>
      </div>
    </form>
  );
}

const startHours = [0, 1, 2, 3, 4, 5];
const hourLabel = (hour: number) => (hour === 0 ? 'Midnight' : `${hour} am`);

function DaySection() {
  const [settings, setSettings] = useState(loadDaySettings);
  const update = (next: typeof settings) => {
    setSettings(next);
    saveDaySettings(next);
  };
  return (
    <section className="settings-card" aria-label="When your day starts">
      <p className="section-description">
        Today, Plan, your path, and your intention all belong to one day. This sets when that day turns over.
      </p>
      <button
        type="button"
        className="toggle-row"
        aria-pressed={settings.followShifts}
        onClick={() => update({ ...settings, followShifts: !settings.followShifts })}
      >
        <span className={`toggle-switch${settings.followShifts ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span>Let late hours count as the same day</span>
      </button>
      <p className="sheet__hint">
        When something in your schedule runs past the turnover, like a late or overnight stretch of work, the day keeps
        going until {AFTER_WORK_HOURS} hours after it ends, so it and the time after it stay one day.
      </p>
      <p className="sheet__label">Otherwise a new day starts at</p>
      <div className="chip-row" role="group" aria-label="New day starts at">
        {startHours.map((hour) => (
          <button
            key={hour}
            type="button"
            className="chip"
            aria-pressed={settings.startHour === hour}
            onClick={() => update({ ...settings, startHour: hour })}
          >
            {hourLabel(hour)}
          </button>
        ))}
      </div>
    </section>
  );
}

function daySummary(): string {
  const settings = loadDaySettings();
  return settings.followShifts ? 'With your schedule' : hourLabel(settings.startHour);
}

type PartRow = { part: TodayPart; label: string; detail?: string; rare?: boolean };

/** What can be switched on or off, by the app it belongs to. Only what people are likely to want a say in. */
const appParts: { app: string; sections: { label?: string; parts: PartRow[] }[] }[] = [
  {
    app: 'Proairetos',
    sections: [
      {
        label: 'Today',
        parts: [
          { part: 'line', label: 'The daily line' },
          { part: 'intention', label: 'Today’s intention' },
          { part: 'path', label: 'Today’s path' },
          { part: 'capture', label: 'Capture line' },
          { part: 'close-day', label: 'Close the day' },
          { part: 'three-good-things', label: 'Three good things' },
          { part: 'on-this-day', label: 'On this day', detail: 'Your own words from this day in an earlier year, when there are some.' },
          { part: 'open-time', label: 'Open time' },
          { part: 'look-ahead', label: 'Look ahead', rare: true },
          { part: 'schedule-prompt', label: 'Add your schedule', rare: true },
          { part: 'a-while-ago', label: 'From a while ago', rare: true },
        ],
      },
      {
        label: 'Capture',
        parts: [
          { part: 'brain-dump', label: 'Empty your head', detail: 'Write everything at once; it is split up for you to check.' },
          { part: 'sort-through', label: 'Sort through', detail: 'One thing at a time: today, later, or let it go.' },
          { part: 'gratitude', label: 'Grateful', detail: 'Set down what you are grateful for; it is kept in Reflect.' },
          { part: 'energy', label: 'Energy', detail: 'Say how much energy you have; things you marked as light come first.' },
        ],
      },
      {
        label: 'Compass',
        parts: [
          { part: 'goals', label: 'Goals', detail: 'What you are working toward, with time set aside if you like.' },
          { part: 'people', label: 'People', detail: 'People who matter, kept in view.' },
          { part: 'words', label: 'Words', detail: 'What is worth getting up for, and what you have put aside.' },
        ],
      },
      {
        label: 'Reflect',
        parts: [
          { part: 'meditate', label: 'Meditate', detail: 'Sessions, breathing, sounds, and music.' },
          { part: 'insights', label: 'Insights', detail: 'Counts of what you recorded.' },
          { part: 'weekly-review', label: 'Weekly review', detail: 'About 15 minutes, at your own pace.' },
          { part: 'decisions', label: 'Decisions', detail: 'Choices written down, to look back on.' },
        ],
      },
    ],
  },
  {
    app: 'Askesis',
    sections: [{ parts: [{ part: 'askesis', label: 'Runs', detail: 'Today’s session on Today; finished runs in Done today and Reflect.' }] }],
  },
  {
    app: 'SOMA',
    sections: [{ parts: [{ part: 'soma', label: 'Meals', detail: 'Meals planned in SOMA in Days ahead; meals cooked for someone in Reflect.' }] }],
  },
  {
    app: 'Praxis',
    sections: [{ parts: [{ part: 'praxis', label: 'Study', detail: 'Study time in Done today and Reflect; a block you set to look at again, on Today.' }] }],
  },
  {
    app: 'HYDROS',
    sections: [{ parts: [{ part: 'water', label: 'Water during work', detail: 'While a work block is on, what you have drunk since it began and a way to log a glass.' }] }],
  },
  {
    app: 'Oikonomia',
    sections: [
      {
        parts: [
          { part: 'bill-dates', label: 'Bills in Days ahead', detail: 'Bill dates in the list and the calendar, with the paid ones marked.' },
          { part: 'bills', label: 'Bills coming up on Today', detail: 'Bills with a date in the next few days and no payment recorded.' },
        ],
      },
    ],
  },
];

const themeLabels = { system: 'Match my phone', dark: 'Dark', light: 'Light' } as const;
const sizeLabels = { default: 'Default', large: 'Large', larger: 'Larger' } as const;

const helpTopics: { title: string; body: string }[] = [
  {
    title: 'Capture first',
    body: 'Put anything in the capture box the moment it arrives. Sorting can wait.',
  },
  {
    title: 'Today',
    body: 'Your greeting, a line for the day, and only what you choose: an intention, up to three things for your path, your schedule. Tap the leaf for a lighter view.',
  },
  {
    title: 'Days ahead',
    body: 'Your coming days as a list or a calendar: what has a time, and what you planned for the day, grouped your way. A list can come back by itself, every week or on weekdays, fresh each time.',
  },
  {
    title: 'Pause and practices',
    body: 'Pause is a minute to arrive. From there, “Another way to pause” has a few short practices from Stoic and Buddhist traditions.',
  },
  {
    title: 'Reflect and Insights',
    body: 'Write as much or as little as you like. Insights only counts what you recorded; it never draws conclusions.',
  },
  {
    title: 'Your data',
    body: 'Everything stays on this device unless you turn on sync, which is encrypted here first. Back up and restore live in Settings.',
  },
];

function HelpSection() {
  return (
    <section className="settings-card" aria-label="Help">
      {helpTopics.map((topic) => (
        <div key={topic.title} className="sources">
          <p className="sheet__label">{topic.title}</p>
          <p className="section-description">{topic.body}</p>
        </div>
      ))}
      {FEEDBACK_EMAIL ? (
        <a
          className="chip chip--accent chip--wide"
          href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Proairetos feedback')}`}
        >
          Send feedback
        </a>
      ) : (
        <p className="sheet__hint">
          Proairetos collects no usage data, so what people say is the only way it learns what helps.
        </p>
      )}
    </section>
  );
}

function AppearanceSection() {
  const [appearance, setAppearance] = useState(loadAppearance);
  const update = (next: typeof appearance) => {
    setAppearance(next);
    saveAppearance(next);
    applyAppearance(next);
  };
  return (
    <section className="settings-card" aria-label="Appearance">
      <p className="sheet__label">Theme</p>
      <div className="chip-row" role="group" aria-label="Theme">
        {(Object.keys(themeLabels) as (keyof typeof themeLabels)[]).map((theme) => (
          <button
            key={theme}
            type="button"
            className="chip"
            aria-pressed={appearance.theme === theme}
            onClick={() => update({ ...appearance, theme })}
          >
            {themeLabels[theme]}
          </button>
        ))}
      </div>
      <p className="sheet__label">Text size</p>
      <div className="chip-row" role="group" aria-label="Text size">
        {(Object.keys(sizeLabels) as (keyof typeof sizeLabels)[]).map((size) => (
          <button
            key={size}
            type="button"
            className="chip"
            aria-pressed={appearance.textSize === size}
            onClick={() => update({ ...appearance, textSize: size })}
          >
            {sizeLabels[size]}
          </button>
        ))}
      </div>
      <p className="sheet__hint">
        Text, spacing, and buttons all grow together. Your phone’s own text size is respected too.
      </p>
      <button
        type="button"
        className="toggle-row"
        aria-pressed={appearance.taps}
        onClick={() => update({ ...appearance, taps: !appearance.taps })}
      >
        <span className={`toggle-switch${appearance.taps ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span className="toggle-row__text">
          <span>Gentle taps</span>
          <span className="toggle-row__detail">A soft buzz when you tick something off, on phones that have one.</span>
        </span>
      </button>
    </section>
  );
}

function TodaySection() {
  const shows = useTodayParts();
  const row = ({ part, label, detail }: PartRow) => (
    <button
      key={part}
      type="button"
      className="toggle-row"
      aria-pressed={shows(part)}
      onClick={() => setTodayPartShown(part, !shows(part))}
    >
      <span className={`toggle-switch${shows(part) ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
      {detail ? (
        <span className="toggle-row__text">
          <span>{label}</span>
          <span className="toggle-row__detail">{detail}</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
  return (
    <section className="settings-card" aria-label="What’s included">
      <p className="section-description">
        Keep Proairetos as full or as bare as suits you. Switch anything off and it steps out of the way; switch it back
        on any time. Nothing you recorded is lost.
      </p>
      {appParts.map(({ app, sections }) => (
        <div key={app} className="stack-tight">
          <h2 className="settings-group__label">{app}</h2>
          {sections.map((section) => {
            const main = section.parts.filter((entry) => !entry.rare);
            const rare = section.parts.filter((entry) => entry.rare);
            return (
              <div key={section.label ?? app} className="stack-tight">
                {section.label && <p className="sheet__label">{section.label}</p>}
                {main.map(row)}
                {rare.length > 0 && (
                  <details className="sheet__more">
                    <summary>A few more</summary>
                    <div className="sheet__more-body">{rare.map(row)}</div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <p className="sheet__hint">
        For a lighter day, tap the leaf at the top of Today: just the next thing, a pause, and capture, until tomorrow.
      </p>
    </section>
  );
}

function OffersSection() {
  const [on, setOn] = useState(quietOffersOn);
  const [hidden, setHidden] = useState(hiddenOffers);
  const [showSetAside, setShowSetAside] = useState(showNotForMe);
  return (
    <section className="settings-card" aria-label="Quiet offers">
      <h2 className="section-label">Quiet offers</h2>
      <p className="section-description">
        Now and then, at a natural moment, Proairetos offers a short practice: a minute with a feeling you just named,
        for instance. At most one a day, and ignoring it is a complete answer.
      </p>
      <button
        type="button"
        className="toggle-row"
        aria-pressed={on}
        onClick={() => {
          setQuietOffers(!on);
          setOn(!on);
        }}
      >
        <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span>Offer practices now and then</span>
      </button>
      <button
        type="button"
        className="toggle-row"
        aria-pressed={showSetAside}
        onClick={() => {
          const next = !showSetAside;
          setShowNotForMe(next);
          setShowSetAside(next);
        }}
      >
        <span className={`toggle-switch${showSetAside ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span className="toggle-row__text">
          <span>Show “Not for me” on cards</span>
          <span className="toggle-row__detail">A quiet way to set aside a part of Today.</span>
        </span>
      </button>
      {hidden.length > 0 && (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            restoreOffers();
            setHidden([]);
          }}
        >
          Bring back the {hidden.length === 1 ? 'one' : hidden.length} you set aside
        </button>
      )}
      <p className="sheet__hint">The practices are always there under Pause → Another way to pause.</p>
    </section>
  );
}

const sources: { tradition: string; lines: string[] }[] = [
  {
    tradition: 'Stoicism',
    lines: [
      'Epictetus, Enchiridion and Discourses: what is up to us, and what is not.',
      'Seneca, Letters: the evening review.',
      'Marcus Aurelius, Meditations: the view from above.',
      'Pierre Hadot, The Inner Citadel and Philosophy as a Way of Life: philosophy as daily exercise.',
    ],
  },
  {
    tradition: 'Buddhism',
    lines: [
      'Mindfulness, noting, and impermanence (anicca) from insight meditation.',
      'Loving-kindness (metta).',
      'RAIN, as taught by Tara Brach.',
    ],
  },
  {
    tradition: 'Greek philosophy',
    lines: [
      'Aristotle, Nicomachean Ethics: character grows through practice.',
      'Epicurus, Letter to Menoeceus: simple pleasures and a calm mind.',
    ],
  },
  {
    tradition: 'Japan',
    lines: ['Ikigai, as Mieko Kamiya and Ken Mogi describe it: the small things that make life worth living.'],
  },
  {
    tradition: 'Psychology',
    lines: [
      'The three-minute breathing space from mindfulness-based cognitive therapy (MBCT).',
      'Peter Gollwitzer: if-then plans.',
      'Kristin Neff: self-compassion.',
    ],
  },
];

function SourcesSection() {
  return (
    <section className="settings-card" aria-label="Where this comes from">
      <h2 className="section-label">Where this comes from</h2>
      <p className="section-description">
        Proairetos borrows its practices from people who thought carefully about living well. The name is Epictetus’s
        word for the part of us that chooses how to respond.
      </p>
      {sources.map((source) => (
        <div key={source.tradition} className="sources">
          <p className="sheet__label">{source.tradition}</p>
          <ul className="sources__list">
            {source.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** The last copy as a plain fact, or nothing when there has not been one. */
function lastCopyLabel(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return undefined;
  return when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** A passcode for Reflect and Journal. Off until chosen; it only keeps casual eyes out. */
function LockSection() {
  const on = useSyncExternalStore(lock.subscribe, lock.isOn);
  const [code, setCode] = useState('');
  const [again, setAgain] = useState('');
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState('');
  const digits = (value: string) => value.replace(/\D/g, '');

  if (!on) {
    return (
      <form
        className="settings-card"
        aria-label="Lock Reflect"
        onSubmit={async (event) => {
          event.preventDefault();
          if (code !== again) return setMessage('The two do not match.');
          try {
            await lock.turnOn(code);
            setCode('');
            setAgain('');
            setMessage('');
          } catch (reason) {
            setMessage(reason instanceof Error ? reason.message : 'Could not set the lock.');
          }
        }}
      >
        <p className="section-description">
          Ask for a passcode before Reflect, Journal, Insights and the weekly review open, and keep Reflect writing out of
          search. It locks again after the app has been out of sight for a minute. It keeps casual eyes out on this phone; it
          is not encryption, and the passcode stays on this device.
        </p>
        <input
          className="field-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          aria-label="Choose a passcode"
          placeholder="4 to 8 digits"
          value={code}
          onChange={(event) => setCode(digits(event.target.value))}
        />
        <input
          className="field-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          aria-label="Passcode again"
          placeholder="Again"
          value={again}
          onChange={(event) => setAgain(digits(event.target.value))}
        />
        {message && <p className="sheet__hint" role="status">{message}</p>}
        <button type="submit" className="chip chip--accent chip--wide" disabled={code.length < 4}>
          Turn on the lock
        </button>
      </form>
    );
  }

  return (
    <section className="settings-card" aria-label="Lock Reflect">
      <p className="section-description">The lock is on. Reflect and Journal ask for the passcode.</p>
      <button type="button" className="chip chip--wide" onClick={() => lock.lockNow()}>
        Lock now
      </button>
      <h2 className="section-label">Turn it off</h2>
      <input
        className="field-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={8}
        aria-label="Current passcode"
        placeholder="Your passcode"
        value={current}
        onChange={(event) => setCurrent(digits(event.target.value))}
      />
      {message && <p className="sheet__hint" role="status">{message}</p>}
      <button
        type="button"
        className="chip chip--wide"
        disabled={current.length < 4}
        onClick={async () => {
          if (await lock.check(current)) lock.turnOff();
          else {
            setMessage('That is not the passcode.');
            setCurrent('');
          }
        }}
      >
        Turn off the lock
      </button>
    </section>
  );
}

const WIDE = '(min-width: 62rem)';
const isWide = () => typeof matchMedia === 'function' && matchMedia(WIDE).matches;
function subscribeWide(notify: () => void) {
  if (typeof matchMedia !== 'function') return () => undefined;
  const query = matchMedia(WIDE);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}

function syncLabel(phase: string): string {
  if (phase === 'ready') return 'On';
  if (phase === 'unavailable') return 'This device';
  if (phase === 'signed-out') return 'Off';
  return 'Finish setup';
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const returnTo = useReturnRoute();
  const status = useSyncStatus();
  const { openSupport } = useOverlays();
  const [find, setFind] = useState('');
  const [view, setView] = useState<View | null>(() => {
    const requested = requestedView;
    requestedView = null;
    return requested;
  });
  // Re-read after the name page closes.
  const name = view === null ? displayName() : '';
  const [mode, setMode] = useState<'device' | 'memory'>('device');
  useEffect(() => {
    storageMode.then(setMode);
  }, []);
  useBackHandler(true, () => navigate(returnTo));
  // A detail page sits on top of the list, so back returns to the list first.
  useBackHandler(view !== null, () => setView(null));

  // On a wide screen the list stays beside the page it opens.
  const wide = useSyncExternalStore(subscribeWide, isWide);
  const detail = view ? (
      <>
        {!wide && (
          <button type="button" className="back-link" onClick={() => setView(null)}>
            <ArrowLeftIcon size={18} />
            Settings
          </button>
        )}
        <PageHeader title={viewTitles[view]} />
        {view === 'profile' && <ProfileSection onDone={() => setView(null)} />}
        {view === 'day' && <DaySection />}
        {view === 'offers' && <OffersSection />}
        {view === 'today' && (
          <>
            <TodaySection />
            <OffersSection />
          </>
        )}
        {view === 'appearance' && <AppearanceSection />}
        {view === 'lock' && <LockSection />}
        {view === 'help' && <HelpSection />}
        {view === 'calendars' && (
          <>
            <h2 className="settings-group__label">Calendars you see here</h2>
            <OtherCalendarsSection />
            <h2 className="settings-group__label">Your days, in another calendar</h2>
            <CalendarSection onOpenAccount={() => setView('account')} />
          </>
        )}
        {view === 'weather' && <WeatherSection />}
        {view === 'sources' && <SourcesSection />}
        {view === 'calendar' && <CalendarSection onOpenAccount={() => setView('account')} />}
        {view === 'account' && <ProfileSection onDone={() => undefined} />}
        {view === 'account' && <AccountSection />}
        {view === 'notifications' && <NotificationsSection />}
        {view === 'import' && <BringInSection />}
        {view === 'backup' && (
          <>
            <ExportSection />
            <DailySection />
            <ImportSection />
          </>
        )}
        {view === 'delete' && <DeleteSection />}
        {view === 'privacy' && (
          <section className="settings-card" aria-label="Privacy">
            <p className="section-description">
              {mode === 'device'
                ? 'Everything is stored on this device. If you turn on sync, it is encrypted here before anything is uploaded, so the server only ever holds locked data.'
                : 'This browser is not letting Proairetos save. Download a backup before closing the tab.'}
            </p>
            <p className="section-description">
              What you write is never analyzed, scored, or sent anywhere to be read. Notifications are written on this
              device; the server only ever learns when one is due.
            </p>
            <p className="section-description">
              Dictation, if you use it, is the one exception: your phone maker’s speech service (Apple or Google) turns
              your speech into text, as your keyboard’s microphone does. It asks before the first use.
            </p>
            <a className="text-link" href="/privacy" target="_blank" rel="noreferrer">
              Read the full privacy page
            </a>
          </section>
        )}
        {view === 'about' && (
          <section className="settings-card" aria-label="About">
            <p className="section-description">
              Proairetos records your life; it does not interpret it. You choose what matters, and the app reflects it
              back: no scores, no streaks, nothing ranked for you.
            </p>
            <p className="section-description">
              The name comes from Epictetus: prohairesis, the part of us that chooses how to respond.
            </p>
          </section>
        )}
        {view === 'about' && <SourcesSection />}
      </>
  ) : null;

  if (view && !wide) return <div className="page">{detail}</div>;

  type Entry = { id: string; icon: ReactNode; title: string; value?: string; onClick: () => void; words?: string };
  const app = (src: string) => <img className="settings-row__app" src={src} alt="" width={26} height={26} />;
  const groups: { label: string; entries: Entry[] }[] = [
    {
      label: 'Your days',
      entries: [
        { id: 'schedule', icon: <CalendarIcon size={22} />, title: 'Your schedule', onClick: () => navigate('schedule'), words: 'work shifts study rotation' },
        { id: 'day', icon: <MoonIcon size={22} />, title: 'Day starts', value: daySummary(), onClick: () => setView('day'), words: 'midnight turnover morning' },
        {
          id: 'calendars',
          icon: <CalendarIcon size={22} />,
          title: 'Calendars',
          value: calendarSources().length ? String(calendarSources().length) : undefined,
          onClick: () => setView('calendars'),
          words: 'google outlook ics subscription feed',
        },
        {
          id: 'weather',
          icon: <PartlyCloudyIcon size={22} />,
          title: 'Weather',
          value: weatherSettings().on ? 'On' : 'Off',
          onClick: () => setView('weather'),
          words: 'sky place location',
        },
      ],
    },
    {
      label: 'The app',
      entries: [
        {
          id: 'notifications',
          icon: <BellIcon size={22} />,
          title: 'Notifications',
          value: notifications.permission() === 'granted' ? 'On' : 'Off',
          onClick: () => setView('notifications'),
          words: 'reminders quiet hours lock screen push',
        },
        { id: 'today', icon: <SunIcon size={22} />, title: 'What’s included', onClick: () => setView('today'), words: 'parts today switch on off quiet offers' },
        {
          id: 'appearance',
          icon: <MoonIcon size={22} />,
          title: 'Appearance',
          value: themeLabels[loadAppearance().theme],
          onClick: () => setView('appearance'),
          words: 'theme dark light text size gentle taps',
        },
      ],
    },
    {
      label: 'Account and data',
      entries: [
        { id: 'lock', icon: <ShieldIcon size={22} />, title: 'Lock Reflect', value: lock.isOn() ? 'On' : 'Off', onClick: () => setView('lock'), words: 'passcode pin privacy journal' },
        { id: 'account', icon: <CloudIcon size={22} />, title: 'Account and sync', value: syncLabel(status.phase), onClick: () => setView('account'), words: 'sign in email devices recovery key' },
        {
          id: 'backup',
          icon: <InboxIcon size={22} />,
          title: 'Back up and restore',
          value: lastCopyLabel(lastBackupDate()),
          onClick: () => setView('backup'),
          words: 'export download markdown readable daily copies restore file',
        },
        { id: 'import', icon: <InboxIcon size={22} />, title: 'Bring things in', value: 'From other apps', onClick: () => setView('import'), words: 'import todoist csv calendar google tasks' },
        { id: 'privacy', icon: <ShieldIcon size={22} />, title: 'Privacy', onClick: () => setView('privacy') },
        { id: 'delete', icon: <span className="settings-row__danger">×</span>, title: 'Delete everything', onClick: () => setView('delete'), words: 'erase remove account data' },
      ],
    },
    {
      label: 'More apps',
      entries: [
        { id: 'askesis', icon: app('/askesis/icon.svg'), title: 'Askesis', value: 'Running, step by step', onClick: () => window.location.assign('/askesis/'), words: 'running training' },
        { id: 'soma', icon: app('/soma/icon.svg'), title: 'SOMA', value: 'Recipes and groceries', onClick: () => window.location.assign('/soma/'), words: 'recipes food cooking' },
        { id: 'oikonomia', icon: app('/oikonomia/icon.svg'), title: 'Oikonomia', value: 'Bills and household essentials', onClick: () => window.location.assign('/oikonomia/'), words: 'money bills budget' },
        { id: 'hydros', icon: app('/hydros/icon.svg'), title: 'HYDROS', value: 'Water, flow and balance', onClick: () => window.location.assign('/hydros/'), words: 'water drink' },
        { id: 'praxis', icon: app('/praxis/favicon.svg'), title: 'Praxis', value: 'Study, on purpose', onClick: () => window.location.assign('/praxis/'), words: 'study focus' },
        { id: 'theoria', icon: app('/theoria/favicon.svg'), title: 'Theoria', value: 'Reading and ideas', onClick: () => window.location.assign('/theoria/'), words: 'books reading' },
      ],
    },
    {
      label: 'About',
      entries: [
        { id: 'help', icon: <NoteIcon size={22} />, title: 'Help & feedback', onClick: () => setView('help') },
        { id: 'about', icon: <BookIcon size={22} />, title: 'About Proairetos', onClick: () => setView('about'), words: 'sources credits' },
      ],
    },
  ];
  const needle = find.trim().toLowerCase();
  const matches = needle
    ? [
        ...groups.flatMap((group) => group.entries),
        { id: 'name', icon: <PenIcon size={22} />, title: 'Your name', onClick: () => setView('account'), words: 'profile greeting called' } as Entry,
      ].filter((entry) => `${entry.title} ${entry.words ?? ''}`.toLowerCase().includes(needle))
    : [];

  const list = (
    <>
      <button type="button" className="back-link" onClick={() => navigate(returnTo)}>
        <ArrowLeftIcon size={18} />
        {tabLabels[returnTo] ?? 'Back'}
      </button>
      <PageHeader title="Settings" subtitle="Your practice, your data." />

      <input
        className="field-input settings-find"
        type="search"
        aria-label="Find a setting"
        placeholder="Find a setting"
        value={find}
        onChange={(event) => setFind(event.target.value)}
      />

      {needle ? (
        <div className="settings-list">
          {matches.length === 0 && <p className="empty-note">Nothing matches that.</p>}
          {matches.map((entry) => (
            <Row key={entry.id} icon={entry.icon} title={entry.title} value={entry.value} onClick={entry.onClick} />
          ))}
        </div>
      ) : (
        <>
          <button type="button" className="profile-card" onClick={() => setView('account')}>
            <span className="profile-card__photo" aria-hidden="true" style={{ backgroundImage: `url(${valley})`, '--photo-wide': `url(${valleyWide})` } as React.CSSProperties} />
            <span className="profile-card__text">
              <span className="profile-card__name">{name || 'Add your name'}</span>
              <span className="profile-card__detail">
                {status.email ?? (name ? 'On this device' : 'So Today can greet you')}
              </span>
            </span>
            <ChevronRightIcon size={18} className="settings-row__chevron" />
          </button>

          {groups.map((group) => (
            <SettingsGroup key={group.label} label={group.label}>
              {group.entries.map((entry) => (
                <Row key={entry.id} icon={entry.icon} title={entry.title} value={entry.value} onClick={entry.onClick} />
              ))}
            </SettingsGroup>
          ))}

          <div className="settings-list">
            <Row icon={<HeartIcon size={22} />} title="If things feel like too much" onClick={openSupport} />
          </div>

        </>
      )}
    </>
  );

  if (!wide) return <div className="page settings-page">{list}</div>;
  return (
    <div className="page settings-split">
      <div className="settings-split__list">{list}</div>
      <div className="settings-split__detail">{detail}</div>
    </div>
  );
}
