import { RollingNumber } from '../lamplight/RollingNumber';
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import type { ItemEvent } from '../core/item-events/types';
import type { LifeItem } from '../core/life-items/types';
import type { CompassStatement } from '../core/compass/types';
import { formatClockDown, type FocusSession } from '../core/focus/session';
import type { PlayerState } from '../app/sound/player';
import { soundEntry } from '../app/sound/soundscapes';
import { BookIcon, CheckIcon, ChevronRightIcon, ClockIcon, PenIcon } from '../components/icons/Icons';
import AccountCard from '../app/family/AccountCard';
import FamilyBackup from '../app/family/FamilyBackup';
import FamilyApps from '../app/family/FamilyApps';
import YearPage from '../app/family/YearPage';
import { praxisYear } from './year';
import {
  clampMinutes,
  formatDay,
  formatMinutes,
  LENGTHS,
  LOOK_AGAIN,
  LOOK_AGAIN_SOURCE,
  minutesByBlock,
  minutesByDay,
  sessionDay,
  praxisFocusEvents,
  weekOf,
  addDaysKey,
  type DayAt,
  type PraxisQuote,
} from './data';
import { GLYPHS, LampIcon, Sym } from '../lamplight/icons';
import IconButton from '../components/ui/IconButton';

export const PRAXIS_SOUND_IDS = ['none', 'forest', 'rain', 'ocean', 'river', 'wind', 'fan', 'campfire', 'crickets'] as const;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 86;

export type After = { itemId: string; title: string; minutes: number };
export type Break = { endsAt: number; minutes: number };

/* ---------- Today ---------- */

type TodayProps = {
  today: string;
  blocks: LifeItem[];
  selected?: LifeItem;
  session: FocusSession | null;
  remaining: number;
  finished: boolean;
  minutes: number;
  rest: Break | null;
  restLeft: number;
  after: After | null;
  quote: PraxisQuote;
  goals: CompassStatement[];
  cardsReady: number;
  cardsReadyByBlock: Map<string, number>;
  cardsByBlock: Map<string, number>;
  onStart: () => void;
  onStop: () => void;
  onMinutes: (minutes: number) => void;
  onSelect: (block: LifeItem) => void;
  onToggle: (block: LifeItem) => void;
  onSave: (block: LifeItem, change: { title: string; minutes: number; goalId?: string; plannedFor?: string }) => void;
  onRemove: (block: LifeItem) => void;
  onEndRest: () => void;
  onRest: (minutes: number) => void;
  onKeepLine: (line: string) => void;
  onLookAgain: (days: number) => void;
  onCloseAfter: () => void;
  onLookedAt: (block: LifeItem) => void;
  onReviewCards: (blockId?: string) => void;
  onOpenReading?: (title: string) => void;
};

