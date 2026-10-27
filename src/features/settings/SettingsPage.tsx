import StorageFacts from '../../app/family/StorageFacts';
import { BACKUP_ACCEPT, backupText, downloadBackup } from '../../data/backup/packing';
import StoreSection from './StoreSection';
import { shownView, takeRequestedView, viewTitles, type View } from './settingsViews';
import { familyApps } from '../../app/family/FamilyApps';
import { useAddedApps, type AddOn } from '../../app/family/added';
import { promptText } from '../reflect/prompts';
import { notifications } from '../../app/notify/notifications';
import { localDayKey } from '../../data/storage/preferences';
import NotificationsSection from './NotificationsSection';
import BringInSection from './BringInSection';
import InboxSection from './InboxSection';
import HealthSection from './HealthSection';
import TogetherSection from './TogetherSection';
import { togetherList } from '../../app/together/together';
import { inboxHere } from '../../app/capture/inbox';

const healthOn = () => {
  try {
    return !!localStorage.getItem('proairetos.health');
  } catch {
    return false;
  }
};
import { useBackHandler } from '../../app/back/backStack';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { lock } from '../../app/lock/lock';
import { useNavigate, useReturnRoute } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { applyAppearance } from '../../app/appearance';
import { LAMP_COLORS, ROOMS, WALL_STYLES, colorFor, swatchOf, wallpaperOf } from '../../app/lamplight';
import { ownHue } from '../../core/look/lamplight';
import { FEEDBACK_EMAIL } from '../../app/siteAddress';
import { backupService, storageMode } from '../../app/services';
import {
  ArrowLeftIcon,
  BellIcon,
  BriefcaseIcon,
  CaptureIcon,
  BookIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CloudIcon,
  CompassIcon,
  HeartIcon,
  InboxIcon,
  MoonIcon,
  NoteIcon,
  PartlyCloudyIcon,
  PenIcon,
  ShieldIcon,
  StarIcon,
  SunIcon,
} from '../../components/icons/Icons';
import { whatsNew } from '../../app/whatsNew';
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
import { signOut, syncSoon, syncStatus } from '../../app/sync/syncController';
import AccountSection, { useSyncStatus } from './AccountSection';
import CalendarSection from './CalendarSection';
import OtherCalendarsSection from './OtherCalendarsSection';
import WeatherSection from './WeatherSection';
import { weatherSettings } from '../../app/weather/weather';
import { calendarSources } from '../../app/calendars/otherCalendars';
import type { AppRoute } from '../../app/routes/routeTypes';
import { dayName, useDailyCopies } from '../../app/family/useDailyCopies';
import { Waiting } from '../../lamplight/Waiting';
import PwaInstallSection from './PwaInstallSection';

function download(text: string) {
  return downloadBackup(text, localDayKey(new Date()));
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
        One file for every app, with settings, photos and files. Keep it off this device.
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
        Reflections, decisions, Compass and captures as Markdown. Not a backup, and no password.
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
          <span className="toggle-row__detail">On this device, the last seven days</span>
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
                  setError('Restoring stopped partway. Your backup file is unchanged. Try again.');
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
    const content = await backupText(file).catch(() => '');
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
      setError('Restoring stopped partway. Your backup file is unchanged. Try again.');
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-label="Restore">
      <h2 className="section-label">Restore from a backup</h2>
      <p className="section-description">
        Replaces what is on this device, in every app, with the backup.
      </p>
      <input
        ref={input}
        type="file"
        accept={BACKUP_ACCEPT}
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
            {busy ? <Waiting>Opening…</Waiting> : 'Open'}
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
        Removes everything from this device. With sync on, this device signs out first, so other devices and your
        account keep their copy.
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

/** A few related rows under a small heading. */
function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="settings-group" aria-label={label}>
      <h2 className="settings-group__label">{label}</h2>
      <div className="settings-list">{children}</div>
    </section>
  );
}

type Tone = 'gold' | 'blue' | 'indigo' | 'teal' | 'green' | 'orange' | 'red' | 'pink' | 'gray' | 'app';

