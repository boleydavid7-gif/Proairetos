import { useEffect, useRef, useState } from 'react';
import { otherCalendars } from '../../app/calendars/otherCalendars';
import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService, scheduleService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { ITEM_MINUTES } from '../../core/rhythm/openTime';
import { addDays, atTime } from '../../core/scheduling/dates';
import { formatLocalDay, formatTimeOf } from '../schedule/format';
import type { DayChangeTarget } from './DayChangeSheet';
import { blockTitle, buildDayTimeline, dayTitle, type TimelineEntry } from './timeline';

type View = 'list' | 'calendar';

type Props = {
  today: string;
  /** The first day shown; the day the person was looking at. */
  start: string;
  /** The entry tapped on Today, shown and marked when the sheet opens. */
  focusKey?: string;
  onClose: () => void;
  onOpenItem: (id: string) => void;
  onChangeDay: (target: DayChangeTarget) => void;
};

const LIST_DAYS = 7;
const CALENDAR_DAYS = 3;
const HOUR_PX = 44;

function subscribeAll(listener: () => void) {
  const off = [lifeService.subscribe(listener), scheduleService.subscribe(listener), otherCalendars.subscribe(listener)];
  return () => off.forEach((unsubscribe) => unsubscribe());
}

type Timed = Exclude<TimelineEntry, { kind: 'off' } | { kind: 'allday' }>;

function entryTitle(entry: Timed): string {
  if (entry.kind === 'shift') return blockTitle(entry.occurrence);
  if (entry.kind === 'event') return entry.event.title;
  return entry.item.title;
}