export function TodayView(props: TodayProps) {
  const { today, blocks, selected, session, remaining, finished, minutes, rest, restLeft, after, quote } = props;
  const open = blocks.filter((block) => block.status !== 'DONE');
  const done = blocks.filter((block) => block.status === 'DONE');
  const again = open.filter((block) => block.plannedFor && block.plannedFor <= today);
  const progress = rest ? 1 - restLeft / (rest.minutes * 60_000) : session ? 1 - remaining / session.durationMs : 0;
  const timerActive = Boolean(session || rest);
  const timerProgress = timerActive ? Math.max(0, Math.min(1, progress)) : 0;
  return (
    <section className="praxis-view praxis-today-view">
      <div className="praxis-page-heading"><div><h1>Today</h1></div></div>
      <div className="praxis-today-grid">
        <article className={`praxis-card praxis-focus-card${!after && !rest && !session ? ' praxis-focus-card--empty' : ''}`}>
          {after && !session && !rest ? (
            <AfterBlock after={after} onRest={props.onRest} onKeepLine={props.onKeepLine} onLookAgain={props.onLookAgain} onClose={props.onCloseAfter} />
          ) : (
            <>
              <div className="praxis-card-heading">
                <div>
                  {(rest || session || selected) && <p className="praxis-eyebrow">{rest ? 'A break' : session ? 'Studying' : 'Next'}</p>}
                  <h2>{rest ? `${rest.minutes} minutes away` : session?.itemTitle ?? selected?.title ?? 'No blocks yet'}</h2>
                  {!rest && <p>{session ? (session.pausedAt ? 'Paused' : `${Math.round(session.durationMs / 60_000)} minutes`) : selected ? `${minutes} minutes` : ''}</p>}
                </div>
              </div>
              {(rest || session || selected) && <div className="praxis-focus-stage">
                <div className="praxis-timer" data-ll-lit={session || rest ? true : undefined} aria-label={rest ? `${formatClockDown(restLeft)} of the break left` : session ? `${formatClockDown(remaining)} left` : `${minutes} minute block`}>
                  <svg className="praxis-timer__ring" viewBox="0 0 200 200" aria-hidden="true">
                    <circle className="praxis-timer__track" cx="100" cy="100" r="86" />
                    <circle className="praxis-timer__progress" cx="100" cy="100" r="86" style={{ strokeDasharray: `${TIMER_RING_CIRCUMFERENCE} ${TIMER_RING_CIRCUMFERENCE}`, strokeDashoffset: TIMER_RING_CIRCUMFERENCE * (1 - timerProgress) }} />
                  </svg>
                  <div className="praxis-timer__inner"><span className="praxis-timer__time">{rest ? formatClockDown(restLeft) : session ? (finished ? '0:00' : formatClockDown(remaining)) : `${minutes}:00`}</span></div>
                </div>
                {rest ? (
                  <div className="praxis-focus-actions"><button type="button" className="praxis-button praxis-button--quiet" onClick={props.onEndRest}>End the break</button></div>
                ) : (
                  session && <div className="praxis-focus-actions"><button type="button" className="praxis-button praxis-button--quiet" onClick={props.onStop}>Stop here</button></div>
                )}
              </div>}
            </>
          )}
        </article>

        <article className="praxis-card praxis-plan-card">
          <div className="praxis-card-heading"><div><p className="praxis-eyebrow">Your blocks</p><h2>What are you reading?</h2></div>{props.cardsReady > 0 && <button type="button" className="praxis-text-button praxis-review-link" onClick={() => props.onReviewCards()}>{props.cardsReady === 1 ? 'Review 1 card' : `Review ${props.cardsReady} cards`}</button>}</div>
          {again.length > 0 && (
            <div className="praxis-again">
              <p className="praxis-eyebrow">To look at again</p>
              {again.map((block) => (
                <div className="praxis-again__row" key={block.id}>
                  <button type="button" onClick={() => props.onSelect(block)}>{block.title}</button>
                  <button type="button" className="praxis-text-link" onClick={() => props.onLookedAt(block)}>Not now</button>
                </div>
              ))}
            </div>
          )}
          <div className="praxis-task-list">
            {open.map((block) => (
              <BlockRow key={block.id} block={block} selected={block.id === selected?.id} today={today} goals={props.goals} totalCards={props.cardsByBlock.get(block.id) ?? 0} readyCards={props.cardsReadyByBlock.get(block.id) ?? 0} onReviewCards={props.onReviewCards} onOpenReading={props.onOpenReading} onSelect={props.onSelect} onToggle={props.onToggle} onSave={props.onSave} onRemove={props.onRemove} />
            ))}
          </div>
          {selected && !session && !rest && !after && <div className="praxis-plan-length"><LengthPicker minutes={minutes} onMinutes={props.onMinutes} /></div>}
          {selected && !rest && !after && <button type="button" className="praxis-button praxis-button--primary praxis-plan-start" onClick={props.onStart}>{session ? (session.pausedAt ? 'Resume' : 'Pause') : 'Start now'}</button>}
          {done.length > 0 && (
            <details className="praxis-done">
              <summary>Done</summary>
              {done.map((block) => (
                <BlockRow key={block.id} block={block} selected={false} today={today} goals={props.goals} totalCards={props.cardsByBlock.get(block.id) ?? 0} readyCards={props.cardsReadyByBlock.get(block.id) ?? 0} onReviewCards={props.onReviewCards} onOpenReading={props.onOpenReading} onSelect={props.onSelect} onToggle={props.onToggle} onSave={props.onSave} onRemove={props.onRemove} />
              ))}
            </details>
          )}
        </article>
      </div>
      <blockquote className="praxis-quote"><p>“{quote.text}”</p><cite>{quote.source}</cite></blockquote>
    </section>
  );
}