function Row({ icon, tone = 'gray', title, value, onClick }: { icon: ReactNode; tone?: Tone; title: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" className="settings-row" onClick={onClick}>
      <span className={`settings-row__icon settings-tile settings-tile--${tone}`}>{icon}</span>
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
        syncSoon();
        onDone();
      }}
    >
      <p className="sheet__label">Your name</p>
      <input
        className="field-input"
        autoComplete="given-name"
        aria-label="Name"
        placeholder="What would you like to be called?"
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {name.trim() !== displayName() && (
        <div className="composer__actions">
          <button type="submit" className="button-accent">
            Save
          </button>
        </div>
      )}
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
        When Today turns over to a new day.
      </p>
      <button
        type="button"
        className="toggle-row"
        aria-pressed={settings.followShifts}
        onClick={() => update({ ...settings, followShifts: !settings.followShifts })}
      >
        <span className={`toggle-switch${settings.followShifts ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span>Late hours count as the same day</span>
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
          { part: 'line', label: 'The daily thought' },
          { part: 'intention', label: 'Today’s intention' },
          { part: 'path', label: 'Today’s to-do' },
          { part: 'capture', label: 'Capture line' },
          { part: 'close-day', label: 'Close the day' },
          { part: 'three-good-things', label: 'Three good things' },
          { part: 'on-this-day', label: 'On this day', detail: 'What you wrote on this date in past years.' },
          { part: 'open-time', label: 'Open time' },
          { part: 'look-ahead', label: 'Look ahead', rare: true },
          { part: 'schedule-prompt', label: 'Add your schedule', rare: true },
          { part: 'a-while-ago', label: 'From a while ago', rare: true },
        ],
      },
      {
        label: 'Capture',
        parts: [
          { part: 'brain-dump', label: 'Empty your head', detail: 'Write everything at once, then check each item.' },
          { part: 'sort-through', label: 'Sort through', detail: 'Go through unsorted items one at a time.' },
          { part: 'gratitude', label: 'Grateful', detail: 'Things you’re grateful for, saved to Reflect.' },
          { part: 'energy', label: 'Energy', detail: 'Set your energy for the day; light items show first.' },
        ],
      },
      {
        label: 'Compass',
        parts: [
          { part: 'goals', label: 'Goals', detail: 'What you’re working toward, with time set aside.' },
          { part: 'pursuits', label: 'Pursuits', detail: 'A flexible space to clarify a project, change, care responsibility, or question.' },
          { part: 'people', label: 'People', detail: 'The people who matter to you.' },
          { part: 'words', label: 'Words', detail: 'What’s worth getting up for, and what you’ve set aside.' },
        ],
      },
      {
        label: 'Reflect',
        parts: [
          { part: 'meditate', label: 'Meditate', detail: 'Sessions, breathing, sounds, and music.' },
          { part: 'insights', label: 'Insights', detail: 'Counts of what you recorded.' },
          { part: 'weekly-review', label: 'Weekly review', detail: 'About 15 minutes.' },
          { part: 'decisions', label: 'Decisions', detail: 'Choices you wrote down, to look back on.' },
        ],
      },
    ],
  },
  {
            app: 'Askesis',
            sections: [{ parts: [{ part: 'askesis', label: 'Runs', detail: 'A running plan around your week; today’s run on Today and finished runs in Reflect.' }] }],
  },
  {
    app: 'Soma',
    sections: [{ parts: [{ part: 'soma', label: 'Meals', detail: 'Meals planned in Soma in Days ahead; meals cooked for someone in Reflect.' }] }],
  },
  {
    app: 'Praxis',
    sections: [{ parts: [{ part: 'praxis', label: 'Study', detail: 'Study time in Done today and Reflect; a block you set to look at again, on Today.' }] }],
  },
  {
    app: 'Theoria',
    sections: [{ parts: [{ part: 'highlight', label: 'A highlight a day', detail: 'One of your Theoria highlights on Today, a different one each day.' }] }],
  },
  {
    app: 'Diaita',
    sections: [{ parts: [{ part: 'diaita', label: 'Tonight’s sleep', detail: 'When to sleep tonight, and a nap or last caffeine before it.' }] }],
  },
  {
    app: 'Philia',
    sections: [
      {
        parts: [
          { part: 'birthdays', label: 'Birthdays on Today', detail: 'Birthdays and dates in the next week.' },
          { part: 'birthday-dates', label: 'Birthdays in Days ahead', detail: 'On their day in the list and the calendar.' },
        ],
      },
    ],
  },
  {
    app: 'Ergon',
    sections: [{ parts: [{ part: 'chores', label: 'Chores', detail: 'Chores whose day has come.' }] }],
  },
  {
    app: 'Therapeia',
    sections: [{ parts: [{ part: 'medicines', label: 'Medicines', detail: 'Today’s doses not yet marked, and a visit today.' }] }],
  },
  {
    app: 'Dynamis',
    sections: [{ parts: [{ part: 'training', label: 'Training days', detail: 'The session waiting on a planned day.' }] }],
  },
  {
    app: 'Ktema',
    sections: [{ parts: [{ part: 'upkeep', label: 'Upkeep', detail: 'Upkeep whose day has come.' }] }],
  },
  {
    app: 'Phyton',
    sections: [{ parts: [{ part: 'plants', label: 'Plants', detail: 'Plants whose day to check has come.' }] }],
  },
  {
    app: 'Poreia',
    sections: [{ parts: [{ part: 'trips', label: 'Trips', detail: 'A trip under way or a few days off, with its next thing.' }] }],
  },
  {
    app: 'Mneme',
    sections: [{ parts: [{ part: 'mneme', label: 'Ideas and notes', detail: 'An idea ready for its next step or a pinned note on Today.' }] }],
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
const wallStyleLabels = { paper: 'Paper', ink: 'Ink', wood: 'Wood' } as const;

const helpTopics: { title: string; body: string }[] = [
  {
    title: 'Capture first',
    body: 'Put anything in the capture box the moment it arrives. Sorting can wait.',
  },
  {
    title: 'Today',
    body: 'A greeting, a daily thought, and the parts you choose: an intention, a to-do for the day, your schedule. Tap the leaf for a lighter view.',
  },
  {
    title: 'Days ahead',
    body: 'Your coming days as a list or a calendar. A list can repeat every week or on weekdays.',
  },
  {
    title: 'Pause and practices',
    body: 'A one-minute breathing pause. “Another way to pause” has a few short practices from Stoic and Buddhist traditions.',
  },
  {
    title: 'Reflect and Insights',
    body: 'Insights counts what you recorded. It draws no conclusions.',
  },
  {
    title: 'Your data',
    body: 'Everything stays on this device unless you turn on sync, which is encrypted here first. Backups live in Settings > Your data.',
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
      ) : null}
    </section>
  );
}

function AppearanceSection() {
  const [appearance, setAppearance] = useState(loadAppearance);
  const mode =
    appearance.theme === 'light' ||
    (appearance.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches)
      ? 'light'
      : 'dark';
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
      <p className="sheet__label">Room</p>
      <div className="room-grid" role="radiogroup" aria-label="Room">
        {ROOMS.map((room) => (
          <button
            key={room}
            type="button"
            role="radio"
            className="room-tile"
            aria-checked={appearance.room === room}
            onClick={() => update({ ...appearance, room })}
          >
            <span
              className="room-tile__art"
              style={{ backgroundImage: wallpaperOf(room, mode) }}
              aria-hidden="true"
            />
            <span className="room-tile__name">{room}</span>
          </button>
        ))}
      </div>
      <p className="sheet__label">Wall style</p>
      <div className="wall-style-grid" role="radiogroup" aria-label="Wall style">
        {WALL_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            role="radio"
            className="wall-style-tile"
            aria-checked={appearance.wallStyle === style}
            onClick={() => update({ ...appearance, wallStyle: style })}
          >
            <span
              className="wall-style-tile__art"
              style={{ backgroundImage: wallpaperOf(appearance.room, mode, false, style) }}
              aria-hidden="true"
            />
            <span className="wall-style-tile__name">{wallStyleLabels[style]}</span>
          </button>
        ))}
      </div>
      <p className="sheet__label">Color</p>
      <div className="lamp-colors" role="radiogroup" aria-label="Color">
        <button
          type="button"
          role="radio"
          className="lamp-color lamp-color--match"
          aria-checked={appearance.color === 'match'}
          onClick={() => update({ ...appearance, color: 'match' })}
        >
          <span
            className="lamp-color__dot"
            style={{ background: swatchOf(colorFor(appearance.room, 'match'), mode, appearance.room) }}
            aria-hidden="true"
          />
          Match
        </button>
        {LAMP_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            className="lamp-color"
            aria-checked={appearance.color === color}
            onClick={() => update({ ...appearance, color })}
          >
            <span className="lamp-color__dot" style={{ background: swatchOf(color, mode, appearance.room) }} aria-hidden="true" />
            {color}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          className="lamp-color"
          aria-checked={ownHue(appearance.color) !== null}
          onClick={() => update({ ...appearance, color: `hue:${ownHue(appearance.color) ?? 200}` })}
        >
          <span className="lamp-color__dot lamp-color__dot--own" style={{ background: swatchOf(`hue:${ownHue(appearance.color) ?? 200}`, mode, appearance.room) }} aria-hidden="true" />
          Your own
        </button>
      </div>
      {ownHue(appearance.color) !== null && (
        <label className="lamp-hue">
          <span className="sheet__label">Hue</span>
          <input
            type="range"
            min={0}
            max={359}
            value={ownHue(appearance.color) ?? 200}
            onChange={(event) => update({ ...appearance, color: `hue:${Number(event.target.value)}` })}
          />
        </label>
      )}
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
      <button
        type="button"
        className="toggle-row"
        aria-pressed={appearance.taps}
        onClick={() => update({ ...appearance, taps: !appearance.taps })}
      >
        <span className={`toggle-switch${appearance.taps ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span className="toggle-row__text">
          <span>Gentle taps</span>
          <span className="toggle-row__detail">When you tick or switch something</span>
        </span>
      </button>
      <button
        type="button"
        className="toggle-row"
        aria-pressed={appearance.dayLight}
        onClick={() => update({ ...appearance, dayLight: !appearance.dayLight })}
      >
        <span className={`toggle-switch${appearance.dayLight ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span className="toggle-row__text">
          <span>Light follows your day</span>
          <span className="toggle-row__detail">Lower and warmer late in your day</span>
        </span>
      </button>
    </section>
  );
}

function TodaySection() {
  const shows = useTodayParts();
  const addedNow = useAddedApps();
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
    <div className="settings-sections" aria-label="What’s included">
      {appParts.filter(({ app }) => app === 'Proairetos' || addedNow.includes(app.toLowerCase() as AddOn)).flatMap(({ app, sections }) =>
        sections.map((section) => {
          const main = section.parts.filter((entry) => !entry.rare);
          const rare = section.parts.filter((entry) => entry.rare);
          const icon = familyApps.find((each) => each.name === app)?.icon;
          return (
            <section key={`${app}-${section.label ?? ''}`} className="settings-group" aria-label={section.label ?? app}>
              <h2 className="settings-group__label">
                {!section.label && icon && <img src={icon} alt="" width={18} height={18} />}
                {section.label ?? app}
              </h2>
              <div className="settings-card settings-card--rows">
                {main.map(row)}
                {rare.length > 0 && (
                  <details className="sheet__more">
                    <summary>A few more</summary>
                    <div className="sheet__more-body">{rare.map(row)}</div>
                  </details>
                )}
              </div>
            </section>
          );
        }),
      )}
    </div>
  );
}

function OffersSection() {
  const [on, setOn] = useState(quietOffersOn);
  const [hidden, setHidden] = useState(hiddenOffers);
  const [showSetAside, setShowSetAside] = useState(showNotForMe);
  return (
    <section className="settings-group settings-sections" aria-label="Quiet offers">
      <h2 className="settings-group__label">Quiet offers</h2>
      <div className="settings-card settings-card--rows">
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
        <span>Show “Not for me” on cards</span>
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
      </div>
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
          if (code !== again) return setMessage('The passphrases don’t match.');
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
          A passcode before Reflect, Journal, Insights and the weekly review; Reflect stays out of search. Privacy on
          this device, not encryption.
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
            setMessage('That passcode isn’t right.');
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
  const [view, setShown] = useState<View | null>(() => {
    return takeRequestedView();
  });
  const setView = (next: View | null) => setShown(next && shownView(next));
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
  // Every hook stays above the early return below.
  const added = useAddedApps();
  const detail = view ? (
      <>
        {!wide && (
          <button type="button" className="back-link" onClick={() => setView(null)}>
            <ArrowLeftIcon size={18} />
            Settings
          </button>
        )}
        <PageHeader title={viewTitles[view]} />
        {view === 'day' && <DaySection />}
        {view === 'today' && (
          <>
            <TodaySection />
            <OffersSection />
          </>
        )}
        {view === 'appearance' && <AppearanceSection />}
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
        {view === 'inbox' && <InboxSection onOpenAccount={() => setView('account')} />}
        {view === 'health' && <HealthSection onOpenAccount={() => setView('account')} onOpenStore={() => setView('store')} />}
        {view === 'together' && <TogetherSection onOpenAccount={() => setView('account')} />}
        {view === 'install' && <PwaInstallSection />}
        {view === 'account' && <AccountSection />}
        {view === 'account' && <ProfileSection onDone={() => undefined} />}
        {view === 'notifications' && <NotificationsSection />}
        {view === 'backup' && (
          <>
            <StorageFacts className="section-description" />
            <ExportSection />
            <DailySection />
            <ImportSection />
            <h2 className="settings-group__label">Bring things in</h2>
            <BringInSection />
            <DeleteSection />
          </>
        )}
        {view === 'privacy' && <LockSection />}
        {view === 'privacy' && (
          <section className="settings-card" aria-label="Privacy">
            <p className="section-description">
              {mode === 'device'
                ? 'Everything is stored on this device. With sync on, it’s encrypted here before upload, so the server can’t read it.'
                : 'This browser is not letting Proairetos save. Download a backup before closing the tab.'}
            </p>
            <p className="section-description">
              What you write is never analyzed or scored. Reminder text is encrypted too; the server only knows when each is due.
            </p>
            <p className="section-description">
              Dictation uses your phone’s speech service (Apple or Google), like your keyboard’s microphone.
            </p>
            <a className="text-link" href="/privacy" target="_blank" rel="noreferrer">
              Read the full privacy page
            </a>
          </section>
        )}
        {view === 'about' && (
          <section className="settings-card" aria-label="About">
            <p className="section-description">
              Proairetos records your life and leaves the meaning to you. No scores, no streaks, nothing ranked for you.
            </p>
            <p className="section-description">
              The name comes from Epictetus: prohairesis, the part of us that chooses how to respond.
            </p>
          </section>
        )}
        {view === 'about' && <SourcesSection />}
        {view === 'store' && <StoreSection />}
        {view === 'news' && (
          <section className="settings-card" aria-label="What’s new">
            {whatsNew.map((entry) => (
              <div key={entry.date} className="sources">
                <p className="sheet__label">{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <ul className="whats-new">
                  {entry.lines.map((line) => <li key={line} className="section-description">{line}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}
      </>
  ) : null;

  if (view && !wide) return <div className="page">{detail}</div>;

  type Entry = { id: string; icon: ReactNode; tone?: Tone; title: string; value?: string; onClick: () => void; words?: string };
  const app = (src: string) => <img className="settings-row__app" src={src} alt="" width={26} height={26} />;
  const groups: { label: string; entries: Entry[] }[] = [
    {
      label: 'Your days',
      entries: [
        { id: 'schedule', icon: <BriefcaseIcon size={18} />, tone: 'indigo', title: 'Your schedule', onClick: () => navigate('schedule'), words: 'work shifts study rotation' },
        {
          id: 'calendars',
          icon: <CalendarIcon size={18} />,
          tone: 'red',
          title: 'Calendars',
          value: calendarSources().length ? String(calendarSources().length) : undefined,
          onClick: () => setView('calendars'),
          words: 'google outlook ics subscription feed share',
        },
        { id: 'day', icon: <ClockIcon size={18} />, tone: 'orange', title: 'Day starts', value: daySummary(), onClick: () => setView('day'), words: 'midnight turnover morning night shift' },
        {
          id: 'weather',
          icon: <PartlyCloudyIcon size={18} />,
          tone: 'blue',
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
          icon: <BellIcon size={18} />,
          tone: 'red',
          title: 'Notifications',
          value: notifications.permission() === 'granted' ? 'On' : 'Off',
          onClick: () => setView('notifications'),
          words: 'reminders quiet hours lock screen push',
        },
        { id: 'together', icon: <HeartIcon size={18} />, tone: 'green', title: 'Shared list', value: togetherList()?.name, onClick: () => setView('together'), words: 'partner family household share together to-do list invite' },
        { id: 'inbox', icon: <CaptureIcon size={18} />, tone: 'teal', title: 'Capture from anywhere', value: inboxHere() ? 'On' : undefined, onClick: () => setView('inbox'), words: 'siri shortcut back tap watch quick add inbox' },
        { id: 'health', icon: <HeartIcon size={18} />, tone: 'pink', title: 'Health data', value: healthOn() ? 'On' : undefined, onClick: () => setView('health'), words: 'apple health connect android hc webhook health auto export workouts sleep water weight blood pressure iphone watch' },
        { id: 'today', icon: <SunIcon size={18} />, tone: 'gold', title: 'What’s included', onClick: () => setView('today'), words: 'parts today switch on off quiet offers not for me' },
        {
          id: 'appearance',
          icon: <MoonIcon size={18} />,
          tone: 'indigo',
          title: 'Appearance',
          value: themeLabels[loadAppearance().theme],
          onClick: () => setView('appearance'),
          words: 'theme dark light text size gentle taps',
        },
        { id: 'install', icon: <CloudIcon size={18} />, tone: 'blue', title: 'Install Proairetos', value: 'Home Screen', onClick: () => setView('install'), words: 'pwa home screen standalone install offline' },
      ],
    },
    {
      label: 'Account and data',
      entries: [
        { id: 'account', icon: <CloudIcon size={18} />, tone: 'blue', title: 'Account and sync', value: syncLabel(status.phase), onClick: () => setView('account'), words: 'sign in email devices recovery key passkey passphrase storage google drive dropbox onedrive' },
        { id: 'privacy', icon: <ShieldIcon size={18} />, tone: 'gray', title: 'Privacy and lock', value: lock.isOn() ? 'Locked' : undefined, onClick: () => setView('privacy'), words: 'passcode pin journal reflect lock' },
        {
          id: 'backup',
          icon: <InboxIcon size={18} />,
          tone: 'green',
          title: 'Your data',
          value: lastCopyLabel(lastBackupDate()),
          onClick: () => setView('backup'),
          words: 'back up backup export download markdown readable daily copies restore file import todoist csv google tasks bring in delete erase',
        },
      ],
    },
    {
      label: 'Apps',
      entries: [
        { id: 'store', icon: <CompassIcon size={18} />, tone: 'gold', title: 'Store', onClick: () => setView('store'), words: 'apps add more askesis soma oikonomia hydros praxis theoria diaita philia ergon therapeia dynamis ktema phyton running recipes bills water study reading sleep people chores medicines strength upkeep warranty plants garden' },
        ...familyApps
          .filter((each) => each.id !== 'proairetos' && added.includes(each.id as AddOn))
          .map((each) => ({ id: each.id, icon: app(each.icon), tone: 'app' as Tone, title: each.name, onClick: () => window.location.assign(each.href), words: each.line.toLowerCase() })),
      ],
    },
    {
      label: 'About',
      entries: [
        { id: 'help', icon: <NoteIcon size={18} />, tone: 'teal', title: 'Help and feedback', onClick: () => setView('help') },
        { id: 'news', icon: <StarIcon size={18} />, tone: 'pink', title: 'What’s new', onClick: () => setView('news'), words: 'changes updates new features' },
        { id: 'about', icon: <BookIcon size={18} />, tone: 'gray', title: 'About Proairetos', onClick: () => setView('about'), words: 'sources credits' },
      ],
    },
  ];
  const needle = find.trim().toLowerCase();
  const matches = needle
    ? [
        ...groups.flatMap((group) => group.entries),
        { id: 'name', icon: <PenIcon size={18} />, tone: 'gold', title: 'Your name', onClick: () => setView('account'), words: 'profile greeting called' } as Entry,
      ].filter((entry) => `${entry.title} ${entry.words ?? ''}`.toLowerCase().includes(needle))
    : [];

  const list = (
    <>
      <button type="button" className="back-link" onClick={() => navigate(returnTo)}>
        <ArrowLeftIcon size={18} />
        {tabLabels[returnTo] ?? 'Back'}
      </button>
      <PageHeader title="Settings" />

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
            <Row key={entry.id} icon={entry.icon} tone={entry.tone} title={entry.title} value={entry.value} onClick={entry.onClick} />
          ))}
        </div>
      ) : (
        <>
          <button type="button" className="profile-card" onClick={() => setView('account')}>
            <span className="profile-card__photo" aria-hidden="true" style={{ backgroundImage: `url(${valley})`, '--photo-wide': `url(${valleyWide})` } as React.CSSProperties} />
            <span className="profile-card__text">
              <span className="profile-card__name">{name || 'Add your name'}</span>
              <span className="profile-card__detail">
                {status.email ?? (name ? 'Greets you in every app' : 'So the apps can greet you')}
              </span>
            </span>
            <ChevronRightIcon size={18} className="settings-row__chevron" />
          </button>

          {groups.map((group) => (
            <SettingsGroup key={group.label} label={group.label}>
              {group.entries.map((entry) => (
                <Row key={entry.id} icon={entry.icon} tone={entry.tone} title={entry.title} value={entry.value} onClick={entry.onClick} />
              ))}
            </SettingsGroup>
          ))}

          <div className="settings-list">
            <Row icon={<HeartIcon size={18} />} tone="pink" title="If things feel like too much" onClick={openSupport} />
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
