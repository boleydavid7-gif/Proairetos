import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { useClock } from '../app/hooks/useClock';
import { startSync, syncStatus, onRemoteChanges } from '../app/sync/syncController';
import { lifeService } from '../app/services';
import { useServiceData } from '../app/hooks/useServiceData';
import { displayName } from '../data/storage/preferences';
import { loadFocusSession, saveFocusSession } from '../data/storage/preferences';
import { focusedMinutes, formatClockDown, isFinished, pause, remainingMs, resume, startSession, type FocusSession } from '../core/focus/session';
import type { ItemEvent } from '../core/item-events/types';
import type { LifeItem } from '../core/life-items/types';
import { player, type PlayerState } from '../app/sound/player';
import { soundEntry } from '../app/sound/soundscapes';
import { GearIcon, BookIcon, BreatheIcon, CalendarIcon, CheckIcon, ClockIcon, MountainIcon, SproutIcon, StarIcon, SunIcon } from '../components/icons/Icons';
import PraxisMark from '../components/brand/PraxisMark';
import AccountSection from '../features/settings/AccountSection';
import {
  dayMinutes,
  formatMinutes,
  formatSessionDate,
  focusMinutes,
  localDateKey,
  praxisFocusEvents,
  quoteFor,
  summarizeFocus,
} from './data';

type View = 'today' | 'sessions' | 'stats' | 'sounds' | 'settings';

const DEFAULT_TASKS = [
  { title: 'Deep Work', minutes: 25 },
  { title: 'Read and take notes', minutes: 50 },
  { title: 'Review one idea', minutes: 25 },
] as const;

const PRAXIS_SOUND_IDS = ['forest', 'rain', 'ocean', 'river', 'wind', 'fan', 'campfire', 'crickets'] as const;

