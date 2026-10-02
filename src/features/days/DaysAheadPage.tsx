import { useEffect, useRef, useState, type ComponentType } from 'react';
import { calendarSources, otherCalendars } from '../../app/calendars/otherCalendars';
import { useBackHandler } from '../../app/back/backStack';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService, scheduleService } from '../../app/services';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  ListIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
} from '../../components/icons/Icons';
import { ITEM_MINUTES } from '../../core/rhythm/openTime';
import { addDays, atTime } from '../../core/scheduling/dates';
import { formatLocalDay, formatTimeOf } from '../schedule/format';
import DayChangeSheet, { type DayChangeTarget } from '../today/DayChangeSheet';
import { buildDayTimeline, dayTitle } from '../today/timeline';
import AddEventSheet from './AddEventSheet';
import { entryLook, setDaysAheadOpening, takeDaysAheadOpening, type EntryIcon, type Timed } from './daysAhead';

export type DaysView = 'list' | 'calendar';

const WEEK = 7;
const HOUR_PX = 44;

const icons: Record<EntryIcon, ComponentType<{ size?: number }>> = {
  work: BriefcaseIcon,
  protected: ShieldIcon,
  item: ClockIcon,
  event: CalendarIcon,
};

function subscribeAll(listener: () => void) {
  const off = [lifeService.subscribe(listener), scheduleService.subscribe(listener), otherCalendars.subscribe(listener)];
  return () => off.forEach((unsubscribe) => unsubscribe());
}

const end = (entry: Timed) => (entry.kind === 'item' ? new Date(entry.start.getTime() + ITEM_MINUTES * 60_000) : entry.end);
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
  const { today } = usePersonalDay(useClock());
  const [opening] = useState(takeDaysAheadOpening);
  const [start, setStart] = useState(opening.start ?? today);
  const [calendarDays, setCalendarDays] = useState<3 | 7>(3);
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<DayChangeTarget | null>(null);
  const focusKey = opening.focusKey;
  useBackHandler(true, () => navigate('today'));

  const span = view === 'list' ? WEEK : calendarDays;
  const days = Array.from({ length: span }, (_, i) => addDays(start, i));
  const data = useServiceData(
    subscribeAll,
    async () => {
      const from = atTime(addDays(start, -1), '00:00');
      const until = atTime(addDays(start, span + 1), '00:00');
      const [items, patterns, occurrences] = await Promise.all([
        lifeService.list(),
        scheduleService.patterns(),
        scheduleService.occurrencesBetween(from, until),
      ]);
      const events = otherCalendars.eventsBetween(from, until);
      const sources = calendarSources();
      return {
        patterns,
        sources,
        days: days.map((date) => ({ date, entries: buildDayTimeline(date, occurrences, items, patterns, events) })),
      };
    },
    [start, span],
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
          if (!('start' in entry)) continue;
          earliest = Math.min(earliest, Math.max(0, (entry.start.getTime() - dayStart) / 3_600_000));
        }
      }
      const top = target && scroller.current.contains(target) ? target.offsetTop - HOUR_PX / 2 : (earliest - 0.5) * HOUR_PX;
      scroller.current.scrollTop = Math.max(0, top);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data === undefined, view, start, calendarDays]);

  const open = (entry: Timed) => {
    if (entry.kind === 'item') openItem(entry.item.id);
    else if (entry.kind === 'shift')
      setChanging({
        patternId: entry.occurrence.patternId,
        patternName: entry.occurrence.patternName,
        date: entry.occurrence.date,
        blocks: [{ start: hhmm(entry.start), end: hhmm(entry.end), label: entry.occurrence.label }],
      });
  };

  const step = view === 'list' ? WEEK : calendarDays;

  return (
    <div className="page days-page">
      <button type="button" className="back-link" onClick={() => navigate('today')}>
        <ArrowLeftIcon size={18} />
        Today
      </button>
      <header className="days-header">
        <div>
          <h1 className="page-header__title">Days ahead</h1>
          <p className="page-header__subtitle">Your upcoming days at a glance</p>
        </div>
        <button type="button" className="days-add" aria-label="Add" onClick={() => setAdding(true)}>
          <PlusIcon size={26} />
        </button>
      </header>

      <div className="segmented" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={view === 'list'} className="segmented__option" onClick={() => { setDaysAheadOpening({ start }); navigate('days'); }}>
          <ListIcon size={20} /> List
        </button>
        <button type="button" role="tab" aria-selected={view === 'calendar'} className="segmented__option" onClick={() => { setDaysAheadOpening({ start }); navigate('calendar'); }}>
          <CalendarIcon size={20} /> Calendar
        </button>
      </div>

      <div className="days-stepper">
        <button type="button" className="day-stepper__step" aria-label="Earlier" onClick={() => setStart(addDays(start, -step))}>
          <ChevronRightIcon size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        {view === 'calendar' ? (
          <div className="mini-segmented" role="group" aria-label="Days shown">
            <button type="button" aria-pressed={calendarDays === 3} onClick={() => setCalendarDays(3)}>
              3 days
            </button>
            <button type="button" aria-pressed={calendarDays === 7} onClick={() => setCalendarDays(7)}>
              7 days
            </button>
          </div>
        ) : (
          <span className="days-stepper__range">
            {formatLocalDay(days[0], { month: 'short', day: 'numeric' })} – {formatLocalDay(days[days.length - 1], { month: 'short', day: 'numeric' })}
          </span>
        )}
        <button type="button" className="day-stepper__step" aria-label="Later" onClick={() => setStart(addDays(start, step))}>
          <ChevronRightIcon size={18} />
        </button>
      </div>
      {start !== today && (
        <button type="button" className="text-link days-back" onClick={() => setStart(today)}>
          Back to today
        </button>
      )}

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
              {timed.length === 0 && allDay.length === 0 && <p className="days-day__empty">Nothing set.</p>}
              <ul className="days-list">
                {allDay.map((entry) => (
                  <li key={entry.key} className="days-allday">
                    All day · {entry.event.title}
                  </li>
                ))}
                {timed.map((entry) => {
                  const look = entryLook(entry, data.patterns, data.sources);
                  const Icon = icons[look.icon];
                  const tappable = entry.kind !== 'event';
                  const body = (
                    <>
                      <span className="days-row__time">
                        {formatTimeOf(entry.start)}
                        {entry.kind !== 'item' && <span className="days-row__until">{formatTimeOf(end(entry))}</span>}
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
            </section>
          );
        })}

      {view === 'calendar' && data && (
        <div className={`days-calendar${span === 7 ? " days-calendar--week" : ""}`} style={{ ['--days' as string]: String(span) }}>
          <div className="cal-head" aria-hidden="true">
            <span />
            {data.days.map(({ date }) => (
              <span key={date} className={date === today ? 'cal-head__day cal-head__day--today' : 'cal-head__day'}>
                {formatLocalDay(date, { weekday: span === 7 ? 'narrow' : 'short' })}
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
                      const look = entryLook(entry, data.patterns, data.sources);
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

      {adding && <AddEventSheet date={start} onClose={() => setAdding(false)} />}
      {changing && <DayChangeSheet target={changing} onClose={() => setChanging(null)} />}
    </div>
  );
}
