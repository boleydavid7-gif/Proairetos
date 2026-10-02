import { useEffect, useRef, useState, type ComponentType } from 'react';
import { calendarSources, otherCalendars } from '../../app/calendars/otherCalendars';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useTodayParts } from '../../app/hooks/useTodayParts';
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
  ListIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
} from '../../components/icons/Icons';
import { itemSpan } from '../../core/rhythm/openTime';
import { addDays, atTime } from '../../core/scheduling/dates';
import { formatLocalDay, formatTimeOf } from '../schedule/format';
import DayChangeSheet, { type DayChangeTarget } from '../today/DayChangeSheet';
import { buildDayTimeline, dayTitle } from '../today/timeline';
import { planFor } from '../plan/planView';
import AddEventSheet from './AddEventSheet';
import DayPlan from './DayPlan';
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
export default function DaysAheadPage({ view }: { view: DaysView }) {
  const navigate = useNavigate();
  const { openItem } = useOverlays();
  const { today, rangeOf } = usePersonalDay(useClock());
  const [sorting, setSorting] = useState(false);
  const shows = useTodayParts();
  const [opening] = useState(takeDaysAheadOpening);
  const [start, setStart] = useState(opening.start ?? today);
  const [mode, setMode] = useState<CalendarMode>('week');
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<DayChangeTarget | null>(null);
  const focusKey = opening.focusKey;

  const shape: 'list' | CalendarMode = view === 'list' ? 'list' : mode;
  const days =
    shape === 'month'
      ? Array.from({ length: monthCells(start) }, (_, i) => addDays(sundayOnOrBefore(monthStart(start)), i))
      : shape === 'year'
        ? daysBetweenInclusive(yearStart(start), `${start.slice(0, 4)}-12-31`)
        : Array.from({ length: WEEK }, (_, i) => addDays(start, i));
  const span = days.length;
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
      let earliest = 7;
      for (const day of data?.days ?? []) {
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
  }, [data?.days[0]?.date, data?.days.length, view, mode]);

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
            <section key={date} className="days-day" aria-label={formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}>
              <h2 className="days-day__title">
                {dayTitle(date, today)}
                <span className="days-day__date">{formatLocalDay(date, { month: 'short', day: 'numeric' })}</span>
              </h2>
              {timed.length === 0 && allDay.length === 0 && !hasPlan(date) && <p className="days-day__empty">Nothing set.</p>}
              <ul className="days-list">
                {allDay.map((entry) => (
                  <li key={entry.key} className="days-allday">
                    All day · {entry.event.title}
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
                    </li>
                  );
                })}
              </ul>
              <DayPlan date={date} today={today} items={data.items} range={rangeOf(date)} />
            </section>
          );
        })}

      {shape === 'week' && data && (
        <div className={`days-calendar${" days-calendar--week"}`} style={{ ['--days' as string]: String(span) }}>
          <div className="cal-head" aria-hidden="true">
            <span />
            {data.days.map(({ date }) => (
              <span key={date} className={date === today ? 'cal-head__day cal-head__day--today' : 'cal-head__day'}>
                {formatLocalDay(date, { weekday: 'narrow' })}
                <strong>{formatLocalDay(date, { day: 'numeric' })}</strong>
              </span>
            ))}
          </div>
          <div ref={scroller} className="cal-scroll">
            <div className="cal-grid" style={{ height: 24 * HOUR_PX }}>
              <div className="cal-hours" aria-hidden="true">
                {Array.from({ length: 24 }, (_, hour) => (
                  <span key={hour} style={{ top: hour * HOUR_PX }}>
                    {hour === 0 ? '' : formatTimeOf(atTime(today, `${pad(hour)}:00`)).replace(':00', '')}
                  </span>
                ))}
              </div>
              {data.days.map(({ date, entries }) => {
                const dayStart = atTime(date, '00:00').getTime();
                const dayEnd = atTime(addDays(date, 1), '00:00').getTime();
                const timed = entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
                return (
                  <div key={date} className="cal-col" role="list" aria-label={formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}>
                    {timed.map((entry) => {
                      const look = entryLook(entry, data.patterns, data.sources, data.goals);
                      const from = Math.max(entry.start.getTime(), dayStart);
                      const until = Math.min(end(entry).getTime(), dayEnd);
                      const style = {
                        top: ((from - dayStart) / 3_600_000) * HOUR_PX,
                        height: Math.max(((until - from) / 3_600_000) * HOUR_PX, 22),
                      };
                      const layer = entry.kind === 'shift' ? 'block' : 'point';
                      const className = `cal-entry cal-entry--${layer} tag--${look.color ?? 'none'}${entry.key === focusKey ? ' cal-entry--focus' : ''}`;
                      const label = `${look.title}, ${formatTimeOf(entry.start)}`;
                      return entry.kind === 'event' ? (
                        <div key={entry.key} role="listitem" className={className} style={style} aria-label={label}>
                          {look.title}
                        </div>
                      ) : (
                        <button
                          key={entry.key}
                          ref={markRef(entry.key)}
                          type="button"
                          role="listitem"
                          className={className}
                          style={style}
                          aria-label={label}
                          onClick={() => open(entry)}
                        >
                          {look.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
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
                {count === 0 && !hasPlan(start) && <p className="days-day__empty">Nothing set.</p>}
                <ul className="days-list">
                  {allDay.map((entry) => (
                    <li key={entry.key} className="days-allday">
                      All day · {entry.event.title}
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
                      </li>
                    );
                  })}
                </ul>
                <DayPlan date={start} today={today} items={data.items} range={rangeOf(start)} />
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
