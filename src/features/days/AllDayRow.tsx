import { isAppOwned } from '../../app/providers/calendarView';
import type { CalendarEvent } from '../../app/calendars/otherCalendars';
import { ChevronRightIcon, TrashIcon } from '../../components/icons/Icons';

/** An all-day span an app owns is one link to its record and has no Delete; an imported calendar's keeps its Delete with undo. */
export default function AllDayRow({ event, busy, onRemove }: { event: CalendarEvent; busy: boolean; onRemove: () => void }) {
  if (isAppOwned(event)) {
    return (
      <li className="days-allday days-allday--link">
        <a className="days-allday__text" href={event.open}>
          All day · {event.title}
          <ChevronRightIcon size={18} className="days-row__chevron" />
        </a>
      </li>
    );
  }
  return (
    <li className="days-allday">
      <span className="days-allday__text">All day · {event.title}</span>
      <button type="button" className="days-allday__remove" aria-label={`Delete ${event.title}`} disabled={busy} onClick={onRemove}>
        <TrashIcon size={18} />
      </button>
    </li>
  );
}
