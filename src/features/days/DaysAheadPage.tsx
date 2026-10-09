import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import { calendarSources, otherCalendars } from '../../app/calendars/otherCalendars';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { mealsOn, useRecipesFromSoma } from '../../app/soma/meals';
import { billsOn } from '../../app/family/glance';
import MiniMonth from './MiniMonth';
import { useStore } from '../../app/family/read';
import type { Bill } from '../../oikonomia/core/bills';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, lifeService, scheduleService } from '../../app/services';
import { goalLines } from '../../core/compass/goals';
import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  LeafIcon,
  ListIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
} from '../../components/icons/Icons';
import { itemSpan } from '../../core/rhythm/openTime';
import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { lengthMinutes, resizedEnd, shiftedStart, snapMinutes, STEP_MINUTES } from '../../core/rhythm/dragMath';
import type { LifeItem } from '../../core/life-items/types';
import { formatLocalDay, formatTimeOf } from '../schedule/format';
import DayChangeSheet, { type DayChangeTarget } from '../today/DayChangeSheet';
import { buildDayTimeline, dayTitle } from '../today/timeline';
import { planFor } from '../plan/planView';
import AddEventSheet from './AddEventSheet';
import DayPlan from './DayPlan';
import { DRAG_TYPE } from '../items/CheckRow';
import SettingsButton from '../../components/layout/SettingsButton';
import SearchButton from '../../components/layout/SearchButton';
import QuickSortSheet, { sortable } from '../capture/QuickSortSheet';
import { entryLook, setDaysAheadOpening, takeDaysAheadOpening, type EntryIcon, type Timed } from './daysAhead';

export type DaysView = 'list' | 'calendar';
type CalendarMode = 'week' | 'month' | 'year';

/** The first of the month `n` months from the one `date` is in. */
function monthStart(date: string, n = 0): string {
  const [y, m] = date.split('-').map(Number);
  const first = new Date(y, m - 1 + n, 1);
  return `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`;
}

const yearStart = (date: string, n = 0) => `${Number(date.slice(0, 4)) + n}-01-01`;

/** Month and year grids start their weeks on Sunday. */
const sundayOnOrBefore = (date: string) => addDays(date, -new Date(`${date}T12:00:00`).getDay());

/** Just the weeks the month touches: four to six rows of seven. */
function monthCells(date: string): number {
  const first = monthStart(date);
  const lead = new Date(`${first}T12:00:00`).getDay();
  const [y, m] = first.split('-').map(Number);
  const length = new Date(y, m, 0).getDate();
  return Math.ceil((lead + length) / 7) * 7;
}

const countLabel = (n: number) => (n === 1 ? '1 event' : `${n} events`);

function daysBetweenInclusive(from: string, until: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= until; day = addDays(day, 1)) days.push(day);
  return days;
}

const WEEK = 7;

const NARROW = '(max-width: 47.99rem)';
const isNarrow = () => typeof matchMedia === 'function' && matchMedia(NARROW).matches;
function subscribeNarrow(notify: () => void) {
  if (typeof matchMedia !== 'function') return () => undefined;
  const query = matchMedia(NARROW);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}
const HOUR_PX = 44;

const icons: Record<EntryIcon, ComponentType<{ size?: number }>> = {
  work: BriefcaseIcon,
  protected: ShieldIcon,
  item: ClockIcon,
  event: CalendarIcon,
};

function subscribeAll(listener: () => void) {
  const off = [lifeService.subscribe(listener), scheduleService.subscribe(listener), otherCalendars.subscribe(listener), compassService.subscribe(listener)];
  return () => off.forEach((unsubscribe) => unsubscribe());
}

const end = (entry: Timed) => (entry.kind === 'item' ? itemSpan(entry.item.scheduledAt!, entry.item.endsAt).end : entry.end);
/** An item shows an end only when the person gave one. */
const hasEnd = (entry: Timed) => entry.kind !== 'item' || Boolean(entry.item.endsAt);
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * Days ahead: up to a week, as a list or a calendar. Shows what is already
 * there and lets the person add something with a day and time. Colours are
 * the person's own labels.
 */
/** Bills with a date on one day: a quiet line each, opening Oikonomia. A paid one says so. */
function BillLines({ lines }: { lines: { id: string; name: string; amount: string; paid: boolean }[] }) {
  if (lines.length === 0) return null;
  return (
    <>
      {lines.map((line) => (
        <a key={line.id} className="days-bills" href="/oikonomia/">
          <ListIcon size={18} />
          <span>
            {line.name} · {line.amount}
          </span>
          {line.paid && <span className="days-bills__paid">paid</span>}
        </a>
      ))}
    </>
  );
}

