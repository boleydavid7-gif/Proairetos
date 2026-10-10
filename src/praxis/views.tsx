import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import type { ItemEvent } from '../core/item-events/types';
import type { LifeItem } from '../core/life-items/types';
import type { CompassStatement } from '../core/compass/types';
import { formatClockDown, type FocusSession } from '../core/focus/session';
import type { PlayerState } from '../app/sound/player';
import { soundEntry } from '../app/sound/soundscapes';
import { BookIcon, CheckIcon, ClockIcon, PenIcon } from '../components/icons/Icons';
import AccountCard from '../app/family/AccountCard';
import FamilyBackup from '../app/family/FamilyBackup';
import FamilyApps from '../app/family/FamilyApps';
import {
  clampMinutes,
  formatDay,
  formatMinutes,
  formatSessionTime,
  LENGTHS,
  LOOK_AGAIN,
  LOOK_AGAIN_SOURCE,
  minutesByBlock,
  minutesByDay,
  focusMinutes,
  sessionDay,
  weekOf,
  addDaysKey,
  type DayAt,
  type PraxisQuote,
} from './data';

export const PRAXIS_SOUND_IDS = ['none', 'forest', 'rain', 'ocean', 'river', 'wind', 'fan', 'campfire', 'crickets'] as const;

export type After = { itemId: string; title: string; minutes: number };
export type Break = { endsAt: number; minutes: number };

/* ---------- Today ---------- */

type TodayProps = {
  greeting: string;
  /** Opened from "Start my next block": the Start button waits for the one tap phones need for sound. */
  ready?: boolean;
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
  reading: string[];
  onStart: () => void;
  onStop: () => void;
  onMinutes: (minutes: number) => void;
  onSelect: (block: LifeItem) => void;
  onToggle: (block: LifeItem) => void;
  onAdd: (title: string, minutes: number) => void;
  onSave: (block: LifeItem, change: { title: string; minutes: number; goalId?: string }) => void;
  onRemove: (block: LifeItem) => void;
  onEndRest: () => void;
  onRest: (minutes: number) => void;
  onKeepLine: (line: string) => void;
  onLookAgain: (days: number) => void;
  onCloseAfter: () => void;
  onLookedAt: (block: LifeItem) => void;
};

