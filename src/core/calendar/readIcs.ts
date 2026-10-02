import ICAL from 'ical.js';

/** An event from someone's other calendar. Read-only: Proairetos shows it and never changes it. */
export type ExternalEvent = {
  /** Stable per occurrence, so lists keep their place. */
  key: string;
  title: string;
  start: Date;
  end: Date;
  /** All-day events carry local dates instead of times. */
  allDay?: { from: string; until: string };
  location?: string;
};

const MAX_OCCURRENCES_PER_EVENT = 400;

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (t: ICAL.Time) => `${t.year}-${pad(t.month)}-${pad(t.day)}`;

/**
 * Reads an iCalendar file (from Google, Apple, Outlook, or any calendar) and
 * returns the events that overlap the range: repeats expanded, skipped and
 * cancelled ones left out, time zones respected.
 */
export function readIcs(text: string, range: { start: Date; end: Date }): ExternalEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const zone of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(zone);

  const events: ExternalEvent[] = [];
  const overlaps = (start: Date, end: Date) => start < range.end && end > range.start;
  const vevents = root.getAllSubcomponents('vevent');
  // Moved or edited single occurrences of a repeating event (RECURRENCE-ID) replace the original.
  const exceptions = vevents.filter((v) => v.hasProperty('recurrence-id'));

  for (const vevent of vevents) {
    if (vevent.hasProperty('recurrence-id')) continue;
    const event = new ICAL.Event(vevent);
    for (const exception of exceptions) {
      if (exception.getFirstPropertyValue('uid') === event.uid) event.relateException(new ICAL.Event(exception));
    }
    if (String(vevent.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') continue;

    const add = (start: ICAL.Time, end: ICAL.Time, item: ICAL.Event) => {
      if (String(item.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') return;
      const allDay = start.isDate;
      const startDate = start.toJSDate();
      const endDate = end.toJSDate();
      if (!overlaps(startDate, endDate > startDate ? endDate : new Date(startDate.getTime() + 1))) return;
      events.push({
        key: `${event.uid}:${start.toString()}`,
        title: item.summary || 'Busy',
        start: startDate,
        end: endDate > startDate ? endDate : startDate,
        ...(allDay ? { allDay: { from: localDate(start), until: localDate(end) } } : {}),
        ...(item.location ? { location: item.location } : {}),
      });
    };

    if (event.isRecurring()) {
      const iterator = event.iterator();
      for (let i = 0, next = iterator.next(); next && i < MAX_OCCURRENCES_PER_EVENT * 10; i++, next = iterator.next()) {
        if (next.toJSDate() >= range.end) break;
        const details = event.getOccurrenceDetails(next);
        add(details.startDate, details.endDate, details.item);
      }
    } else {
      add(event.startDate, event.endDate ?? event.startDate, event);
    }
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}
