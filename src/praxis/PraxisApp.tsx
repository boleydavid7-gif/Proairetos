import { offerUndo, say as sayOnly, UndoBar } from '../lamplight/undo';
import { useWakeLock } from '../app/family/wakeLock';
import { tap } from '../app/feel';
import ProairetosTab from '../app/family/ProairetosTab';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useClock } from '../app/hooks/useClock';
import { startSync, syncStatus, onRemoteChanges } from '../app/sync/syncController';
import { compassService, lifeService, reflectionService } from '../app/services';
import { useServiceData } from '../app/hooks/useServiceData';
import { displayName } from '../data/storage/preferences';
import { loadFocusSession, saveFocusSession } from '../data/storage/preferences';
import { focusedMinutes, formatClockDown, isFinished, pause, remainingMs, resume, startSession, type FocusSession } from '../core/focus/session';
import { FloatTimer } from './FloatTimer';
import type { ItemEvent } from '../core/item-events/types';
import type { LifeItem } from '../core/life-items/types';
import { player } from '../app/sound/player';
import { wakeAudio } from '../app/sound/engine';
import { GearIcon, CalendarIcon, MountainIcon, BreatheIcon, SunIcon, ChecklistIcon } from '../components/icons/Icons';
import { CardsView } from './CardsView';
import PraxisMark from '../components/brand/PraxisMark';
import { takeOpening } from '../app/family/opening';
import { useDays } from '../app/family/personalDays';
import { addDaysKey, clampMinutes, localDateKey, praxisFocusEvents, quoteFor, unusedStarters } from './data';
import { bellWaiting, cancelBell, scheduleBell } from './bell';
import { notifications } from '../app/notify/notifications';
import { enableReminders } from '../app/sync/syncController';
import { MoreView, SessionsView, SettingsView, SoundsView, TimeView, TodayView, type After, type Break } from './views';
import { isAdded } from '../app/family/added';
import { useEnterMark } from '../app/transitions';
import { useCards } from './CardsView';
import { ready as readyCardsFor } from './cards';

type View = 'today' | 'cards' | 'sessions' | 'time' | 'sounds' | 'settings' | 'more';