export default function DaysAheadPage({ view }: { view: DaysView }) {
  const navigate = useNavigate();
  const { openItem, offerUndo } = useOverlays();
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  /** A to-do dropped on another day moves there. Undo puts it back. */
  async function moveItemToDay(id: string, date: string) {
    const item = await lifeService.get(id);
    if (!item || item.plannedFor === date || item.scheduledAt) return;
    const was = item.plannedFor;
    await lifeService.setPlannedFor(id, date);
    offerUndo(`Moved “${item.title}” to ${formatLocalDay(date, { weekday: 'long' })}`, async () => {
      await lifeService.setPlannedFor(id, was);
    });
  }
  const clock = useClock();
  const { today, rangeOf } = usePersonalDay(clock);
  // The real calendar day and minute, for the line that marks now in the week.
  const nowDate = toLocalDate(clock);
  const nowMinutes = clock.getHours() * 60 + clock.getMinutes();
  const [sorting, setSorting] = useState(false);
  const shows = useTodayParts();
  const recipes = useRecipesFromSoma();
  const bills = useStore<Bill>('oikonomiaBills', shows('bill-dates'));
  const billsFor = (date: string) => (shows('bill-dates') ? billsOn(bills, date) : []);
  const [opening] = useState(takeDaysAheadOpening);
  const [start, setStart] = useState(opening.start ?? today);
  const [mode, setMode] = useState<CalendarMode>('week');
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<DayChangeTarget | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const focusKey = opening.focusKey;

  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow);
  const [picked, setPicked] = useState<string | null>(null);
  const shape: 'list' | CalendarMode = view === 'list' ? 'list' : mode;
  const days =
    shape === 'month'
      ? Array.from({ length: monthCells(start) }, (_, i) => addDays(sundayOnOrBefore(monthStart(start)), i))
      : shape === 'year'
        ? daysBetweenInclusive(yearStart(start), `${start.slice(0, 4)}-12-31`)
        : Array.from({ length: WEEK }, (_, i) => addDays(start, i));
  const span = days.length;
  // On a phone the week shows one day at a time, chosen from a strip along the top.
  const focusDay = picked && days.includes(picked) ? picked : days.includes(nowDate) ? nowDate : days[0];
  const swipeFrom = useRef<number | null>(null);

  // Moving and resizing a timed item in the week, with a mouse or pen. Steps of 15 minutes; one undo.
  type Drag = { key: string; mode: 'move' | 'resize'; minutes: number; dx: number; date?: string };
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragStart = useRef<{ key: string; mode: 'move' | 'resize'; x: number; y: number; item: LifeItem; date: string; started: boolean; cols: { date: string; left: number; right: number }[] } | null>(null);
  const dragNow = useRef<Drag | null>(null);
  const justDragged = useRef(false);

  const beginDrag = (event: React.PointerEvent<HTMLElement>, key: string, item: LifeItem, date: string, mode: 'move' | 'resize') => {
    if (event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if ((event.target as HTMLElement).closest('.cal-entry__remove')) return;
    const cols = [...(scroller.current?.querySelectorAll<HTMLElement>('.cal-col') ?? [])].map((el) => {
      const box = el.getBoundingClientRect();
      return { date: el.dataset.date ?? '', left: box.left, right: box.right };
    });
    dragStart.current = { key, mode, x: event.clientX, y: event.clientY, item, date, started: false, cols };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (mode === 'resize') event.stopPropagation();
  };
  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const from = dragStart.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (!from.started) {
      if (Math.hypot(dx, dy) < 6) return;
      from.started = true;
    }
    const over = from.mode === 'move' ? from.cols.find((c) => event.clientX >= c.left && event.clientX < c.right)?.date : undefined;
    const next: Drag = { key: from.key, mode: from.mode, minutes: snapMinutes(dy, HOUR_PX), dx: from.mode === 'move' ? dx : 0, date: over && over !== from.date ? over : undefined };
    dragNow.current = next;
    setDrag(next);
  };
  const endDrag = async (event: React.PointerEvent<HTMLElement>) => {
    const from = dragStart.current;
    const last = dragNow.current;
    dragStart.current = null;
    dragNow.current = null;
    setDrag(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!from?.started || !last) return;
    justDragged.current = true;
    window.setTimeout(() => (justDragged.current = false), 0);
    const item = from.item;
    if (!item.scheduledAt) return;
    if (from.mode === 'move') {
      if (last.minutes === 0 && !last.date) return;
      const next = shiftedStart(item.scheduledAt, last.minutes, last.date);
      const before = { start: item.scheduledAt, end: item.endsAt };
      await lifeService.schedule(item.id, next);
      offerUndo(`Moved “${item.title}”`, async () => {
        await lifeService.scheduleSpan(item.id, before.start as string, before.end);
      });
    } else {
      if (last.minutes === 0) return;
      const nextEnd = resizedEnd(item.scheduledAt, item.endsAt, item.plannedMinutes, last.minutes);
      const before = item.endsAt;
      await lifeService.scheduleSpan(item.id, item.scheduledAt, nextEnd);
      offerUndo(`Changed the length of “${item.title}”`, async () => {
        await lifeService.scheduleSpan(item.id, item.scheduledAt as string, before);
      });
    }
  };
  /** The same moves from the keyboard: Alt with the arrows moves by a step, Alt and Shift changes the length. */
  const keyDrag = async (event: React.KeyboardEvent, item: LifeItem) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || !item.scheduledAt) return;
    event.preventDefault();
    const minutes = event.key === 'ArrowUp' ? -STEP_MINUTES : STEP_MINUTES;
    if (event.shiftKey) {
      const before = item.endsAt;
      await lifeService.scheduleSpan(item.id, item.scheduledAt, resizedEnd(item.scheduledAt, item.endsAt, item.plannedMinutes, minutes));
      offerUndo(`Changed the length of “${item.title}”`, async () => {
        await lifeService.scheduleSpan(item.id, item.scheduledAt as string, before);
      });
    } else {
      const before = { start: item.scheduledAt, end: item.endsAt };
      await lifeService.schedule(item.id, shiftedStart(item.scheduledAt, minutes));
      offerUndo(`Moved “${item.title}”`, async () => {
        await lifeService.scheduleSpan(item.id, before.start, before.end);
      });
    }
  };
  const first = days[0];
  const data = useServiceData(
    subscribeAll,
    async () => {
      const from = atTime(addDays(first, -1), '00:00');
      const until = atTime(addDays(first, span + 1), '00:00');
      const [items, patterns, occurrences, statements] = await Promise.all([
        lifeService.list(),
        scheduleService.patterns(),
        scheduleService.occurrencesBetween(from, until),
        compassService.statements(),
      ]);
      const goals = statements.filter((statement) => statement.type === 'GOAL');
      const events = otherCalendars.eventsBetween(from, until);
      const sources = calendarSources();
      return {
        items,
        patterns,
        sources,
        goals: { goals, lines: goalLines(goals, items, patterns) },
        days: days.map((date) => ({ date, entries: buildDayTimeline(date, occurrences, items, patterns, events) })),
      };
    },
    [first, span],
  );

  const focused = useRef<HTMLElement | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  focused.current = null;
  const markRef = (key: string) => (element: HTMLElement | null) => {
    if (key === focusKey && element) focused.current = element;
  };
  useEffect(() => {
    const target = focused.current;
    if (view === 'list') target?.scrollIntoView({ block: 'center' });
    else if (scroller.current) {
      // Opens at the tapped entry, else just before the earliest thing shown, else the morning.
      // Today in view: open around the present time; otherwise the morning.
      let earliest = (narrow ? focusDay === nowDate : days.includes(nowDate)) ? Math.max(6, nowMinutes / 60 - 1.5) : 7;
      for (const day of (narrow ? data?.days.filter((d) => d.date === focusDay) : data?.days) ?? []) {
        const dayStart = atTime(day.date, '00:00').getTime();
        for (const entry of day.entries) {
          // A block carried over from the night before does not set where the day opens.
          if (!('start' in entry) || entry.start.getTime() < dayStart) continue;
          earliest = Math.min(earliest, (entry.start.getTime() - dayStart) / 3_600_000);
        }
      }
      const top = target && scroller.current.contains(target) ? target.offsetTop - HOUR_PX / 2 : (earliest - 0.5) * HOUR_PX;
      scroller.current.scrollTop = Math.max(0, top);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.days[0]?.date, data?.days.length, view, mode, narrow, focusDay]);

  const open = (entry: Timed) => {
    if (entry.kind === 'item') openItem(entry.item.id);
    else if (entry.kind === 'shift')
      setChanging({
        patternId: entry.occurrence.patternId,
        patternName: entry.occurrence.patternName,
        date: entry.occurrence.date,
        blocks: [{ start: hhmm(entry.start), end: hhmm(entry.end), label: entry.occurrence.label, color: entry.occurrence.color }],
      });
  };

  const remove = async (entry: Timed) => {
    if (removing === entry.key) return;
    setRemoving(entry.key);
    try {
      if (entry.kind === 'item') {
        const deletion = await lifeService.deleteItem(entry.item.id);
        offerUndo(`Deleted: ${entry.item.title}`, deletion.undo);
      } else if (entry.kind === 'shift') {
        const deletion = await scheduleService.removeDay(entry.occurrence.patternId, entry.occurrence.date);
        offerUndo(`Removed: ${entry.occurrence.patternName}`, deletion.undo);
      } else {
        const deletion = otherCalendars.removeEvent(entry.event.sourceId, entry.event.key);
        offerUndo(`Removed from ${entry.event.source}`, deletion.undo);
      }
    } finally {
      setRemoving(null);
    }
  };

  const removeCalendarEvent = (event: { sourceId: string; key: string; source: string; title: string }) => {
    if (removing === `event:${event.key}`) return;
    setRemoving(`event:${event.key}`);
    const deletion = otherCalendars.removeEvent(event.sourceId, event.key);
    offerUndo(`Removed from ${event.source}`, deletion.undo);
    setRemoving(null);
  };

  const hasPlan = (date: string) =>
    Boolean(data) &&
    planFor(date, today, data!.items, rangeOf(date)).some((section) =>
      [...section.open, ...section.done].some((item) => !item.scheduledAt || item.checklist),
    );
  const toSort = data ? sortable(data.items, today) : [];

  const move = (n: number) =>
    setStart(shape === 'month' ? monthStart(start, n) : shape === 'year' ? yearStart(start, n) : addDays(start, n * WEEK));
  const rangeLabel =
    shape === 'month'
      ? new Date(`${monthStart(start)}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : shape === 'year'
        ? start.slice(0, 4)
        : `${formatLocalDay(days[0], { month: 'short', day: 'numeric' })} – ${formatLocalDay(days[WEEK - 1], { month: 'short', day: 'numeric' })}`;

  return (
    <div className="page days-page">
      <div className="page-header__actions days-corner">
        <SearchButton />
        <SettingsButton />
      </div>
      <header className="days-header">
        <div>
          <h1 className="page-header__title">Days ahead</h1>
          <p className="page-header__subtitle">Your upcoming days at a glance</p>
        </div>
        <span className="days-header__actions">
          <button type="button" className="days-add" aria-label="Add" onClick={() => setAdding(true)}>
            <PlusIcon size={26} />
          </button>
        </span>
      </header>

      <div className="days-toolbar">
      <div className="segmented" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={view === 'list'} className="segmented__option" onClick={() => { setDaysAheadOpening({ start }); navigate('plan'); }}>
          <ListIcon size={20} /> List
        </button>
        <button type="button" role="tab" aria-selected={view === 'calendar'} className="segmented__option" onClick={() => { setDaysAheadOpening({ start }); navigate('calendar'); }}>
          <CalendarIcon size={20} /> Calendar
        </button>
      </div>

      {view === 'calendar' && (
        <div className="segmented segmented--even" role="tablist" aria-label="Calendar view">
          {(['week', 'month', 'year'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              className="segmented__option"
              aria-selected={mode === option}
              onClick={() => {
                setMode(option);
                if (option === 'month') setStart(start.slice(0, 7) === today.slice(0, 7) ? today : monthStart(start));
              }}
            >
              {option === 'week' ? 'Week' : option === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      )}

      <div className="days-stepper">
        <button type="button" className="days-stepper__step" aria-label="Earlier" onClick={() => move(-1)}>
          <ChevronRightIcon size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="days-stepper__range">{rangeLabel}</span>
        <button type="button" className="days-stepper__step" aria-label="Later" onClick={() => move(1)}>
          <ChevronRightIcon size={20} />
        </button>
      </div>
      {(shape === 'month' ? monthStart(start) !== monthStart(today) : shape === 'year' ? start.slice(0, 4) !== today.slice(0, 4) : start !== today) && (
        <button type="button" className="text-link days-back" onClick={() => setStart(today)}>
          Back to today
        </button>
      )}
      </div>

      {view === 'list' && shows('sort-through') && toSort.length > 1 && (
        <button type="button" className="quiet-row" onClick={() => setSorting(true)}>
          <span className="quiet-row__text">
            <span>Sort through your list</span>
            <span className="quiet-row__detail">One at a time: today, later, or let it go.</span>
          </span>
          <ChevronRightIcon size={18} className="quiet-row__chevron" />
        </button>
      )}
      {sorting && data && <QuickSortSheet items={data.items} today={today} onClose={() => setSorting(false)} />}

      {view === 'list' &&
        data?.days.map(({ date, entries }) => {
          const timed = entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
          const allDay = entries.flatMap((entry) => (entry.kind === 'allday' ? [entry] : []));
          return (
            <section
              key={date}
              className={`days-day${dropTarget === date ? ' days-day--over' : ''}`}
              aria-label={formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
                event.preventDefault();
                setDropTarget(date);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget((now) => (now === date ? null : now));
              }}
              onDrop={(event) => {
                const id = event.dataTransfer.getData(DRAG_TYPE);
                setDropTarget(null);
                if (!id) return;
                event.preventDefault();
                void moveItemToDay(id, date);
              }}
            >
              <h2 className="days-day__title">
                {dayTitle(date, today)}
                <span className="days-day__date">{formatLocalDay(date, { month: 'short', day: 'numeric' })}</span>
              </h2>
              {timed.length === 0 && allDay.length === 0 && !hasPlan(date) && billsFor(date).length === 0 && <p className="days-day__empty">Nothing set.</p>}
              <ul className="days-list">
                {allDay.map((entry) => (
                  <li key={entry.key} className="days-allday">
                    <span className="days-allday__text">All day · {entry.event.title}</span>
                    <button
                      type="button"
                      className="days-allday__remove"
                      aria-label={`Delete ${entry.event.title}`}
                      disabled={removing === `event:${entry.event.key}`}
                      onClick={() => removeCalendarEvent(entry.event)}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </li>
                ))}
                {timed.map((entry) => {
                  const look = entryLook(entry, data.patterns, data.sources, data.goals);
                  const Icon = icons[look.icon];
                  const tappable = entry.kind !== 'event';
                  const body = (
                    <>
                      <span className="days-row__time">
                        {formatTimeOf(entry.start)}
                        {hasEnd(entry) && <span className="days-row__until">{formatTimeOf(end(entry))}</span>}
                      </span>
                      <span className="days-row__icon">
                        <Icon size={22} />
                      </span>
                      <span className="days-row__text">
                        <span className="days-row__title">{look.title}</span>
                        {look.location && (
                          <span className="days-row__where">
                            <PinIcon size={14} /> {look.location}
                          </span>
                        )}
                        {look.detail && <span className="days-row__where">{look.detail}</span>}
                      </span>
                      {tappable && <ChevronRightIcon size={18} className="days-row__chevron" />}
                    </>
                  );
                  return (
                    <li
                      key={entry.key}
                      ref={markRef(entry.key)}
                      className={`days-row tag--${look.color ?? 'none'}${entry.key === focusKey ? ' days-row--focus' : ''}`}
                    >
                      {tappable ? (
                        <button type="button" className="days-row__button" onClick={() => open(entry)}>
                          {body}
                        </button>
                      ) : (
                        <div className="days-row__button">{body}</div>
                      )}
                      <button
                        type="button"
                        className="days-row__remove"
                        aria-label={`Delete ${look.title}`}
                        disabled={removing === entry.key}
                        onClick={(event) => {
                          event.stopPropagation();
                          void remove(entry);
                        }}
                      >
                        <TrashIcon size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {shows('soma') && mealsOn(recipes, date).length > 0 && (
                <a className="days-meals" href="/soma/">
                  <LeafIcon size={18} /> {mealsOn(recipes, date)
                    .map((meal) => meal.title)
                    .join(', ')}
                </a>
              )}
              <BillLines lines={billsFor(date)} />
              <DayPlan date={date} today={today} items={data.items} range={rangeOf(date)} allowDelete />
            </section>
          );
        })}

      {shape === 'week' && data && (
        <div className="days-weekwrap">
        {!narrow && (
          <aside className="days-aside">
            <MiniMonth key={start.slice(0, 7)} shown={start} today={nowDate} onPick={setStart} />
            <button type="button" className="chip chip--wide" onClick={() => setStart(today)}>
              Today
            </button>
          </aside>
        )}
        <div className={`days-calendar${" days-calendar--week"}`} style={{ ['--days' as string]: String(narrow ? 1 : span) }}>
          {narrow ? (
            <div className="cal-strip" role="tablist" aria-label="Day">
              {data.days.map(({ date }) => (
                <button
                  key={date}
                  type="button"
                  role="tab"
                  aria-selected={date === focusDay}
                  className={`cal-strip__day${date === nowDate ? ' cal-strip__day--today' : ''}`}
                  onClick={() => setPicked(date)}
                >
                  <span>{formatLocalDay(date, { weekday: 'narrow' })}</span>
                  <strong>{formatLocalDay(date, { day: 'numeric' })}</strong>
                  {data.days.find((day) => day.date === date)?.entries.some((entry) => entry.kind !== 'off') && <i aria-hidden="true" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="cal-head" aria-hidden="true">
              <span />
              {data.days.map(({ date }) => (
                <span key={date} className={date === nowDate ? 'cal-head__day cal-head__day--today' : 'cal-head__day'}>
                  {formatLocalDay(date, { weekday: 'narrow' })}
                  <strong>{formatLocalDay(date, { day: 'numeric' })}</strong>
                </span>
              ))}
            </div>
          )}
          {shows('bill-dates') && (narrow ? [focusDay] : data.days.map((day) => day.date)).some((date) => billsFor(date).length > 0) && (
            <div className="cal-head cal-bills" style={{ ['--days' as string]: String(narrow ? 1 : span) }}>
              <span aria-hidden="true" />
              {(narrow ? data.days.filter((day) => day.date === focusDay) : data.days).map(({ date }) => (
                <span key={date} className="cal-bills__day">
                  {billsFor(date).map((line) => (
                    <a key={line.id} href="/oikonomia/" className={`cal-bills__chip${line.paid ? ' cal-bills__chip--paid' : ''}`} title={`${line.name} · ${line.amount}${line.paid ? ' · paid' : ''}`}>
                      {line.name}
                    </a>
                  ))}
                </span>
              ))}
            </div>
          )}
          <div
            ref={scroller}
            className="cal-scroll"
            onTouchStart={(event) => {
              swipeFrom.current = narrow ? event.touches[0].clientX : null;
            }}
            onTouchEnd={(event) => {
              const from = swipeFrom.current;
              swipeFrom.current = null;
              if (from === null) return;
              const across = event.changedTouches[0].clientX - from;
              if (Math.abs(across) < 70) return;
              const at = days.indexOf(focusDay) + (across < 0 ? 1 : -1);
              if (at >= 0 && at < days.length) setPicked(days[at]);
              else {
                // Past the end of the week: on to the next or the one before.
                setPicked(across < 0 ? addDays(days[0], WEEK) : addDays(days[0], -1));
                move(across < 0 ? 1 : -1);
              }
            }}
          >
            <div className="cal-grid" style={{ height: 24 * HOUR_PX }}>
              <div className="cal-hours" aria-hidden="true">
                {Array.from({ length: 24 }, (_, hour) => (
                  <span key={hour} style={{ top: hour * HOUR_PX }}>
                    {hour === 0 ? '' : formatTimeOf(atTime(today, `${pad(hour)}:00`)).replace(':00', '')}
                  </span>
                ))}
              </div>
              {(narrow ? data.days.filter((day) => day.date === focusDay) : data.days).map(({ date, entries }) => {
                const dayStart = atTime(date, '00:00').getTime();
                const dayEnd = atTime(addDays(date, 1), '00:00').getTime();
                const timed = entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
                return (
                  <div key={date} className={`cal-col${date === nowDate ? ' cal-col--today' : ''}`} data-date={date} role="list" aria-label={formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}>
                    {date === nowDate && <div className="cal-now" style={{ top: (nowMinutes / 60) * HOUR_PX }} aria-hidden="true" />}
                    {timed.map((entry) => {
                      const look = entryLook(entry, data.patterns, data.sources, data.goals);
                      const from = Math.max(entry.start.getTime(), dayStart);
                      const until = Math.min(end(entry).getTime(), dayEnd);
                      const style = {
                        top: ((from - dayStart) / 3_600_000) * HOUR_PX,
                        height: Math.max(((until - from) / 3_600_000) * HOUR_PX, 22),
                      };
                      const layer = entry.kind === 'shift' ? 'block' : 'point';
                      // A timed item (not one that repeats) can be pulled to another time or day, or stretched.
                      const movable = entry.kind === 'item' && Boolean(entry.item.scheduledAt) && !entry.item.repeat;
                      const dragged = drag && drag.key === entry.key ? drag : null;
                      const shownStyle = dragged
                        ? dragged.mode === 'move'
                          ? { ...style, transform: `translate(${dragged.dx}px, ${(dragged.minutes / 60) * HOUR_PX}px)` }
                          : { ...style, height: Math.max((style.height as number) + (dragged.minutes / 60) * HOUR_PX, (STEP_MINUTES / 60) * HOUR_PX) }
                        : style;
                      const className = `cal-entry cal-entry--${layer} tag--${look.color ?? 'none'}${entry.key === focusKey ? ' cal-entry--focus' : ''}${movable ? ' cal-entry--movable' : ''}${dragged ? ' cal-entry--dragging' : ''}`;
                      const label = `${look.title}, ${formatTimeOf(entry.start)}`;
                      const tappable = entry.kind !== 'event';
                      const shownTime = dragged && movable && dragged.mode === 'move' ? formatTimeOf(new Date(shiftedStart(entry.item.scheduledAt as string, dragged.minutes))) : formatTimeOf(entry.start);
                      const draggedLength = dragged && movable && dragged.mode === 'resize' ? ` · ${lengthMinutes(entry.item.scheduledAt as string, entry.item.endsAt, entry.item.plannedMinutes) + dragged.minutes} min` : '';
                      return (
                        <div
                          key={entry.key}
                          ref={markRef(entry.key)}
                          role="listitem"
                          className={className}
                          style={shownStyle}
                          aria-label={label}
                          onPointerDown={movable ? (event) => beginDrag(event, entry.key, entry.item, date, 'move') : undefined}
                          onPointerMove={movable ? moveDrag : undefined}
                          onPointerUp={movable ? (event) => void endDrag(event) : undefined}
                          onPointerCancel={movable ? () => { dragStart.current = null; dragNow.current = null; setDrag(null); } : undefined}
                        >
                          {tappable ? (
                            <button
                              type="button"
                              className="cal-entry__open"
                              onClick={() => {
                                if (justDragged.current) return;
                                open(entry);
                              }}
                              onKeyDown={movable ? (event) => void keyDrag(event, entry.item) : undefined}
                            >
                              <span className="cal-entry__title">{look.title}</span>
                              {(until - from >= 40 * 60_000 || dragged) && <span className="cal-entry__time">{shownTime}{draggedLength}</span>}
                            </button>
                          ) : (
                            <span className="cal-entry__open">
                              <span className="cal-entry__title">{look.title}</span>
                              {until - from >= 40 * 60_000 && <span className="cal-entry__time">{formatTimeOf(entry.start)}</span>}
                            </span>
                          )}
                          {movable && (
                            <span
                              className="cal-entry__grip"
                              aria-hidden="true"
                              onPointerDown={(event) => beginDrag(event, entry.key, entry.item, date, 'resize')}
                              onPointerMove={moveDrag}
                              onPointerUp={(event) => {
                                event.stopPropagation();
                                void endDrag(event);
                              }}
                            />
                          )}
                          <button
                            type="button"
                            className="cal-entry__remove"
                            aria-label={`Delete ${look.title}`}
                            disabled={removing === entry.key}
                            onClick={(event) => {
                              event.stopPropagation();
                              void remove(entry);
                            }}
                          >
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      )}

      {shape === 'month' && data && (
        <>
          <div className="month" role="grid" aria-label={rangeLabel}>
            <div className="month__head" role="row">
              {data.days.slice(0, 7).map(({ date }) => (
                <span key={date} role="columnheader">
                  {formatLocalDay(date, { weekday: 'short' })}
                </span>
              ))}
            </div>
            <div className="month__grid">
              {data.days.map(({ date, entries }) => {
                const looks = entries.flatMap((entry): { title: string; color?: string }[] =>
                  entry.kind === 'off' ? [] : entry.kind === 'allday' ? [{ title: entry.event.title }] : [entryLook(entry, data.patterns, data.sources, data.goals)],
                );
                for (const line of billsFor(date)) looks.push({ title: line.name, color: 'amber' });
                const outside = date.slice(0, 7) !== monthStart(start).slice(0, 7);
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={date === start}
                    className={`month__day${outside ? ' month__day--outside' : ''}${date === today ? ' month__day--today' : ''}`}
                    aria-label={`${formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}${looks.length ? `, ${countLabel(looks.length)}` : ''}`}
                    onClick={() => setStart(date)}
                  >
                    <span className="month__num">{Number(date.slice(8))}</span>
                    {looks.length > 0 && !outside && (
                      <span className="month__chips" aria-hidden="true">
                        {looks.slice(0, 3).map((look, index) => (
                          <span key={index} className={`month__chip tag--${look.color ?? 'none'}`}>
                            {look.title}
                          </span>
                        ))}
                        {looks.length > 3 && <span className="month__more">+{looks.length - 3} more</span>}
                      </span>
                    )}
                    {looks.length > 0 && (
                      <span className="month__dots" aria-hidden="true">
                        {looks.slice(0, 3).map((look, index) => (
                          <span key={index} className={`month__dot tag--${look.color ?? 'none'}`} />
                        ))}
                      </span>
                    )}
                    {looks.length > 0 && !outside && (
                      <span className={`month__count tag--${looks[0].color ?? 'none'}`} aria-hidden="true">
                        <strong>{looks.length}</strong>
                        {looks.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const day = data.days.find(({ date }) => date === start);
            if (!day) return null;
            const timed = day.entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
            const allDay = day.entries.flatMap((entry) => (entry.kind === 'allday' ? [entry] : []));
            const count = timed.length + allDay.length;
            return (
              <section className="month-day" aria-label={formatLocalDay(start, { weekday: 'long', month: 'long', day: 'numeric' })}>
                <div className="month-day__head">
                  <h2 className="month-day__title">{formatLocalDay(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                  {count > 0 && <span className="month-day__count">{countLabel(count)}</span>}
                </div>
                {count === 0 && !hasPlan(start) && billsFor(start).length === 0 && <p className="days-day__empty">Nothing set.</p>}
                <ul className="days-list">
                  {allDay.map((entry) => (
                    <li key={entry.key} className="days-allday">
                      <span className="days-allday__text">All day · {entry.event.title}</span>
                      <button
                        type="button"
                        className="days-allday__remove"
                        aria-label={`Delete ${entry.event.title}`}
                        disabled={removing === `event:${entry.event.key}`}
                        onClick={() => removeCalendarEvent(entry.event)}
                      >
                        <TrashIcon size={18} />
                      </button>
                    </li>
                  ))}
                  {timed.map((entry) => {
                    const look = entryLook(entry, data.patterns, data.sources, data.goals);
                    const Icon = icons[look.icon];
                    const tappable = entry.kind !== 'event';
                    const body = (
                      <>
                        <span className="days-row__icon">
                          <Icon size={22} />
                        </span>
                        <span className="days-row__text">
                          <span className="days-row__title">{look.title}</span>
                          <span className="month-row__meta">
                            <span>
                              {formatTimeOf(entry.start)}
                              {hasEnd(entry) && ` – ${formatTimeOf(end(entry))}`}
                            </span>
                            {look.location && (
                              <span className="days-row__where">
                                <PinIcon size={14} /> {look.location}
                              </span>
                            )}
                          </span>
                          {look.detail && <span className="days-row__where">{look.detail}</span>}
                        </span>
                        {tappable && <ChevronRightIcon size={18} className="days-row__chevron" />}
                      </>
                    );
                    return (
                      <li key={entry.key} className={`days-row month-row tag--${look.color ?? 'none'}`}>
                        {tappable ? (
                          <button type="button" className="days-row__button" onClick={() => open(entry)}>
                            {body}
                          </button>
                        ) : (
                          <div className="days-row__button">{body}</div>
                        )}
                        <button
                          type="button"
                          className="days-row__remove"
                          aria-label={`Delete ${look.title}`}
                          disabled={removing === entry.key}
                          onClick={(event) => {
                            event.stopPropagation();
                            void remove(entry);
                          }}
                        >
                          <TrashIcon size={18} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <BillLines lines={billsFor(start)} />
                <DayPlan date={start} today={today} items={data.items} range={rangeOf(start)} allowDelete />
              </section>
            );
          })()}
        </>
      )}

      {shape === 'year' && data && (
        <div className="year">
          {Array.from({ length: 12 }, (_, month) => {
            const first = `${start.slice(0, 4)}-${pad(month + 1)}-01`;
            const lead = new Date(`${first}T12:00:00`).getDay();
            const inMonth = data.days.filter(({ date }) => date.slice(0, 7) === first.slice(0, 7));
            return (
              <button
                key={first}
                type="button"
                className="year__month"
                onClick={() => {
                  setStart(first);
                  setMode('month');
                }}
              >
                <span className="year__name">{new Date(`${first}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span>
                <span className="year__days" aria-hidden="true">
                  {Array.from({ length: lead }, (_, i) => (
                    <span key={`lead-${i}`} />
                  ))}
                  {inMonth.map(({ date, entries }) => {
                    const timed = entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
                    const color = timed[0] ? entryLook(timed[0], data.patterns, data.sources, data.goals).color ?? 'none' : undefined;
                    const marked = timed.length > 0 || entries.some((entry) => entry.kind === 'allday');
                    return (
                      <span
                        key={date}
                        className={`year__day${marked ? ` year__day--marked tag--${color ?? 'none'}` : ''}${date === today ? ' year__day--today' : ''}`}
                      >
                        {Number(date.slice(8))}
                      </span>
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {adding && <AddEventSheet date={start} onClose={() => setAdding(false)} />}
      {changing && <DayChangeSheet target={changing} onClose={() => setChanging(null)} />}
    </div>
  );
}