function LengthPicker({ minutes, onMinutes }: { minutes: number; onMinutes: (minutes: number) => void }) {
  const [other, setOther] = useState('');
  const custom = !(LENGTHS as readonly number[]).includes(minutes);
  return (
    <div className="praxis-adjust" role="group" aria-label="Timer length">
      {LENGTHS.map((value) => <button key={value} type="button" className={minutes === value ? 'is-selected' : ''} onClick={() => onMinutes(value)}>{value} min</button>)}
      <label className={`praxis-adjust__other${custom ? ' is-selected' : ''}`}>
        <input type="number" inputMode="numeric" min={1} max={240} aria-label="Custom timer length in minutes" value={custom ? String(minutes) : other} onChange={(event) => { setOther(event.target.value); const value = Number(event.target.value); if (Number.isFinite(value) && value > 0) onMinutes(clampMinutes(value)); }} />
        <span>min</span>
      </label>
    </div>
  );
}

function BlockRow({ block, selected, today, goals, totalCards, readyCards, onReviewCards, onOpenReading, onSelect, onToggle, onSave, onRemove }: { block: LifeItem; selected: boolean; today: string; goals: CompassStatement[]; totalCards: number; readyCards: number; onReviewCards: (blockId?: string) => void; onOpenReading?: (title: string) => void; onSelect: (block: LifeItem) => void; onToggle: (block: LifeItem) => void; onSave: TodayProps['onSave']; onRemove: (block: LifeItem) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [minutes, setMinutes] = useState(String(block.plannedMinutes ?? 25));
  const [goalId, setGoalId] = useState(block.goalId ?? '');
  const [plannedFor, setPlannedFor] = useState(block.plannedFor ?? '');
  const goal = goals.find((each) => each.id === block.goalId);
  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(minutes);
    if (!title.trim()) return;
    onSave(block, { title: title.trim(), minutes: Number.isFinite(value) && value > 0 ? clampMinutes(value) : block.plannedMinutes ?? 25, goalId: goalId || undefined, plannedFor: plannedFor || undefined });
    setEditing(false);
  };
  return (
    <div className={`praxis-task${selected ? ' is-selected' : ''}${block.status === 'DONE' ? ' is-done' : ''}`}>
      <div className="praxis-task__row">
        <button type="button" className="praxis-task-main" onClick={() => onSelect(block)} aria-pressed={selected}>
          <span className="praxis-task-icon"><BookIcon size={18} /></span>
          <span><strong>{block.title}</strong><small>{block.plannedMinutes ?? 25} min{goal ? ` · ${goal.body}` : ''}{block.plannedFor ? ` · ${block.plannedFor === today ? 'Today' : formatDay(block.plannedFor)}` : ''}</small></span>
        </button>
        <button type="button" className="praxis-task-edit" aria-label={`Change ${block.title}`} onClick={() => setEditing(!editing)}><PenIcon size={16} /></button>
        <button type="button" className={`praxis-task-check${selected ? ' is-selected' : ''}`} aria-label={`Select ${block.title} for the timer`} aria-pressed={selected} onClick={() => onSelect(block)}><CheckIcon size={16} /></button>
      </div>
      <div className="praxis-task-links">
        {onOpenReading && block.title.startsWith('Read: ') && <button type="button" className="praxis-text-link" onClick={() => onOpenReading(block.title.slice(6).trim())}>Open in Theoria</button>}
        {totalCards > 0 && <button type="button" className="praxis-text-link" onClick={() => onReviewCards(block.id)}>{readyCards > 0 ? (readyCards === 1 ? 'Review 1 card' : `Review ${readyCards} cards`) : 'Open cards'}</button>}
        <button type="button" className="praxis-text-link" onClick={() => onToggle(block)}>{block.status === 'DONE' ? 'Reopen' : 'Done'}</button>
        <button type="button" className="praxis-text-link praxis-remove" onClick={() => onRemove(block)}>Remove</button>
      </div>
      {editing && (
        <form className="praxis-block-form" onSubmit={save}>
          <label><span>Name</span><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label>
          <label><span>Usual length</span><input type="number" inputMode="numeric" min={1} max={240} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><b>min</b></label>
          {goals.length > 0 && (
            <label><span>Working toward a pursuit</span><select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Nothing in particular</option>{goals.map((each) => <option key={each.id} value={each.id}>{each.body}</option>)}</select></label>
          )}
          <label><span>Plan for</span><input type="date" min={today} value={plannedFor} onChange={(event) => setPlannedFor(event.target.value)} /></label>
          <div className="praxis-block-form__actions">
            <button type="submit" className="praxis-button praxis-button--primary">Save</button>
            <button type="button" className="praxis-button praxis-button--quiet" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function MoreView({ onView, embedded = false }: { onView: (view: 'sounds' | 'settings') => void; embedded?: boolean }) {
  return (
    <section className="praxis-view praxis-more-view">
      <div className="praxis-page-heading"><div><h1>More</h1></div></div>
      <div className="praxis-card praxis-more-card">
        <button type="button" className="praxis-more-link" onClick={() => onView('sounds')}>
          <span><strong>Sounds</strong></span>
          <ChevronRightIcon size={18} aria-hidden="true" />
        </button>
        {!embedded && <button type="button" className="praxis-more-link" onClick={() => onView('settings')}>
          <span><strong>Settings</strong><small>Reminders, account, and backups.</small></span>
          <ChevronRightIcon size={18} aria-hidden="true" />
        </button>}
      </div>
    </section>
  );
}

function AfterBlock({ after, onRest, onKeepLine, onLookAgain, onClose }: { after: After; onRest: (minutes: number) => void; onKeepLine: (line: string) => void; onLookAgain: (days: number) => void; onClose: () => void }) {
  const [line, setLine] = useState('');
  const [kept, setKept] = useState(false);
  const [looked, setLooked] = useState<string>();
  return (
    <div className="praxis-after">
      <p className="praxis-eyebrow">{formatMinutes(after.minutes)} kept</p>
      <h2>{after.title}</h2>
      <div className="praxis-after__part">
        <p>A break?</p>
        <div className="praxis-chips"><button type="button" onClick={() => onRest(5)}>5 min</button><button type="button" onClick={() => onRest(10)}>10 min</button></div>
      </div>
      <div className="praxis-after__part">
        <p>What did you take from this?</p>
        {kept ? <a className="praxis-text-link" href="/?open=reflect">Kept in Reflect, in Proairetos.</a> : (
          <form onSubmit={(event) => { event.preventDefault(); if (!line.trim()) return; onKeepLine(line.trim()); setKept(true); }} className="praxis-add__row">
            <input aria-label="One line to keep" value={line} onChange={(event) => setLine(event.target.value)} />
            <button type="submit" className="praxis-button praxis-button--quiet" disabled={!line.trim()}>Save</button>
          </form>
        )}
      </div>
      <div className="praxis-after__part">
        <p>Look at this again?</p>
        {looked ? <p className="praxis-muted">{looked}</p> : <div className="praxis-chips">{LOOK_AGAIN.map((choice) => <button type="button" key={choice.days} onClick={() => { onLookAgain(choice.days); setLooked(`It will show under To look at again, ${choice.label.toLowerCase()}.`); }}>{choice.label}</button>)}</div>}
        <details className="praxis-source"><summary>Why spacing</summary><p>Coming back after a gap, and recalling before rereading, tends to hold learning longer. {LOOK_AGAIN_SOURCE}</p></details>
      </div>
      <button type="button" className="praxis-button praxis-button--quiet" onClick={onClose}>Close</button>
    </div>
  );
}

/* ---------- Sessions ---------- */

export function SessionsView({ events, titles, dayAt, onRemove }: { events: ItemEvent[]; titles: Map<string, string>; dayAt: DayAt; onRemove: (events: ItemEvent[]) => void }) {
  const [selectedId, setSelectedId] = useState<string>();
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const books: { itemId: string; events: ItemEvent[]; minutes: number }[] = [];
  for (const event of sorted) {
    const book = books.find((each) => each.itemId === event.itemId);
    if (book) { book.events.push(event); book.minutes += Number(event.metadata?.minutes ?? 0); }
    else books.push({ itemId: event.itemId, events: [event], minutes: Number(event.metadata?.minutes ?? 0) });
  }
  const selectedBook = books.find((book) => book.itemId === selectedId);
  const days: { day: string; events: ItemEvent[]; minutes: number }[] = [];
  if (selectedBook) {
    for (const event of selectedBook.events) {
      const day = sessionDay(event, dayAt);
      const group = days.find((each) => each.day === day);
      if (group) { group.events.push(event); group.minutes += Number(event.metadata?.minutes ?? 0); }
      else days.push({ day, events: [event], minutes: Number(event.metadata?.minutes ?? 0) });
    }
  }
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><h1>Sessions</h1></div></div>
      {!books.length ? <article className="praxis-card praxis-wide-card"><p className="praxis-empty">Sessions show here once a block has run.</p></article> : selectedBook ? (
        <>
          <button type="button" className="praxis-text-button praxis-sessions-back" onClick={() => setSelectedId(undefined)}>All books</button>
          <article className="praxis-card praxis-wide-card">
            <div className="praxis-card-heading"><div><p className="praxis-eyebrow">Reading history</p><h2>{titles.get(selectedBook.itemId) ?? 'A block'}</h2></div><span className="praxis-history-duration">{selectedBook.events.length} {selectedBook.events.length === 1 ? 'session' : 'sessions'} · {formatMinutes(selectedBook.minutes)}</span></div>
            <div className="praxis-session-days">{days.map((day) => <div className="praxis-session-day" key={day.day}><p className="praxis-eyebrow">{formatDay(day.day)}</p><div className="praxis-history-row"><span className="praxis-history-icon"><ClockIcon size={18} /></span><span><strong>{formatMinutes(day.minutes)}</strong><small>{day.events.length} {day.events.length === 1 ? 'session' : 'sessions'}</small></span><button type="button" className="praxis-text-link praxis-remove" onClick={() => onRemove(day.events)}>Remove</button></div></div>)}</div>
          </article>
        </>
      ) : (
        <article className="praxis-card praxis-wide-card praxis-session-books">
          {books.map((book) => <div className="praxis-history-row" key={book.itemId}><button type="button" className="praxis-history-open" onClick={() => setSelectedId(book.itemId)}><span className="praxis-history-icon"><BookIcon size={18} /></span><span><strong>{titles.get(book.itemId) ?? 'A block'}</strong><small>{book.events.length} {book.events.length === 1 ? 'session' : 'sessions'}</small></span></button><span className="praxis-history-actions"><span className="praxis-history-duration">{formatMinutes(book.minutes)}</span><button type="button" className="praxis-text-link praxis-remove" onClick={() => onRemove(book.events)}>Remove</button></span></div>)}
        </article>
      )}
    </section>
  );
}

/* ---------- Time ---------- */

export function TimeView({ events, titles, today, dayAt }: { events: ItemEvent[]; titles: Map<string, string>; today: string; dayAt: DayAt }) {
  const [anchor, setAnchor] = useState(today);
  useEffect(() => setAnchor(today), [today]);
  const days = weekOf(anchor);
  const minutes = minutesByDay(events, days, dayAt);
  const total = minutes.reduce((sum, each) => sum + each, 0);
  const max = Math.max(...minutes, 1);
  const blocks = minutesByBlock(events, days, dayAt);
  const current = days.includes(today);
  const label = current ? 'This week' : `${formatDay(days[0])} to ${formatDay(days[6])}`;
  const [showYear, setShowYear] = useState(false);
  if (showYear) return <section className="praxis-view"><div className="family-surface"><YearPage dates={praxisFocusEvents(events).map((event) => sessionDay(event, dayAt))} build={(year) => praxisYear(events, titles, year, dayAt)} onBack={() => setShowYear(false)} /></div></section>;
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><h1>Time</h1></div></div>
      <div className="praxis-stats-grid">
        <article className="praxis-card praxis-wide-card">
          <div className="praxis-card-heading">
            <div><p className="praxis-eyebrow">{label}</p><h2>{total ? <RollingNumber value={total} format={(value) => formatMinutes(Math.round(value))} /> : 'Nothing recorded'}</h2></div>
            <div className="praxis-week-step">
              <IconButton size="sm" label="Week before" onClick={() => setAnchor(addDaysKey(days[0], -7))}><Sym name="back" /></IconButton>
              <IconButton size="sm" label="Week after" disabled={current} onClick={() => setAnchor(addDaysKey(days[0], 7))}><Sym name="chevron" /></IconButton>
            </div>
          </div>
          <div className={total ? 'praxis-chart' : 'praxis-chart praxis-chart--empty'}>
            {days.map((day, index) => (
              <div className="praxis-bar-group" key={day}>
                <small className="praxis-bar-value">{minutes[index] ? formatMinutes(minutes[index]) : ''}</small>
                {minutes[index] > 0 ? <div className="praxis-bar ll-rise ll-lit ll-travel" style={{ height: `${Math.max(6, (minutes[index] / max) * 100)}%`, '--i': index } as CSSProperties} /> : <div className="praxis-bar praxis-bar--none" />}
                <span className={day === today ? 'is-today' : undefined}>{formatDay(day).slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="praxis-card praxis-wide-card">
          <p className="praxis-eyebrow">By block</p>
          {blocks.length === 0 ? <p className="praxis-empty">No time recorded in this week.</p> : blocks.map((each) => (
            <div className="praxis-history-row" key={each.itemId}><span className="praxis-history-icon"><ClockIcon size={18} /></span><span><strong>{titles.get(each.itemId) ?? 'A block'}</strong></span><span className="praxis-history-duration">{formatMinutes(each.minutes)}</span></div>
          ))}
        </article>
      </div>
      <button type="button" className="praxis-button praxis-button--quiet" onClick={() => setShowYear(true)}>Your year</button>
    </section>
  );
}

/* ---------- Sounds ---------- */

export function SoundsView({ sound, soundState, onSound }: { sound: string; soundState: PlayerState; onSound: (sound: string) => void }) {
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><h1>Sounds</h1></div></div>
      <article className="praxis-card praxis-wide-card">
        <div className="praxis-sound-grid">
          {PRAXIS_SOUND_IDS.map((id, index) => {
            const entry = id === 'none' ? undefined : soundEntry(id);
            if (id !== 'none' && !entry) return null;
            const playing = soundState.preview === id || soundState.playing.includes(id);
            const loading = soundState.loading.includes(id);
            const problem = soundState.problem === id;
            return (
              <button type="button" key={id} className={`praxis-sound${sound === id ? ' is-selected' : ''}${playing ? ' is-playing' : ''}`} onClick={() => onSound(id)} aria-pressed={sound === id}>
                <span className={`praxis-sound-art praxis-sound-art--${id === 'none' ? 'none' : index % 6}`} />
                <strong>{entry?.title ?? 'None'}</strong>
                <small>{id === 'none' ? 'Quiet, the bell only' : loading ? 'Loading…' : problem ? 'Not available' : playing ? 'Playing' : entry?.line}</small>
              </button>
            );
          })}
        </div>
      </article>
    </section>
  );
}

/* ---------- Settings ---------- */

export function SettingsView({ notices, onNotices }: { notices: string; onNotices: () => void }) {
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><h1>Settings</h1></div></div>
      <div className="family-surface">
        <ul className="rows">
          <li>
            <div className="row praxis-notice-row">
              <span className="row__icon" aria-hidden="true"><LampIcon glyph={GLYPHS.bell} size={20} /></span>
              <span className="row__text"><span>A notice when a block ends</span></span>
              {notices === 'granted' ? <span className="praxis-muted">On</span> : notices === 'denied' ? <span className="praxis-muted">Blocked in the browser</span> : notices === 'unsupported' ? <span className="praxis-muted">Not on this browser</span> : <button type="button" className="button-quiet button--sm" onClick={onNotices}>Allow</button>}
            </div>
          </li>
        </ul>
        <AccountCard app="Praxis" what="Your blocks and the time on them" waiting="Blocks" />
        <FamilyBackup />
        <FamilyApps current="praxis" />
      </div>
    </section>
  );
}
