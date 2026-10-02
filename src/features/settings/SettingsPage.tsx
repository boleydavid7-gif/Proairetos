import { useBackHandler } from '../../app/back/backStack';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useReturnRoute } from '../../app/navigationContext';
import { backupService, storageMode } from '../../app/services';
import {
  ArrowLeftIcon,
  BookIcon,
  BreatheIcon,
  CalendarIcon,
  ChevronRightIcon,
  CloudIcon,
  CompassIcon,
  InboxIcon,
  MoonIcon,
  ShieldIcon,
} from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { countRecords, parseBackupFile, type BackupData } from '../../data/backup/format';
import {
  clearPreferences,
  displayName,
  hiddenOffers,
  quietOffersOn,
  restoreOffers,
  setQuietOffers,
  lastBackupDate,
  loadCalendarFeed,
  loadDaySettings,
  recordBackup,
  saveDaySettings,
  setDisplayName,
} from '../../data/storage/preferences';
import { AFTER_WORK_HOURS } from '../../core/rhythm/personalDay';
import valley from '../../assets/images/scenes/valley.webp';
import { signOut, syncStatus } from '../../app/sync/syncController';
import AccountSection, { useSyncStatus } from './AccountSection';
import CalendarSection from './CalendarSection';
import type { AppRoute } from '../../app/routes/routeTypes';

function download(text: string) {
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `proairetos-backup-${date}.json`;
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
        Saves everything to a file you keep: on your phone, in your own cloud storage, or by email to yourself.
      </p>
      <label className="plan-field">
        <span>Password (optional, recommended)</span>
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
        {last ? `Last backup ${new Date(last).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.` : 'No backup yet.'}
      </p>
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
      <p className="section-description">Replaces what is on this device with the backup. Nothing changes until you confirm.</p>
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
            Backup from {new Date(ready.exportedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}:{' '}
            {describeCounts(ready.data)}.
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
        Removes all your items, reflections, decisions, values, and schedules from this device. If you use sync, this device
        is signed out first, so your other devices and encrypted account are not affected.
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
  plan: 'Plan',
  capture: 'Capture',
  compass: 'Compass',
};

type View = 'offers' | 'sources' | 'calendar' | 'day' | 'profile' | 'account' | 'backup' | 'privacy' | 'delete' | 'about';

const viewTitles: Record<View, string> = {
  profile: 'Your name',
  day: 'When your day starts',
  calendar: 'Calendar subscription',
  offers: 'Quiet offers',
  sources: 'Where this comes from',
  account: 'Account and sync',
  backup: 'Back up and restore',
  privacy: 'Privacy',
  delete: 'Delete everything',
  about: 'About Proairetos',
};

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
        <span>Let my day follow my shifts</span>
      </button>
      <p className="sheet__hint">
        A shift that runs past the turnover keeps the day going until {AFTER_WORK_HOURS} hours after it ends, so a night
        shift and the time after it stay one day. Uses the work hours in your schedule.
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
  return settings.followShifts ? 'Follows shifts' : hourLabel(settings.startHour);
}

function OffersSection() {
  const [on, setOn] = useState(quietOffersOn);
  const [hidden, setHidden] = useState(hiddenOffers);
  return (
    <section className="settings-card" aria-label="Quiet offers">
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
  const [view, setView] = useState<View | null>(null);
  // Re-read after the name page closes.
  const name = view === null ? displayName() : '';
  const [mode, setMode] = useState<'device' | 'memory'>('device');
  useEffect(() => {
    storageMode.then(setMode);
  }, []);
  useBackHandler(true, () => navigate(returnTo));
  // A detail page sits on top of the list, so back returns to the list first.
  useBackHandler(view !== null, () => setView(null));

  if (view) {
    return (
      <div className="page">
        <button type="button" className="back-link" onClick={() => setView(null)}>
          <ArrowLeftIcon size={18} />
          Settings
        </button>
        <PageHeader title={viewTitles[view]} />
        {view === 'profile' && <ProfileSection onDone={() => setView(null)} />}
        {view === 'day' && <DaySection />}
        {view === 'offers' && <OffersSection />}
        {view === 'sources' && <SourcesSection />}
        {view === 'calendar' && <CalendarSection onOpenAccount={() => setView('account')} />}
        {view === 'account' && <AccountSection />}
        {view === 'backup' && (
          <>
            <ExportSection />
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
              What you write is never analyzed, scored, or sent anywhere to be read. Reminders arrive without their text; the
              app shows the words only after it opens on your device.
            </p>
            <p className="section-description">
              Dictation, if you use it, is the one exception: your phone maker’s speech service (Apple or Google) turns your
              speech into text, as your keyboard’s microphone does. It asks before the first use.
            </p>
          </section>
        )}
        {view === 'about' && (
          <section className="settings-card" aria-label="About">
            <p className="section-description">
              Proairetos records your life; it does not interpret it. You choose what matters, and the app reflects it back:
              no scores, no streaks, nothing ranked for you.
            </p>
            <p className="section-description">
              The name comes from Epictetus: prohairesis, the part of us that chooses how to respond.
            </p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate(returnTo)}>
        <ArrowLeftIcon size={18} />
        {tabLabels[returnTo] ?? 'Back'}
      </button>
      <PageHeader title="Settings" subtitle="Your practice, your data." />

      <button type="button" className="profile-card" onClick={() => setView('profile')}>
        <span className="profile-card__photo" aria-hidden="true" style={{ backgroundImage: `url(${valley})` }} />
        <span className="profile-card__text">
          <span className="profile-card__name">{name || 'Add your name'}</span>
          <span className="profile-card__detail">{status.email ?? (name ? 'On this device' : 'So Today can greet you')}</span>
        </span>
        <ChevronRightIcon size={18} className="settings-row__chevron" />
      </button>

      <div className="settings-list">
        <Row icon={<CloudIcon size={22} />} title="Account and sync" value={syncLabel(status.phase)} onClick={() => setView('account')} />
        <Row icon={<CompassIcon size={22} />} title="Values" onClick={() => navigate('compass')} />
        <Row icon={<CalendarIcon size={22} />} title="Schedule and shifts" onClick={() => navigate('schedule')} />
        <Row icon={<MoonIcon size={22} />} title="When your day starts" value={daySummary()} onClick={() => setView('day')} />
        <Row
          icon={<CalendarIcon size={22} />}
          title="Calendar subscription"
          value={loadCalendarFeed().enabled ? 'On' : undefined}
          onClick={() => setView('calendar')}
        />
      </div>

      <div className="settings-list">
        <Row icon={<ShieldIcon size={22} />} title="Privacy" onClick={() => setView('privacy')} />
        <Row icon={<InboxIcon size={22} />} title="Back up and restore" onClick={() => setView('backup')} />
        <Row icon={<BreatheIcon size={22} />} title="Quiet offers" value={quietOffersOn() ? 'On' : 'Off'} onClick={() => setView('offers')} />
        <Row icon={<BookIcon size={22} />} title="About Proairetos" onClick={() => setView('about')} />
        <Row icon={<CompassIcon size={22} />} title="Where this comes from" onClick={() => setView('sources')} />
      </div>

      <div className="settings-list">
        <Row icon={<span className="settings-row__danger">×</span>} title="Delete everything" onClick={() => setView('delete')} />
      </div>
    </div>
  );
}