const navItems: readonly { id: View; label: string; icon: typeof SunIcon }[] = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'sessions', label: 'Sessions', icon: CalendarIcon },
  { id: 'stats', label: 'Stats', icon: MountainIcon },
  { id: 'sounds', label: 'Sounds', icon: BreatheIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

function greeting(name: string): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${time}, ${name}.` : `${time}.`;
}

function usePraxisEvents(): ItemEvent[] | undefined {
  const local = useServiceData(lifeService.subscribe, () => lifeService.historyForAll());
  const [, setRemoteTick] = useState(0);
  useEffect(() => onRemoteChanges(() => setRemoteTick((tick) => tick + 1)), []);
  return local;
}

function syncLabel(phase: ReturnType<typeof syncStatus.get>['phase']): string {
  if (phase === 'ready') return 'Synced with Proairetos';
  if (phase === 'locked') return 'Sync is locked';
  if (phase === 'needs-setup') return 'Finish sync setup in Proairetos';
  if (phase === 'signed-out') return 'Sign in from Proairetos to sync';
  return 'Saved on this device';
}

export default function PraxisApp() {
  const [view, setView] = useState<View>('today');
  const [name] = useState(displayName);
  const [session, setSession] = useState<FocusSession | null>(() => loadFocusSession<FocusSession>());
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [minutes, setMinutes] = useState(25);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem('proairetos.praxisSound') ?? 'forest';
    } catch {
      return 'forest';
    }
  });
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number | undefined>(undefined);
  const recordedSession = useRef<number | undefined>(undefined);
  const clock = useClock(1000);
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const soundState = useSyncExternalStore(player.subscribe, player.state);
  const [syncInitialized, setSyncInitialized] = useState(false);
  const syncCycleSeen = useRef(false);
  const items = useServiceData(lifeService.subscribe, () => lifeService.list());
  const events = usePraxisEvents();
  const seeded = useRef(false);
  const tasks = useMemo(() => (items ?? []).filter((item) => item.app === 'praxis'), [items]);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks.find((task) => task.status !== 'DONE') ?? tasks[0];
  const focusEvents = useMemo(() => praxisFocusEvents(events ?? []), [events]);
  const stats = useMemo(() => summarizeFocus(events ?? [], clock), [events, clock]);
  const quote = useMemo(() => quoteFor(clock), [localDateKey(clock)]);

  useEffect(() => {
    let active = true;
    void startSync().finally(() => {
      if (active) setSyncInitialized(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (sync.syncing) syncCycleSeen.current = true;
  }, [sync.syncing]);

  useEffect(() => {
    if (!items || seeded.current || !syncInitialized) return;
    // Let the first shared-store pull land before creating the starter plan;
    // this keeps two devices on the same account from seeding duplicates.
    if (sync.phase === 'ready' && navigator.onLine && (sync.syncing || !syncCycleSeen.current)) return;
    seeded.current = true;
    if (tasks.length > 0) return;
    void Promise.all(
      DEFAULT_TASKS.map((task) =>
        lifeService.capture(task.title, 'MAKE_TIME_FOR', {
          source: 'MANUAL',
          app: 'praxis',
          plannedMinutes: task.minutes,
        }),
      ),
    );
  }, [items, syncInitialized, sync.phase, sync.syncing, tasks.length]);

  useEffect(() => {
    if (!session) return;
    saveFocusSession(session);
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem('proairetos.praxisSound', sound);
    } catch {
      // Sound selection is still available for this visit when storage is blocked.
    }
  }, [sound]);

  const toast = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2800);
  }, []);

  const finishSession = useCallback(
    async (current: FocusSession, at: number) => {
      if (recordedSession.current === current.startedAt) return;
      recordedSession.current = current.startedAt;
      const actual = focusedMinutes(current, at);
      if (current.itemId && actual >= 1) {
        await lifeService.recordFocus(current.itemId, actual, {
          plannedMinutes: current.durationMs / 60_000,
          app: 'praxis',
        });
      }
      player.stop(0.6);
      setSession(null);
      saveFocusSession(null);
      toast(actual > 0 ? 'Session recorded.' : 'Session closed.');
    },
    [toast],
  );

  const remaining = session ? remainingMs(session, clock.getTime()) : 0;
  const finished = session ? isFinished(session, clock.getTime()) : false;
  useEffect(() => {
    if (session && finished) void finishSession(session, clock.getTime());
  }, [clock, finished, finishSession, session]);

  const startOrPause = () => {
    if (session) {
      if (finished) {
        void finishSession(session, clock.getTime());
      } else {
        if (session.pausedAt) {
          setSession(resume(session, clock.getTime()));
          player.startSit([sound]);
        } else {
          setSession(pause(session, clock.getTime()));
          player.stop(0.6);
        }
      }
      return;
    }
    if (!selectedTask) return;
    const next = startSession(clock.getTime(), minutes, { id: selectedTask.id, title: selectedTask.title });
    recordedSession.current = undefined;
    setSession(next);
    player.startSit([sound]);
    toast('Focus session started.');
  };

  const toggleTask = async (task: LifeItem) => {
    await lifeService.setStatus(task.id, task.status === 'DONE' ? 'OPEN' : 'DONE');
  };

  const setTask = (task: LifeItem) => {
    setSelectedTaskId(task.id);
    if (!session) setMinutes(task.plannedMinutes ?? 25);
  };

  return (
    <div className="praxis-app">
      <aside className="praxis-sidebar" aria-label="Praxis navigation">
        <div className="praxis-brand">
          <span className="praxis-brand__mark"><PraxisMark size={42} /></span>
          <span><strong>PRAXIS</strong><small>Deliberate study</small></span>
        </div>
        <p className="praxis-sidebar__label">Workspace</p>
        <PraxisNav view={view} onView={setView} />
        <div className="praxis-sidebar__spacer" />
        <div className="praxis-sidebar__note"><span className="praxis-sidebar__note-icon"><SproutIcon size={17} /></span><span><strong>Make room to learn.</strong><small>One clear block at a time.</small></span></div>
        <div className="praxis-sidebar__person"><span className="praxis-avatar">{(name || 'P').slice(0, 1).toUpperCase()}</span><span>{name || 'Your practice'}</span></div>
      </aside>

      <main className="praxis-main">
        <header className="praxis-topbar">
          <a className="praxis-family-link" href="/" aria-label="Open Proairetos"><span>PROAIRETOS</span><small>family</small></a>
          <div className="praxis-topbar__date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(clock)}</div>
          <div className="praxis-topbar__person"><span className={`praxis-sync-dot praxis-sync-dot--${sync.phase}`} aria-hidden="true" /><span>{name || 'Praxis'}</span></div>
        </header>

        <div className="praxis-page">
          {view === 'today' && (
            <TodayView
              name={name}
              tasks={tasks}
              selectedTask={selectedTask}
              session={session}
              remaining={remaining}
              finished={finished}
              minutes={minutes}
              stats={stats}
              quote={quote}
              onStart={startOrPause}
              onAdjust={() => setAdjustOpen((open) => !open)}
              adjustOpen={adjustOpen}
              onMinutes={(value) => { setMinutes(value); setAdjustOpen(false); }}
              onSelectTask={setTask}
              onToggleTask={toggleTask}
            />
          )}
          {view === 'sessions' && <SessionsView events={focusEvents} items={items ?? []} />}
          {view === 'stats' && <StatsView events={focusEvents} stats={stats} now={clock} />}
          {view === 'sounds' && <SoundsView sound={sound} soundState={soundState} sessionActive={Boolean(session)} onSound={(next) => {
            setSound(next);
            const entry = soundEntry(next);
            const isPlaying = soundState.preview === next;
            if (isPlaying) {
              player.stopPreview();
              toast('Preview stopped.');
            } else {
              player.preview(next);
              toast(`${entry?.title ?? 'Sound'} previewing.`);
            }
          }} />}
          {view === 'settings' && <SettingsView sync={sync} />}
        </div>
      </main>

      <nav className="praxis-bottom-nav" aria-label="Praxis navigation"><PraxisNav view={view} onView={setView} /></nav>
      {notice && <div className="praxis-toast" role="status">{notice}</div>}
    </div>
  );
}

function PraxisNav({ view, onView }: { view: View; onView: (view: View) => void }) {
  return <div className="praxis-nav-list">{navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`praxis-nav-item${view === id ? ' is-active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => onView(id)}><Icon size={18} /><span>{label}</span></button>)}</div>;
}

type TodayProps = {
  name: string;
  tasks: LifeItem[];
  selectedTask?: LifeItem;
  session: FocusSession | null;
  remaining: number;
  finished: boolean;
  minutes: number;
  stats: ReturnType<typeof summarizeFocus>;
  quote: ReturnType<typeof quoteFor>;
  adjustOpen: boolean;
  onStart: () => void;
  onAdjust: () => void;
  onMinutes: (minutes: number) => void;
  onSelectTask: (task: LifeItem) => void;
  onToggleTask: (task: LifeItem) => void;
};

function TodayView({ name, tasks, selectedTask, session, remaining, finished, minutes, stats, quote, adjustOpen, onStart, onAdjust, onMinutes, onSelectTask, onToggleTask }: TodayProps) {
  const progress = session ? 1 - remaining / session.durationMs : 0;
  const completed = tasks.filter((task) => task.status === 'DONE').length;
  const plannedTotal = tasks.reduce((total, task) => total + (task.plannedMinutes ?? 25), 0);
  return (
    <section className="praxis-view praxis-today-view">
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">Today</p><h1>{greeting(name)}</h1></div><span className="praxis-planned-chip"><ClockIcon size={15} /> {formatMinutes(plannedTotal)} planned</span></div>
      <div className="praxis-today-grid">
        <article className="praxis-card praxis-focus-card">
          <div className="praxis-card-heading"><div><p className="praxis-eyebrow">{session ? 'In focus' : 'Next session'}</p><h2>{session?.itemTitle ?? selectedTask?.title ?? 'Deep Work'}</h2><p>{session ? (finished ? 'Time is complete' : session.pausedAt ? 'Paused for now' : 'Stay with this block') : `${minutes} minutes · Focused study`}</p></div><span className="praxis-ready-pill"><i />{session ? (finished ? 'Complete' : 'Present') : 'Ready'}</span></div>
          <div className="praxis-focus-stage">
            <div className="praxis-timer" style={{ '--praxis-progress': `${Math.max(0.01, progress) * 360}deg` } as CSSProperties} aria-label={session ? `${formatClockDown(remaining)} remaining` : `${minutes} minute session`}>
              <div className="praxis-timer__inner"><span className="praxis-timer__time">{session ? (finished ? 'Done' : formatClockDown(remaining)) : `${minutes}:00`}</span></div>
            </div>
            <div className="praxis-focus-actions"><button type="button" className="praxis-button praxis-button--primary" onClick={onStart} disabled={!selectedTask}>{session ? (finished ? 'Close session' : session.pausedAt ? 'Resume' : 'Pause') : 'Start study'}</button><button type="button" className="praxis-button praxis-button--quiet" onClick={onAdjust} disabled={Boolean(session)}>Adjust</button></div>
            {adjustOpen && <div className="praxis-adjust" aria-label="Session length">{[10, 25, 45, 60].map((value) => <button key={value} type="button" className={minutes === value ? 'is-selected' : ''} onClick={() => onMinutes(value)}>{value} min</button>)}</div>}
          </div>
        </article>

        <article className="praxis-card praxis-plan-card"><div className="praxis-card-heading"><div><p className="praxis-eyebrow">Your plan</p><h2>Live with intention.</h2></div><span className="praxis-plan-count">{completed} / {tasks.length || 3}</span></div><div className="praxis-task-list">{tasks.length === 0 ? <p className="praxis-empty">Making your plan ready…</p> : tasks.map((task) => <div key={task.id} className={`praxis-task${task.id === selectedTask?.id ? ' is-selected' : ''}${task.status === 'DONE' ? ' is-done' : ''}`}><button type="button" className="praxis-task-main" onClick={() => onSelectTask(task)}><span className="praxis-task-icon"><BookIcon size={17} /></span><span><strong>{task.title}</strong><small>{task.plannedMinutes ?? 25} min · Study block</small></span></button><button type="button" className="praxis-task-check" aria-label={`${task.status === 'DONE' ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => onToggleTask(task)}><CheckIcon size={14} /></button></div>)}</div><p className="praxis-plan-foot">Your plan stays in the shared Proairetos account.</p></article>
      </div>

      <div className="praxis-metrics"><Metric icon={<ClockIcon size={18} />} value={formatMinutes(stats.thisWeekMinutes)} label="Study time this week" /><Metric icon={<CheckIcon size={18} />} value={String(stats.sessionCount)} label="Sessions completed" /><Metric icon={<StarIcon size={18} />} value={`${stats.averageCompletion}%`} label="Average timer completion" /></div>
      <blockquote className="praxis-quote"><p>“{quote.text}”</p><cite>{quote.source}</cite></blockquote>
    </section>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return <div className="praxis-metric"><span className="praxis-metric__icon">{icon}</span><strong>{value}</strong><span>{label}</span></div>;
}

function SessionsView({ events, items }: { events: ItemEvent[]; items: LifeItem[] }) {
  const titles = new Map(items.map((item) => [item.id, item.title]));
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return <section className="praxis-view"><div className="praxis-page-heading"><div><p className="praxis-eyebrow">Your practice</p><h1>Sessions.</h1><p className="praxis-subtitle">A clear record of time spent learning.</p></div></div><article className="praxis-card praxis-wide-card"><div className="praxis-card-heading"><div><p className="praxis-eyebrow">Recent sessions</p><h2>{sorted.length ? `${sorted.length} completed` : 'No sessions yet'}</h2></div></div>{sorted.length ? sorted.slice(0, 20).map((event) => <div className="praxis-history-row" key={event.id}><span className="praxis-history-icon"><BookIcon size={17} /></span><span><strong>{titles.get(event.itemId) ?? 'Study session'}</strong><small>{formatSessionDate(event.timestamp)}</small></span><span className="praxis-history-duration">{focusMinutes(event)} min</span></div>) : <p className="praxis-empty">Start a study block when you are ready.</p>}</article></section>;
}

function StatsView({ events, stats, now }: { events: ItemEvent[]; stats: ReturnType<typeof summarizeFocus>; now: Date }) {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - (6 - index)); return { date, minutes: dayMinutes(events, date) }; });
  const max = Math.max(...days.map((day) => day.minutes), 1);
  return <section className="praxis-view"><div className="praxis-page-heading"><div><p className="praxis-eyebrow">Measure your time</p><h1>Stats.</h1><p className="praxis-subtitle">See the shape of your study without turning it into a verdict.</p></div></div><div className="praxis-stats-grid"><article className="praxis-card praxis-wide-card"><div className="praxis-card-heading"><div><p className="praxis-eyebrow">This week</p><h2>{formatMinutes(stats.thisWeekMinutes)} of study</h2></div></div><div className="praxis-chart">{days.map((day) => <div className="praxis-bar-group" key={localDateKey(day.date)}><div className="praxis-bar" style={{ height: `${Math.max(6, (day.minutes / max) * 100)}%` }} /><span>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day.date).slice(0, 2)}</span></div>)}</div></article><div className="praxis-stat-stack"><div className="praxis-stat-card"><span>Sessions completed</span><strong>{stats.sessionCount}</strong></div><div className="praxis-stat-card"><span>Average timer completion</span><strong>{stats.averageCompletion}%</strong></div></div></div></section>;
}

function SoundsView({ sound, soundState, sessionActive, onSound }: { sound: string; soundState: PlayerState; sessionActive: boolean; onSound: (sound: string) => void }) {
  const options = PRAXIS_SOUND_IDS.map((id) => soundEntry(id)).filter((entry): entry is NonNullable<ReturnType<typeof soundEntry>> => Boolean(entry));
  const selected = soundEntry(sound);
  return <section className="praxis-view"><div className="praxis-page-heading"><div><p className="praxis-eyebrow">Set the atmosphere</p><h1>Sounds.</h1><p className="praxis-subtitle">Choose a quiet background for the next block.</p></div><span className="praxis-ready-pill"><i />{selected?.title ?? 'Forest'} selected</span></div><article className="praxis-card praxis-wide-card"><p className="praxis-sound-note">Royalty-free field recordings from the shared Proairetos sound bank. Tap one to preview it; the selected sound loops during a study block.</p><div className="praxis-sound-grid">{options.map((option, index) => {
    const isPreviewing = soundState.preview === option.id || soundState.playing.includes(option.id);
    const isLoading = soundState.loading.includes(option.id);
    const hasProblem = soundState.problem === option.id;
    return <button type="button" key={option.id} className={`praxis-sound${sound === option.id ? ' is-selected' : ''}${isPreviewing ? ' is-playing' : ''}`} onClick={() => onSound(option.id)} disabled={sessionActive} aria-pressed={sound === option.id}><span className={`praxis-sound-art praxis-sound-art--${index % 6}`} /> <strong>{option.title}</strong><small>{isLoading ? 'Loading…' : hasProblem ? 'Unavailable' : isPreviewing ? 'Playing preview' : sound === option.id ? 'Selected · tap to preview' : option.line}</small></button>;
  })}</div>{sessionActive && <p className="praxis-sound-note praxis-sound-note--bottom">Pause the study block before changing its sound.</p>}</article></section>;
}

function SettingsView({ sync }: { sync: ReturnType<typeof syncStatus.get> }) {
  return <section className="praxis-view"><div className="praxis-page-heading"><div><p className="praxis-eyebrow">One family of apps</p><h1>Settings.</h1><p className="praxis-subtitle">Praxis uses the same account and data layer as Proairetos.</p></div></div><article className="praxis-card praxis-wide-card"><div className="praxis-account-row"><span className={`praxis-sync-dot praxis-sync-dot--${sync.phase}`} /><span><strong>{syncLabel(sync.phase)}</strong><small>{sync.email ?? 'Your local records remain on this device.'}</small></span></div><a className="praxis-settings-link" href="/">Open Proairetos account and backups <span>↗</span></a></article><AccountSection /></section>;
}