function entryEnd(entry: Timed): Date {
  return entry.kind === 'item' ? new Date(entry.start.getTime() + ITEM_MINUTES * 60_000) : entry.end;
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * The days ahead, as a list or as a three-day calendar. Shows what is
 * already there: commitments, set times, and calendar events. Nothing is
 * added or arranged here unless the person taps something to change it.
 */
export default function AgendaSheet({ today, start: firstDay, focusKey, onClose, onOpenItem, onChangeDay }: Props) {
  const { dialog, panel, close } = useSheet();
  const [view, setView] = useState<View>('list');
  const [listDays, setListDays] = useState(LIST_DAYS);
  const [from, setFrom] = useState(firstDay);
  const span = view === 'list' ? listDays : CALENDAR_DAYS;
  const first = view === 'list' ? firstDay : from;
  const days = Array.from({ length: span }, (_, i) => addDays(first, i));

  const data = useServiceData(
    subscribeAll,
    async () => {
      const start = atTime(addDays(first, -1), '00:00');
      const end = atTime(addDays(first, span + 1), '00:00');
      const [items, patterns, occurrences] = await Promise.all([
        lifeService.list(),
        scheduleService.patterns(),
        scheduleService.occurrencesBetween(start, end),
      ]);
      const events = otherCalendars.eventsBetween(start, end);
      return days.map((date) => ({ date, entries: buildDayTimeline(date, occurrences, items, patterns, events) }));
    },
    [first, span],
  );

  const focused = useRef<HTMLElement | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = focused.current;
    if (view === 'list') {
      if (target && panel.current) panel.current.scrollTop = target.offsetTop - panel.current.clientHeight / 3;
    } else if (scroller.current) {
      // The calendar opens at the tapped entry if it is in view, else at the morning.
      const top = target && scroller.current.contains(target) ? target.offsetTop - HOUR_PX : 7 * HOUR_PX;
      scroller.current.scrollTop = Math.max(0, top);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data === undefined, view, from]);

  const open = (entry: TimelineEntry) => {
    if (entry.kind === 'item') onOpenItem(entry.item.id);
    else if (entry.kind === 'shift')
      onChangeDay({
        patternId: entry.occurrence.patternId,
        patternName: entry.occurrence.patternName,
        date: entry.occurrence.date,
        blocks: [{ start: hhmm(entry.start), end: hhmm(entry.end), label: entry.occurrence.label }],
      });
  };
  focused.current = null;
  const markRef = (key: string) => (element: HTMLElement | null) => {
    if (key === focusKey && element) focused.current = element;
  };

  return (
    <dialog
      ref={dialog}
      className="sheet sheet--tall"
      aria-label="Days ahead"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className={`sheet__panel${view === 'calendar' ? ' sheet__panel--still' : ''}`}>
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">Days ahead</p>
        <div className="segmented" role="tablist" aria-label="View">
          {(['list', 'calendar'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              className="segmented__option"
              onClick={() => setView(option)}
            >
              {option === 'list' ? 'List' : 'Calendar'}
            </button>
          ))}
        </div>

        {view === 'list' && data && (
          <>
            {data.map(({ date, entries }) => {
              const timed = entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
              const allDay = entries.filter((entry) => entry.kind === 'allday');
              return (
                <section key={date} className="agenda-day" aria-label={formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })}>
                  <h3 className="agenda-day__title">
                    {dayTitle(date, today)}
                    <span className="agenda-day__date">{formatLocalDay(date, { month: 'short', day: 'numeric' })}</span>
                  </h3>
                  {timed.length === 0 && allDay.length === 0 && <p className="agenda-day__empty">Nothing set.</p>}
                  <ul className="agenda-list">
                    {allDay.map((entry) =>
                      entry.kind === 'allday' ? (
                        <li key={entry.key} className="agenda-row agenda-row--quiet">
                          <span className="agenda-row__time">All day</span>
                          <span className="agenda-row__title">{entry.event.title}</span>
                        </li>
                      ) : null,
                    )}
                    {timed.map((entry) => {
                      const tappable = entry.kind !== 'event';
                      const content = (
                        <>
                          <span className="agenda-row__time">
                            {formatTimeOf(entry.start)}
                            {entry.kind !== 'item' && <span className="agenda-row__until">{formatTimeOf(entryEnd(entry))}</span>}
                          </span>
                          <span className="agenda-row__title">
                            {entryTitle(entry)}
                            {entry.kind === 'event' && <span className="agenda-row__source">{entry.event.source}</span>}
                          </span>
                        </>
                      );
                      return (
                        <li
                          key={entry.key}
                          ref={markRef(entry.key)}
                          className={`agenda-row agenda-row--${entry.kind === 'shift' ? entry.occurrence.kind.toLowerCase() : entry.kind}${entry.key === focusKey ? ' agenda-row--focus' : ''}`}
                        >
                          {tappable ? (
                            <button type="button" className="agenda-row__button" onClick={() => open(entry)}>
                              {content}
                            </button>
                          ) : (
                            <div className="agenda-row__button">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            <button type="button" className="text-link" onClick={() => setListDays(listDays + LIST_DAYS)}>
              Show the next week too
            </button>
          </>
        )}

        {view === 'calendar' && data && (
          <>
            <div className="agenda-stepper">
              <button type="button" className="day-stepper__step" aria-label="Earlier days" onClick={() => setFrom(addDays(from, -CALENDAR_DAYS))}>
                <ChevronRightIcon size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button type="button" className="text-link" onClick={() => setFrom(today)}>
                {from === today ? 'From today' : 'Back to today'}
              </button>
              <button type="button" className="day-stepper__step" aria-label="Later days" onClick={() => setFrom(addDays(from, CALENDAR_DAYS))}>
                <ChevronRightIcon size={18} />
              </button>
            </div>
            <div className="cal-head" aria-hidden="true">
              <span />
              {data.map(({ date }) => (
                <span key={date} className={date === today ? 'cal-head__day cal-head__day--today' : 'cal-head__day'}>
                  {formatLocalDay(date, { weekday: 'short' })}
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
                {data.map(({ date, entries }) => {
                  const dayStart = atTime(date, '00:00').getTime();
                  const dayEnd = atTime(addDays(date, 1), '00:00').getTime();
                  const timed = entries.filter((entry): entry is Timed => entry.kind !== 'off' && entry.kind !== 'allday');
                  return (
                    <div key={date} className="cal-col" aria-label={formatLocalDay(date, { weekday: 'long', month: 'long', day: 'numeric' })} role="list">
                      {timed.map((entry) => {
                        const start = Math.max(entry.start.getTime(), dayStart);
                        const end = Math.min(entryEnd(entry).getTime(), dayEnd);
                        // Blocks fill the column; items and events lie over them, a little narrower, so both stay readable.
                        const layer = entry.kind === 'shift' ? 'block' : 'point';
                        const style = {
                          top: ((start - dayStart) / 3_600_000) * HOUR_PX,
                          height: Math.max(((end - start) / 3_600_000) * HOUR_PX, 22),
                        };
                        const label = `${entryTitle(entry)}, ${formatTimeOf(entry.start)}`;
                        const className = `cal-entry cal-entry--${layer} cal-entry--${entry.kind === 'shift' ? entry.occurrence.kind.toLowerCase() : entry.kind}${entry.key === focusKey ? ' cal-entry--focus' : ''}`;
                        return entry.kind === 'event' ? (
                          <div key={entry.key} role="listitem" className={className} style={style} aria-label={label}>
                            {entryTitle(entry)}
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
                            {entryTitle(entry)}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