const navItems: readonly { id: View; label: string; icon: typeof SunIcon }[] = [
  { id: 'today', label: 'Today', icon: SunIcon },
  { id: 'cards', label: 'Cards', icon: ChecklistIcon },
  { id: 'sessions', label: 'Sessions', icon: CalendarIcon },
  { id: 'time', label: 'Progress', icon: MountainIcon },
  { id: 'sounds', label: 'Sounds', icon: BreatheIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

/** Blocks made by the first version on its own were all made before this date; only those are taken out. */
const STARTERS_BEFORE = '2026-10-11';
const SOUND_KEY = 'proairetos.praxisSound';

function usePraxisEvents(): ItemEvent[] | undefined {
  const local = useServiceData(lifeService.subscribe, () => lifeService.historyForAll(true));
  const [, setRemoteTick] = useState(0);
  useEffect(() => onRemoteChanges(() => setRemoteTick((tick) => tick + 1)), []);
  return local;
}

const notifyPermission = (): string => notifications.permission();

/** Where a link or shortcut asks to begin: `start` (the next block), or a page. */
const opening = takeOpening();

export default function PraxisApp() {
  const [view, setView] = useState<View>(() => (opening && ['cards', 'sessions', 'time', 'sounds', 'settings', 'more'].includes(opening) ? (opening as View) : 'today'));
  useEnterMark(view, ['today', 'cards', 'sessions', 'time', 'sounds'] as View[]);
  const [name] = useState(displayName);
  const [session, setSession] = useState<FocusSession | null>(() => loadFocusSession<FocusSession>());
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [reviewBlockId, setReviewBlockId] = useState<string | undefined>();
  const [minutes, setMinutes] = useState(25);
  const [rest, setRest] = useState<Break | null>(null);
  const [after, setAfter] = useState<After | null>(null);
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) ?? 'forest';
    } catch {
      return 'forest';
    }
  });
  const [permission, setPermission] = useState(notifyPermission);
  const recordedSession = useRef<number | undefined>(undefined);
  const clock = useClock(1000);
  const soundState = useSyncExternalStore(player.subscribe, player.state);
  const items = useServiceData(lifeService.subscribe, () => lifeService.listForApp('praxis'));
  const events = usePraxisEvents();
  const goals = useServiceData(lifeService.subscribe, async () => (await compassService.statements()).filter((each) => each.type === 'GOAL' && !each.reachedAt)) ?? [];
  const calendarToday = localDateKey(clock);
  const { dayAt } = useDays(addDaysKey(calendarToday, -60), calendarToday);
  const today = dayAt(clock);
  const blocks = useMemo(() => [...(items ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [items]);
  const cards = useCards();
  const cardsReady = useMemo(() => readyCardsFor(cards, today), [cards, today]);
  const cardsReadyByBlock = useMemo(() => new Map(blocks.map((block) => [block.id, readyCardsFor(cards, today, block.id).length])), [blocks, cards, today]);
  const cardsByBlock = useMemo(() => new Map(blocks.map((block) => [block.id, cards.filter((card) => card.blockId === block.id).length])), [blocks, cards]);
  const open = blocks.filter((block) => block.status !== 'DONE');
  const selected = blocks.find((block) => block.id === selectedId && block.status !== 'DONE') ?? open[0];
  const focusEvents = useMemo(() => praxisFocusEvents(events ?? []), [events]);
  const titles = useMemo(() => new Map(blocks.map((block) => [block.id, block.title])), [blocks]);
  const quote = useMemo(() => quoteFor(clock), [calendarToday]);

  useEffect(() => {
    void startSync();
  }, []);

  // The first version made three blocks on its own; those never used are taken back out.
  useEffect(() => {
    if (!items || !events) return;
    const made = unusedStarters(items, events).filter((item) => item.createdAt < STARTERS_BEFORE);
    for (const item of made) void lifeService.deleteItem(item.id).catch(() => undefined);
  }, [items, events]);

  useEffect(() => {
    saveFocusSession(session);
    // The end of a running block is one of the family's reminders, so it arrives even with Praxis closed.
    notifications.refreshSoon();
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, sound);
    } catch {
      // The choice lasts for this visit when storage is blocked.
    }
  }, [sound]);

  useEffect(() => {
    if (!session && selected) setMinutes(selected.plannedMinutes ?? 25);
    // Only when the chosen block changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.plannedMinutes]);

  const say = useCallback((message: string, undo?: () => void) => (undo ? offerUndo(message, undo) : sayOnly(message)), []);

  const playSound = (id: string) => {
    if (id === 'none') {
      player.stop(0.4);
      wakeAudio();
    } else player.startSit([id]);
  };

  const finishSession = useCallback(
    async (current: FocusSession, at: number) => {
      if (recordedSession.current === current.startedAt) return;
      recordedSession.current = current.startedAt;
      const actual = focusedMinutes(current, at);
      player.stop(0.6);
      if (isFinished(current, at) && !bellWaiting()) void scheduleBell(0);
      else if (!isFinished(current, at)) cancelBell();
      setSession(null);
      saveFocusSession(null);
      if (current.itemId && actual >= 1) {
        await lifeService.recordFocus(current.itemId, actual, { plannedMinutes: current.durationMs / 60_000, app: 'praxis' });
        const block = (await lifeService.listForApp('praxis')).find((each) => each.id === current.itemId);
        // A block brought back to look at again has been looked at.
        if (block?.plannedFor && block.plannedFor <= today) await lifeService.setPlannedFor(block.id, undefined);
        setAfter({ itemId: current.itemId, title: current.itemTitle ?? block?.title ?? 'Study', minutes: actual });
      } else {
        say('Nothing kept: under a minute.');
      }
    },
    [say, today],
  );

  // The screen stays on while a block runs (not while paused).
  useWakeLock(Boolean(session && !session.pausedAt));
  const remaining = session ? remainingMs(session, clock.getTime()) : 0;
  const finished = session ? isFinished(session, clock.getTime()) : false;
  useEffect(() => {
    if (session && finished) {
      void finishSession(session, clock.getTime());
    }
  }, [clock, finished, finishSession, session]);

  const restLeft = rest ? Math.max(0, rest.endsAt - clock.getTime()) : 0;
  useEffect(() => {
    if (rest && restLeft === 0) {
      setRest(null);
    }
  }, [rest, restLeft]);

  const start = (block = selected, length = minutes) => {
    if (!block) return;
    setReady(false);
    setAfter(null);
    setRest(null);
    const next = startSession(Date.now(), length, { id: block.id, title: block.title });
    recordedSession.current = undefined;
    setSession(next);
    playSound(sound);
    void scheduleBell(length * 60);
    tap();
  };

  // On the lock screen and in the phone's media controls, while a block plays a sound: its name, play and pause.
  const pauseFromLock = useRef(() => {});
  useEffect(() => {
    const media = 'mediaSession' in navigator ? navigator.mediaSession : undefined;
    if (!media || !session || sound === 'none') return;
    try {
      media.metadata = new MediaMetadata({
        title: session.itemTitle ?? 'Study',
        artist: 'Praxis',
        artwork: [{ src: '/praxis/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
      });
      media.playbackState = session.pausedAt ? 'paused' : 'playing';
      media.setActionHandler('play', () => pauseFromLock.current());
      media.setActionHandler('pause', () => pauseFromLock.current());
    } catch {
      // Not every browser shows media controls.
    }
    return () => {
      try {
        media.setActionHandler('play', null);
        media.setActionHandler('pause', null);
      } catch {
        // Nothing was set.
      }
    };
  }, [session?.startedAt, session?.pausedAt, session?.itemTitle, sound, soundState]);

  const startOrPause = () => {
    if (!session) return start();
    if (session.pausedAt) {
      const resumed = resume(session, Date.now());
      setSession(resumed);
      playSound(sound);
      void scheduleBell(remainingMs(resumed, Date.now()) / 1000);
    } else {
      setSession(pause(session, Date.now()));
      player.stop(0.6);
      cancelBell();
    }
  };
  pauseFromLock.current = startOrPause;

  // A shortcut to start the next block opens it ready: phones only allow sound from a tap, so one tap on
  // Start begins the timer, the sound and the end bell together.
  const [ready, setReady] = useState(opening === 'start');

  // From Theoria's "Open Praxis": the book as a block (made once, 20 minutes), ready to start.
  const fromTheoria = useRef(false);
  useEffect(() => {
    if (fromTheoria.current || !items || !opening?.startsWith('read:')) return;
    fromTheoria.current = true;
    const title = `Read: ${opening.slice(5).trim()}`.slice(0, 80);
    const existing = items.find((block) => block.title === title && block.status !== 'DONE');
    void (existing ? Promise.resolve(existing) : lifeService.capture(title, 'MAKE_TIME_FOR', { source: 'MANUAL', app: 'praxis', plannedMinutes: 20 })).then((block) => {
      setSelectedId(block.id);
      setReady(true);
    });
  }, [items]);

  const toggle = async (block: LifeItem) => {
    const change = await lifeService.setStatus(block.id, block.status === 'DONE' ? 'OPEN' : 'DONE');
    say(block.status === 'DONE' ? `${block.title} is back` : `${block.title} done`, () => void change.undo());
  };

  const add = async (title: string, length: number) => {
    const block = await lifeService.capture(title, 'MAKE_TIME_FOR', { source: 'MANUAL', app: 'praxis', plannedMinutes: length });
    setSelectedId(block.id);
    return block;
  };

  const saveBlock = async (block: LifeItem, change: { title: string; minutes: number; goalId?: string; plannedFor?: string }) => {
    if (change.title !== block.title) await lifeService.edit(block.id, { title: change.title });
    if (change.minutes !== block.plannedMinutes) await lifeService.setPlannedMinutes(block.id, change.minutes);
    if (change.goalId !== block.goalId) await lifeService.setGoal(block.id, change.goalId);
    if (change.plannedFor !== block.plannedFor) await lifeService.setPlannedFor(block.id, change.plannedFor);
  };

  const removeBlock = async (block: LifeItem) => {
    const { undo } = await lifeService.deleteItem(block.id);
    say(`${block.title} removed`, () => void undo());
  };

  const keepLine = async (line: string) => {
    if (!after) return;
    const reflection = await reflectionService.write({ body: `${after.title}: ${line}`, kind: 'FREE', promptKey: 'after-study' });
    say('Kept in Reflect', () => void reflectionService.remove(reflection.id));
  };

  const lookAgain = async (days: number) => {
    if (!after) return;
    const block = blocks.find((each) => each.id === after.itemId);
    const before = block?.plannedFor;
    await lifeService.setPlannedFor(after.itemId, addDaysKey(today, days));
    say('Set to look at again', () => void lifeService.setPlannedFor(after.itemId, before));
  };

  const takeRest = (length: number) => {
    setAfter(null);
    setRest({ endsAt: Date.now() + length * 60_000, minutes: length });
    wakeAudio();
    void scheduleBell(length * 60, 1);
  };

  const endRest = () => {
    cancelBell();
    setRest(null);
  };

  const chooseSound = (id: string) => {
    setSound(id);
    if (session && !session.pausedAt) {
      playSound(id);
      return;
    }
    if (id === 'none') player.stopPreview();
    else player.preview(id);
  };

  return (
    <div className="praxis-app" data-no-title-anchor>
      <aside className="praxis-sidebar" aria-label="Praxis navigation">
        <div className="praxis-brand">
          <span className="praxis-brand__mark"><PraxisMark size={42} /></span>
          <span><strong>Praxis</strong></span>
        </div>
        <PraxisNav view={view} onView={setView} />
        <div className="praxis-sidebar__spacer" />
        <div className="praxis-sidebar__person"><span className="praxis-avatar">{(name || 'P').slice(0, 1).toUpperCase()}</span><span>{name || 'Praxis'}</span></div>
      </aside>

      <main className="praxis-main">
        <header className="praxis-topbar">
          {/* Proairetos is a tab in the bar, and sync shows in Settings: the top holds only the date. */}
          <div className="praxis-topbar__date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(clock)}</div>
        </header>

        <div className="praxis-page">
          {view === 'today' && (
            <TodayView
              ready={ready && !session}
              today={today}
              blocks={blocks}
              selected={selected}
              session={session}
              remaining={remaining}
              finished={finished}
              minutes={minutes}
              rest={rest}
              restLeft={restLeft}
              after={after}
              quote={quote}
              goals={goals}
              cardsReady={cardsReady.length}
              cardsReadyByBlock={cardsReadyByBlock}
              cardsByBlock={cardsByBlock}
              onStart={startOrPause}
              onStop={() => session && void finishSession(session, Date.now())}
              onMinutes={(value) => setMinutes(clampMinutes(value))}
              onSelect={(block) => { if (!session) { setSelectedId(block.id); setReady(true); } }}
              onToggle={(block) => void toggle(block)}
              onAdd={(title, length) => void add(title, length)}
              onStartSelected={(length) => { setMinutes(length); start(selected, length); }}
              onSave={(block, change) => void saveBlock(block, change)}
              onRemove={(block) => void removeBlock(block)}
              onEndRest={endRest}
              onRest={takeRest}
              onKeepLine={(line) => void keepLine(line)}
              onLookAgain={(days) => void lookAgain(days)}
              onCloseAfter={() => setAfter(null)}
              onLookedAt={(block) => void lifeService.setPlannedFor(block.id, undefined)}
              onReviewCards={(blockId) => { setReviewBlockId(blockId); setView('cards'); }}
              onOpenReading={isAdded('theoria') ? (title) => window.location.assign('/theoria/?open=' + encodeURIComponent('title:' + title)) : undefined}
            />
          )}
          {view === 'today' && session && !finished && (
            <FloatTimer
              time={formatClockDown(remaining)}
              title={session.itemTitle ?? 'Study'}
              paused={Boolean(session.pausedAt)}
              onPause={startOrPause}
              onStop={() => void finishSession(session, Date.now())}
            />
          )}
          {view === 'sessions' && (
            <SessionsView
              events={focusEvents}
              titles={titles}
              dayAt={dayAt}
              onRemove={async (sessions) => {
                const changes = await Promise.all(sessions.map((event) => lifeService.removeFocus(event)));
                say(`${sessions.length === 1 ? 'Session' : 'Sessions'} removed`, () => void Promise.all(changes.map((change) => change.undo())));
              }}
            />
          )}
          {view === 'cards' && <CardsView blocks={blocks} today={today} say={say} startBlockId={reviewBlockId} />}
          {view === 'time' && <TimeView events={focusEvents} titles={titles} today={today} dayAt={dayAt} />}
          {view === 'sounds' && <SoundsView sound={sound} soundState={soundState} onSound={chooseSound} />}
          {view === 'settings' && (
            <SettingsView
              notices={permission}
              onNotices={() => {
                void notifications.ask().then(async (answer) => {
                  setPermission(answer);
                  // With sync on, the server is told the times too, so the notice comes with Praxis closed.
                  const sync = syncStatus.get();
                  if (answer === 'granted' && sync.phase === 'ready' && sync.reminders !== 'on') await enableReminders().catch(() => undefined);
                });
              }}
            />
          )}
          {view === 'more' && <MoreView onView={setView} />}
        </div>
      </main>

      <nav className="praxis-bottom-nav" aria-label="Praxis navigation"><PraxisNav view={view} onView={setView} /></nav>
      <UndoBar />
    </div>
  );
}


function PraxisNav({ view, onView }: { view: View; onView: (view: View) => void }) {
  return <div className="praxis-nav-list">{navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`praxis-nav-item${view === id ? ' is-active' : ''}`} data-praxis-view={id} data-to-header={['more', 'settings'].includes(id) ? '' : undefined} aria-current={view === id ? 'page' : undefined} onClick={() => onView(id)}><Icon size={18} /><span>{label}</span></button>)}<button type="button" className="praxis-nav-item praxis-nav-item--more" data-praxis-view="more" aria-current={view === 'more' ? 'page' : undefined} onClick={() => onView('more')}><GearIcon size={18} /><span>More</span></button><ProairetosTab className="praxis-nav-item" size={18} /></div>;
}
