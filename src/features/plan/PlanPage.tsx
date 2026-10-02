import { useState } from 'react';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';
import { ChevronRightIcon } from '../../components/icons/Icons';
import CheckRow from '../items/CheckRow';
import { describeRule } from '../../core/life-items/repeat';
import PageHeader from '../../components/layout/PageHeader';
import { addDays, atTime } from '../../core/scheduling/dates';
import { otherCalendars } from '../../app/calendars/otherCalendars';
import { formatLocalDay, formatTimeOf } from '../schedule/format';
import { dayTitle } from '../today/timeline';
import AddTaskSheet from './AddTaskSheet';
import GentleLine from '../../components/ui/GentleLine';
import { planFor } from './planView';
import QuickSortSheet, { sortable } from '../capture/QuickSortSheet';

export default function PlanPage() {
  const clock = useClock();
  const { today, rangeOf } = usePersonalDay(clock);
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const [sorting, setSorting] = useState(false);
  const date = addDays(today, offset);
  const items = useServiceData(lifeService.subscribe, () => lifeService.list());
  const calendarEvents =
    useServiceData(
      otherCalendars.subscribe,
      async () =>
        otherCalendars
          .eventsBetween(atTime(date, '00:00'), atTime(addDays(date, 1), '00:00'))
          .filter((event) => !event.allDay || (event.allDay.from <= date && date < event.allDay.until)),
      [date],
    ) ?? [];
  if (!items) return null;
  const sections = planFor(date, today, items, rangeOf(date));

  return (
    <div className="page">
      <PageHeader title="Plan" subtitle="A calmer day is a more intentional day." settings />

      <div className="date-card">
        <button type="button" className="day-stepper__step" aria-label="Previous day" onClick={() => setOffset(offset - 1)}>
          <ChevronRightIcon size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button type="button" className="date-card__text" onClick={() => setOffset(0)} aria-label="Back to today">
          <span className="date-card__title">{dayTitle(date, today)}</span>
          <span className="date-card__date">{formatLocalDay(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </button>
        <button type="button" className="day-stepper__step" aria-label="Next day" onClick={() => setOffset(offset + 1)}>
          <ChevronRightIcon size={20} />
        </button>
      </div>

      {offset === 0 && sortable(items, today).length > 1 && (
        <button type="button" className="quiet-row" onClick={() => setSorting(true)}>
          <span className="quiet-row__text">
            <span>Sort through your list</span>
            <span className="quiet-row__detail">One at a time: today, later, or let it go.</span>
          </span>
          <ChevronRightIcon size={18} className="quiet-row__chevron" />
        </button>
      )}
      {sorting && <QuickSortSheet items={items} today={today} onClose={() => setSorting(false)} />}

      {calendarEvents.length > 0 && (
        <section className="plan-section" aria-label="From your calendars">
          <h2 className="section-label">From your calendars</h2>
          <ul className="calendar-events">
            {calendarEvents.map((event) => (
              <li key={event.key} className="calendar-events__row">
                <span className="calendar-events__time">
                  {event.allDay ? 'All day' : `${formatTimeOf(event.start)}–${formatTimeOf(event.end)}`}
                </span>
                <span className="calendar-events__text">
                  <span>{event.title}</span>
                  <span className="calendar-events__source">{event.source}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.id} className="plan-section" aria-label={section.label}>
          <h2 className="section-label">{section.label}</h2>
          <ul className="check-list">
            {section.open.map((item) => (
              <CheckRow key={item.id} item={item} done={false} detail={item.repeat && item.checklist ? `Comes back ${describeRule(item.repeat).toLowerCase()}` : undefined} />
            ))}
            {section.done.map((item) => (
              <CheckRow key={item.id} item={item} done />
            ))}
          </ul>
        </section>
      ))}

      {sections.length === 0 && (
        <div>
          <p className="empty-note">Nothing planned for {offset === 0 ? 'today' : 'this day'}. Add something if you like.</p>
          <GentleLine />
        </div>
      )}

      <button type="button" className="button-accent button-accent--wide" onClick={() => setAdding(true)}>
        + Add task
      </button>

      {adding && <AddTaskSheet date={date} onClose={() => setAdding(false)} />}
    </div>
  );
}
