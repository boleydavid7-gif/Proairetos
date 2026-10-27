import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { offerUndo, say } from '../../app/family/shell';
import { ChevronIcon, GripIcon, ShareIcon, WeekIcon } from '../../app/family/icons';
import { buildIcs } from '../../core/calendar/ics';
import SwipeItem from '../../app/family/SwipeItem';
import { daysBetween } from '../../core/scheduling/dates';
import type { PoreiaNav } from '../app/App';
import { bookings, newId, nowStamp, plans, settings } from '../app/state';
import { between, openStretches } from '../core/dayFit';
import { dayText, timeText } from '../app/ui';
import { tripEvents } from '../core/calendar';
import { daysOf, entryTitle, moveAmong, placeLine, planText, type DayEntry, type PlanItem, type Trip } from '../core/model';
import { Sym } from '../../lamplight/icons';
import RouteEmpty from './RouteEmpty';

/** One line of a day: its time, what it is and where; tapping opens the booking or the plan. */
export function AgendaRow({ entry, onOpen }: { entry: DayEntry; onOpen: () => void }) {
  const where = entry.kind === 'plan' ? entry.item.where : entry.ends ? undefined : [entry.booking.from, entry.booking.to].filter(Boolean).join(' → ') || entry.booking.address;
  return (
    <button type="button" className={`poreia-agenda__row${entry.kind === 'booking' ? ' poreia-agenda__row--booking' : ''}`} onClick={onOpen}>
      <span className="poreia-agenda__time">{timeText(entry.time) || '·'}</span>
      <span className="poreia-agenda__what">
        <span>{entryTitle(entry)}</span>
        {where && <span className="muted">{where}</span>}
      </span>
      <ChevronIcon size={16} />
    </button>
  );
}

export const openEntry = (nav: PoreiaNav, tripId: string, entry: DayEntry) => (entry.kind === 'plan' ? nav.go({ name: 'plan', id: entry.item.id }) : nav.go({ name: 'booking', tripId, id: entry.booking.id }));