export function TodayView(props: TodayProps) {
  const { greeting, today, blocks, selected, session, remaining, finished, minutes, rest, restLeft, after, quote } = props;
  const open = blocks.filter((block) => block.status !== 'DONE');
  const done = blocks.filter((block) => block.status === 'DONE');
  const again = open.filter((block) => block.plannedFor && block.plannedFor <= today);
  const startButton = (node: HTMLButtonElement | null) => {
    if (node && props.ready) node.scrollIntoView({ block: 'center' });
  };
  const progress = rest ? 1 - restLeft / (rest.minutes * 60_000) : session ? 1 - remaining / session.durationMs : 0;
  return (
    <section className="praxis-view praxis-today-view">
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">Today</p><h1>{greeting}</h1></div></div>
      <div className="praxis-today-grid">
        <article className="praxis-card praxis-focus-card">
          {after && !session && !rest ? (
            <AfterBlock after={after} onRest={props.onRest} onKeepLine={props.onKeepLine} onLookAgain={props.onLookAgain} onClose={props.onCloseAfter} />
          ) : (
            <>
              <div className="praxis-card-heading">
                <div>
                  <p className="praxis-eyebrow">{rest ? 'A break' : session ? 'Studying' : 'Next'}</p>
                  <h2>{rest ? `${rest.minutes} minutes away` : session?.itemTitle ?? selected?.title ?? 'Add a block to begin'}</h2>
                  {!rest && <p>{session ? (session.pausedAt ? 'Paused' : `${Math.round(session.durationMs / 60_000)} minutes`) : selected ? `${minutes} minutes` : ''}</p>}
                </div>
              </div>
              <div className="praxis-focus-stage">
                <div className="praxis-timer" style={{ '--praxis-progress': `${Math.max(0.01, progress) * 360}deg` } as CSSProperties} aria-label={rest ? `${formatClockDown(restLeft)} of the break left` : session ? `${formatClockDown(remaining)} left` : `${minutes} minute block`}>
                  <div className="praxis-timer__inner"><span className="praxis-timer__time">{rest ? formatClockDown(restLeft) : session ? (finished ? '0:00' : formatClockDown(remaining)) : `${minutes}:00`}</span></div>
                </div>
                {rest ? (
                  <div className="praxis-focus-actions"><button type="button" className="praxis-button praxis-button--quiet" onClick={props.onEndRest}>End the break</button></div>
                ) : (
                  <>
                    <div className="praxis-focus-actions">
                      <button type="button" ref={startButton} className={`praxis-button praxis-button--primary${props.ready ? ' praxis-button--ready' : ''}`} onClick={props.onStart} disabled={!selected && !session}>{session ? (session.pausedAt ? 'Resume' : 'Pause') : 'Start'}</button>
                      {session && <button type="button" className="praxis-button praxis-button--quiet" onClick={props.onStop}>Stop here</button>}
                    </div>
                    {!session && selected && <LengthPicker minutes={minutes} onMinutes={props.onMinutes} />}
                  </>
                )}
              </div>
            </>
          )}
        </article>

        <article className="praxis-card praxis-plan-card">
          <div className="praxis-card-heading"><div><p className="praxis-eyebrow">Your blocks</p><h2>What are you studying?</h2></div></div>
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
              <BlockRow key={block.id} block={block} selected={block.id === selected?.id} goals={props.goals} onSelect={props.onSelect} onToggle={props.onToggle} onSave={props.onSave} onRemove={props.onRemove} />
            ))}
          </div>
          <AddBlock reading={props.reading} empty={open.length === 0} onAdd={props.onAdd} />
          {done.length > 0 && (
            <details className="praxis-done">
              <summary>Done</summary>
              {done.map((block) => (
                <BlockRow key={block.id} block={block} selected={false} goals={props.goals} onSelect={props.onSelect} onToggle={props.onToggle} onSave={props.onSave} onRemove={props.onRemove} />
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
    <div className="praxis-adjust" role="group" aria-label="Length">
      {LENGTHS.map((value) => <button key={value} type="button" className={minutes === value ? 'is-selected' : ''} onClick={() => onMinutes(value)}>{value} min</button>)}
      <label className={`praxis-adjust__other${custom ? ' is-selected' : ''}`}>
        <input type="number" inputMode="numeric" min={1} max={240} placeholder="Other" aria-label="Other length in minutes" value={custom ? String(minutes) : other} onChange={(event) => { setOther(event.target.value); const value = Number(event.target.value); if (Number.isFinite(value) && value > 0) onMinutes(clampMinutes(value)); }} />
        <span>min</span>
      </label>
    </div>
  );
}

function BlockRow({ block, selected, goals, onSelect, onToggle, onSave, onRemove }: { block: LifeItem; selected: boolean; goals: CompassStatement[]; onSelect: (block: LifeItem) => void; onToggle: (block: LifeItem) => void; onSave: TodayProps['onSave']; onRemove: (block: LifeItem) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [minutes, setMinutes] = useState(String(block.plannedMinutes ?? 25));
  const [goalId, setGoalId] = useState(block.goalId ?? '');
  const goal = goals.find((each) => each.id === block.goalId);
  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(minutes);
    if (!title.trim()) return;
    onSave(block, { title: title.trim(), minutes: Number.isFinite(value) && value > 0 ? clampMinutes(value) : block.plannedMinutes ?? 25, goalId: goalId || undefined });
    setEditing(false);
  };
  return (
    <div className={`praxis-task${selected ? ' is-selected' : ''}${block.status === 'DONE' ? ' is-done' : ''}`}>
      <div className="praxis-task__row">
        <button type="button" className="praxis-task-main" onClick={() => onSelect(block)} aria-pressed={selected}>
          <span className="praxis-task-icon"><BookIcon size={17} /></span>
          <span><strong>{block.title}</strong><small>{block.plannedMinutes ?? 25} min{goal ? ` · ${goal.body}` : ''}</small></span>
        </button>
        <button type="button" className="praxis-task-edit" aria-label={`Change ${block.title}`} onClick={() => setEditing(!editing)}><PenIcon size={15} /></button>
        <button type="button" className="praxis-task-check" aria-label={`${block.status === 'DONE' ? 'Bring back' : 'Done with'} ${block.title}`} onClick={() => onToggle(block)}><CheckIcon size={14} /></button>
      </div>
      {editing && (
        <form className="praxis-block-form" onSubmit={save}>
          <label><span>Name</span><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label>
          <label><span>Usual length</span><input type="number" inputMode="numeric" min={1} max={240} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><b>min</b></label>
          {goals.length > 0 && (
            <label><span>Working toward</span><select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Nothing in particular</option>{goals.map((each) => <option key={each.id} value={each.id}>{each.body}</option>)}</select></label>
          )}
          <div className="praxis-block-form__actions">
            <button type="submit" className="praxis-button praxis-button--primary">Save</button>
            <button type="button" className="praxis-button praxis-button--quiet" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="praxis-text-link praxis-remove" onClick={() => onRemove(block)}>Remove</button>
          </div>
        </form>
      )}
    </div>
  );
}

function AddBlock({ reading, empty, onAdd }: { reading: string[]; empty: boolean; onAdd: (title: string, minutes: number) => void }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('25');
  const add = (event?: FormEvent, named?: string) => {
    event?.preventDefault();
    const words = (named ?? title).trim();
    if (!words) return;
    const value = Number(minutes);
    onAdd(words, Number.isFinite(value) && value > 0 ? clampMinutes(value) : 25);
    setTitle('');
  };
  return (
    <form className="praxis-add" onSubmit={add}>
      <div className="praxis-add__row">
        <input aria-label="A block to study" placeholder={empty ? 'A subject, a chapter, a skill' : 'Add a block'} value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
        <input aria-label="Minutes" type="number" inputMode="numeric" min={1} max={240} value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        <button type="submit" className="praxis-button praxis-button--quiet" disabled={!title.trim()}>Add</button>
      </div>
      {reading.length > 0 && (
        <div className="praxis-add__from">
          {reading.slice(0, 3).map((book) => <button type="button" key={book} onClick={() => add(undefined, `Read: ${book}`)}>Read: {book}</button>)}
        </div>
      )}
    </form>
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
            <input aria-label="One line to keep" placeholder="One line, if you like" value={line} onChange={(event) => setLine(event.target.value)} />
            <button type="submit" className="praxis-button praxis-button--quiet" disabled={!line.trim()}>Keep</button>
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

export function SessionsView({ events, titles, dayAt, onChange, onRemove }: { events: ItemEvent[]; titles: Map<string, string>; dayAt: DayAt; onChange: (event: ItemEvent, minutes: number) => void; onRemove: (event: ItemEvent) => void }) {
  const [shown, setShown] = useState(40);
  const [editing, setEditing] = useState<string>();
  const [value, setValue] = useState('');
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const groups: { day: string; events: ItemEvent[] }[] = [];
  for (const event of sorted.slice(0, shown)) {
    const day = sessionDay(event, dayAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">As recorded</p><h1>Sessions</h1></div></div>
      {groups.length === 0 ? <article className="praxis-card praxis-wide-card"><p className="praxis-empty">Sessions show here once a block has run.</p></article> : groups.map((group) => (
        <article className="praxis-card praxis-wide-card praxis-day-group" key={group.day}>
          <p className="praxis-eyebrow">{formatDay(group.day)}</p>
          {group.events.map((event) => (
            <div key={event.id}>
              <div className="praxis-history-row">
                <span className="praxis-history-icon"><BookIcon size={17} /></span>
                <span><strong>{titles.get(event.itemId) ?? 'A block'}</strong><small>{formatSessionTime(event.timestamp)}</small></span>
                <button type="button" className="praxis-history-duration" onClick={() => { setEditing(editing === event.id ? undefined : event.id); setValue(String(focusMinutes(event))); }}>{focusMinutes(event)} min</button>
              </div>
              {editing === event.id && (
                <form className="praxis-block-form" onSubmit={(submit) => { submit.preventDefault(); const minutes = Number(value); if (Number.isFinite(minutes) && minutes > 0) onChange(event, clampMinutes(minutes)); setEditing(undefined); }}>
                  <label><span>Minutes</span><input type="number" inputMode="numeric" min={1} max={240} value={value} onChange={(change) => setValue(change.target.value)} /><b>min</b></label>
                  <div className="praxis-block-form__actions">
                    <button type="submit" className="praxis-button praxis-button--primary">Save</button>
                    <button type="button" className="praxis-button praxis-button--quiet" onClick={() => setEditing(undefined)}>Cancel</button>
                    <button type="button" className="praxis-text-link praxis-remove" onClick={() => { onRemove(event); setEditing(undefined); }}>Remove</button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </article>
      ))}
      {sorted.length > shown && <button type="button" className="praxis-button praxis-button--quiet" onClick={() => setShown(shown + 40)}>Show earlier</button>}
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
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">As recorded</p><h1>Time</h1></div></div>
      <div className="praxis-stats-grid">
        <article className="praxis-card praxis-wide-card">
          <div className="praxis-card-heading">
            <div><p className="praxis-eyebrow">{label}</p><h2>{total ? formatMinutes(total) : 'Nothing recorded'}</h2></div>
            <div className="praxis-week-step">
              <button type="button" aria-label="Week before" onClick={() => setAnchor(addDaysKey(days[0], -7))}>‹</button>
              <button type="button" aria-label="Week after" disabled={current} onClick={() => setAnchor(addDaysKey(days[0], 7))}>›</button>
            </div>
          </div>
          <div className="praxis-chart">
            {days.map((day, index) => (
              <div className="praxis-bar-group" key={day}>
                <small className="praxis-bar-value">{minutes[index] ? formatMinutes(minutes[index]) : ''}</small>
                {minutes[index] > 0 ? <div className="praxis-bar" style={{ height: `${Math.max(6, (minutes[index] / max) * 100)}%` }} /> : <div className="praxis-bar praxis-bar--none" />}
                <span className={day === today ? 'is-today' : undefined}>{formatDay(day).slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="praxis-card praxis-wide-card">
          <p className="praxis-eyebrow">By block</p>
          {blocks.length === 0 ? <p className="praxis-empty">No time recorded in this week.</p> : blocks.map((each) => (
            <div className="praxis-history-row" key={each.itemId}><span className="praxis-history-icon"><ClockIcon size={17} /></span><span><strong>{titles.get(each.itemId) ?? 'A block'}</strong></span><span className="praxis-history-duration">{formatMinutes(each.minutes)}</span></div>
          ))}
        </article>
      </div>
    </section>
  );
}

/* ---------- Sounds ---------- */

export function SoundsView({ sound, soundState, onSound }: { sound: string; soundState: PlayerState; onSound: (sound: string) => void }) {
  return (
    <section className="praxis-view">
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">While you study</p><h1>Sounds</h1></div></div>
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
      <div className="praxis-page-heading"><div><p className="praxis-eyebrow">Praxis</p><h1>Settings</h1></div></div>
      <article className="praxis-card praxis-wide-card">
        <div className="praxis-setting">
          <span><strong>A notice when a block ends</strong><small>Through the family's reminders, so it comes with Praxis closed once reminders are set up on the server.</small></span>
          {notices === 'granted' ? <span className="praxis-muted">On</span> : notices === 'denied' ? <span className="praxis-muted">Blocked in the browser</span> : notices === 'unsupported' ? <span className="praxis-muted">Not on this browser</span> : <button type="button" className="praxis-button praxis-button--quiet" onClick={onNotices}>Allow</button>}
        </div>
      </article>
      <div className="family-surface">
        <AccountCard app="Praxis" what="Your blocks and the time on them" waiting="Blocks" />
        <FamilyBackup />
        <FamilyApps current="praxis" />
      </div>
    </section>
  );
}
