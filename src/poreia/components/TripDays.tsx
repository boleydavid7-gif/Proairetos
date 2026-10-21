import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import SwipeItem from '../../app/family/SwipeItem';
import { daysBetween } from '../../core/scheduling/dates';
import { bookings, newId, nowStamp, plans } from '../app/state';
import { dayText, timeText } from '../app/ui';
import { daysOf, entryTitle, type PlanItem, type Trip } from '../core/model';

/** The trip day by day: bookings land on their days by themselves; the person's own plans are added under each. */
export default function TripDays({ trip }: { trip: Trip }) {
  const theirBookings = bookings.use().filter((each) => each.tripId === trip.id);
  const theirPlans = plans.use().filter((each) => each.tripId === trip.id);
  const days = daysOf(trip, theirBookings, theirPlans);
  if (!trip.start) return <p className="muted">Give the trip dates to plan it day by day.</p>;
  return (
    <div className="poreia-days">
      {days.map(({ date, entries }) => (
        <section key={date} className="poreia-day">
          <h2 className="poreia-day__head">
            <span>{dayText(date)}</span>
            {date >= trip.start! && date <= (trip.end ?? trip.start!) && <span className="muted">Day {daysBetween(trip.start!, date) + 1}</span>}
          </h2>
          <ul className="poreia-agenda">
            {entries.map((entry, index) =>
              entry.kind === 'plan' ? (
                <SwipeItem
                  key={entry.item.id}
                  className="poreia-agenda__plan"
                  label="Delete"
                  tone="remove"
                  onSwipe={() => {
                    const item = entry.item;
                    plans.remove(item.id);
                    offerUndo(`“${item.title}” deleted`, () => plans.put(item));
                  }}
                >
                  <span className="poreia-agenda__time">{timeText(entry.time) || '·'}</span>
                  <span>
                    {entry.item.title}
                    {entry.item.where && <span className="muted"> · {entry.item.where}</span>}
                  </span>
                </SwipeItem>
              ) : (
                <li key={`${entry.booking.id}-${index}`} className="poreia-agenda__booking">
                  <span className="poreia-agenda__time">{timeText(entry.time) || '·'}</span>
                  <span>{entryTitle(entry)}</span>
                </li>
              ),
            )}
          </ul>
          <AddToDay tripId={trip.id} date={date} />
        </section>
      ))}
    </div>
  );
}

function AddToDay({ tripId, date }: { tripId: string; date: string }) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
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
      }}
    >
      <input className="input" value={title} placeholder="Add to this day" aria-label={`Add to ${dayText(date)}`} onChange={(event) => setTitle(event.target.value)} />
      <input className="input poreia-add-day__time" type="time" value={time} aria-label="Time (optional)" onChange={(event) => setTime(event.target.value)} />
      <button type="submit" className="button-quiet" disabled={!title.trim()}>
        Add
      </button>
    </form>
  );
}