/** The trip day by day: bookings land on their days by themselves; the person's own plans are added under each. */
export default function TripDays({ trip, nav }: { trip: Trip; nav: PoreiaNav }) {
  const theirBookings = bookings.use().filter((each) => each.tripId === trip.id);
  const theirPlans = plans.use().filter((each) => each.tripId === trip.id);
  const days = daysOf(trip, theirBookings, theirPlans);
  const unit = settings.use().temperature;
  const drag = useRef<{ id: string; list: PlanItem[]; startY: number; row: HTMLElement; others: { id: string; mid: number }[]; to: number }>(undefined);
  if (!trip.start)
    return (
      <RouteEmpty glyph="calendar" title="No dates yet" line="Give the trip dates to plan it day by day.">
        <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'trip-form', id: trip.id })}>
          Add dates
        </button>
      </RouteEmpty>
    );

  const untimed = (entries: DayEntry[]) => entries.flatMap((entry) => (entry.kind === 'plan' && !entry.item.time ? [entry.item] : []));
  const reorder = (list: PlanItem[], id: string, to: number) => {
    const next = moveAmong(list, id, to);
    if (next.every((item, index) => item.id === list[index].id)) return;
    next.forEach((item) => plans.put({ ...item, updatedAt: nowStamp() }));
    const moved = list.find((item) => item.id === id)!;
    offerUndo(`“${moved.title}” moved`, () => list.forEach((item) => plans.put(item)));
  };

  // Pulling a plan by its grip: the row follows the finger, and where it is let go sets its place among the day's untimed plans.
  const startDrag = (event: PointerEvent<HTMLButtonElement>, item: PlanItem, list: PlanItem[]) => {
    const row = event.currentTarget.closest('li');
    const day = event.currentTarget.closest('ul');
    if (!row || !day) return;
    // The grip's own gesture: the row's pull-to-delete underneath leaves it alone.
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const others = [...day.querySelectorAll<HTMLElement>('[data-untimed]')]
      .filter((grip) => grip.dataset.untimed !== item.id)
      .map((grip) => {
        const box = grip.closest('li')!.getBoundingClientRect();
        return { id: grip.dataset.untimed!, mid: box.top + box.height / 2 };
      });
    drag.current = { id: item.id, list, startY: event.clientY, row, others, to: list.findIndex((each) => each.id === item.id) };
    row.classList.add('is-dragging');
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const now = drag.current;
    if (!now) return;
    event.stopPropagation();
    now.row.style.transform = `translateY(${event.clientY - now.startY}px)`;
    now.to = now.others.filter((other) => other.mid < event.clientY).length;
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const now = drag.current;
    if (!now) return;
    event.stopPropagation();
    drag.current = undefined;
    now.row.style.transform = '';
    now.row.classList.remove('is-dragging');
    reorder(now.list, now.id, now.to);
  };
  const stepWith = (event: KeyboardEvent<HTMLButtonElement>, item: PlanItem, list: PlanItem[]) => {
    const at = list.findIndex((each) => each.id === item.id);
    if (event.key === 'ArrowUp' && at > 0) reorder(list, item.id, at - 1);
    else if (event.key === 'ArrowDown' && at < list.length - 1) reorder(list, item.id, at + 1);
    else return;
    event.preventDefault();
  };

  const toCalendar = () => {
    const text = buildIcs(tripEvents(trip, theirBookings, theirPlans), { name: trip.name, now: new Date() });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${trip.name.replace(/[^\w -]+/g, '').trim().slice(0, 40) || 'trip'}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    const text = planText(trip, days, dayText, timeText);
    try {
      if (navigator.share) await navigator.share({ title: trip.name, text });
      else {
        await navigator.clipboard.writeText(text);
        say('Plan copied');
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="poreia-days">
      {days.some((day) => day.entries.length) && (
        <div className="button-row">
          <button type="button" className="button-quiet" onClick={share}>
            <ShareIcon size={18} />
            Share the plan
          </button>
          <button type="button" className="button-quiet" onClick={toCalendar}>
            <WeekIcon size={18} />
            Add to your calendar
          </button>
        </div>
      )}
      {days.map(({ date, entries }) => {
        const loose = untimed(entries);
        const open = openStretches(entries);
        return (
          <section key={date} className="poreia-day" id={`day-${date}`}>
            <h2 className="poreia-day__head">
              <span>
                {dayText(date)}
                {placeLine(trip, date) && <span className="poreia-day__place">{placeLine(trip, date)}</span>}
              </span>
              {date >= trip.start! && date <= (trip.end ?? trip.start!) && <span className="muted">Day {daysBetween(trip.start!, date) + 1}</span>}
            </h2>
            <ul className="poreia-agenda">
              {entries.map((entry, index) => (
                <Fragment key={entry.kind === 'plan' ? entry.item.id : `${entry.booking.id}-${index}`}>
                {entry.kind === 'plan' ? (
                  <SwipeItem
                    className="poreia-agenda__plan"
                    label="Delete"
                    tone="remove"
                    onSwipe={() => {
                      const item = entry.item;
                      plans.remove(item.id);
                      offerUndo(`“${item.title}” deleted`, () => plans.put(item));
                    }}
                  >
                    {!entry.item.time && loose.length > 1 && (
                      <button
                        type="button"
                        className="poreia-grip"
                        data-untimed={entry.item.id}
                        data-menu-skip
                        aria-label={`Move ${entry.item.title}`}
                        aria-keyshortcuts="ArrowUp ArrowDown"
                        onPointerDown={(event) => startDrag(event, entry.item, loose)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onKeyDown={(event) => stepWith(event, entry.item, loose)}
                      >
                        <GripIcon size={20} />
                      </button>
                    )}
                    <AgendaRow entry={entry} onOpen={() => openEntry(nav, trip.id, entry)} />
                  </SwipeItem>
                ) : (
                  <li>
                    <AgendaRow entry={entry} onOpen={() => openEntry(nav, trip.id, entry)} />
                  </li>
                )}
                <Between entries={entries} index={index} open={open} unit={unit} />
                </Fragment>
              ))}
            </ul>
            <AddToDay tripId={trip.id} date={date} />
          </section>
        );
      })}
    </div>
  );
}

/** A quiet "Add a plan" under each day, opening to a field and a time only when tapped. */
export function AddToDay({ tripId, date }: { tripId: string; date: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  if (!open) {
    return (
      <button type="button" className="poreia-add-day__open" onClick={() => setOpen(true)}>
        <Sym name="plus" size={18} />
        Add a plan
      </button>
    );
  }
  return (
    <form
      className="add-line poreia-add-day"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        const item: PlanItem = { id: newId(), tripId, date, time: time || undefined, title: title.trim(), createdAt: nowStamp(), updatedAt: nowStamp() };
        plans.put(item);
        setTitle('');
        setTime('');
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <input ref={field} className="input" value={title} placeholder="Add a plan" aria-label={`Add to ${dayText(date)}`} onChange={(event) => setTitle(event.target.value)} />
      <input className="input poreia-add-day__time" type="time" value={time} aria-label="Time" onChange={(event) => setTime(event.target.value)} />
      <button type="submit" className="button-quiet" disabled={!title.trim()}>
        Add
      </button>
      <button type="button" className="poreia-add-day__close" aria-label="Close" onClick={() => setOpen(false)}>
        <Sym name="close" size={18} />
      </button>
    </form>
  );
}

/** What lies between one entry and the next: a walk between two placed plans, or a stretch with nothing set. */
function Between({ entries, index, open, unit }: { entries: DayEntry[]; index: number; open: Map<number, { from: string; to: string }>; unit: 'C' | 'F' }) {
  const next = entries[index + 1];
  if (!next) return null;
  const walk = between(entries[index], next, unit);
  const gap = open.get(index);
  if (!walk && !gap) return null;
  return (
    <li className="poreia-agenda__between">
      {[walk, gap && `Nothing set ${timeText(gap.from)}–${timeText(gap.to)}`].filter(Boolean).join(' · ')}
    </li>
  );
}
