import { useEffect, useState } from 'react';
import { countHours } from '../app/proairetos';
import { bookings, settings, spends, timeOff, trips } from '../app/state';
import { moneyText, type Money } from '../core/model';
import { hoursText, leftAfter } from '../core/timeOff';
import { yearTrips } from '../core/yearBudget';

/**
 * The year's travel budget beside the trips starting that year (each at its budget, or what it cost when more). In the
 * trip form, `except` leaves out the trip being edited and `adding` is its budget as typed.
 */
export function YearBudgetLine({ year, except, adding, label }: { year: number; except?: string; adding?: Money; label?: string }) {
  const budget = settings.use().yearBudget;
  const list = trips.use();
  const theirBookings = bookings.use();
  const theirSpends = spends.use();
  const rates: Record<string, number> = {};
  if (!budget) return null;

  const others = yearTrips(list, theirBookings, theirSpends, year, budget.currency, rates, except);
  const own = adding?.cents ? (adding.currency === budget.currency ? adding.cents : rates[adding.currency] ? Math.round(adding.cents * rates[adding.currency]) : 0) : 0;
  const used = others.cents + own;
  const money = (cents: number) => moneyText({ cents, currency: budget.currency });
  const rest = used <= budget.cents ? `${money(budget.cents - used)} left${own ? ' with this one' : ''}` : `${money(used - budget.cents)} over${own ? ' with this one' : ''}`;
  return (
    <p className="muted poreia-reference">
      {label ?? (except !== undefined || adding ? `Other trips in ${year}` : `Trips in ${year}`)}: {money(others.cents)} of {money(budget.cents)} · {rest}
    </p>
  );
}

/** Hours a stretch of days takes from work, and the balance it leaves; a trip's own planned time off counts once. */
export function TimeOffLine({ start, end, tripId }: { start?: string; end?: string; tripId?: string }) {
  const setup = settings.use().timeOff;
  const offs = timeOff.use();
  const [needed, setNeeded] = useState<number>();
  useEffect(() => {
    setNeeded(undefined);
    if (!start) return;
    let live = true;
    void countHours(start, end ?? start)
      .then((counted) => {
        if (!live) return;
        setNeeded(counted.hours);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [start, end]);
  if (!start || needed === undefined) return null;
  if (needed === 0)
    return (
      <>
        <p className="muted poreia-reference">No work in these dates.</p>
      </>
    );
  const linked = tripId ? offs.find((off) => off.tripId === tripId && off.status !== 'canceled') : undefined;
  const left = setup ? leftAfter(setup, offs, { id: linked?.id ?? 'new', start, hours: needed }).after : undefined;
  return (
    <>
      <p className="muted poreia-reference">
        Takes {hoursText(needed)} of time off{left !== undefined ? ` · ${hoursText(left)} left after` : ''}
      </p>
    </>
  );
}

/** Kept as a compatibility surface for older trip records; local-first time-off counting currently returns none. */
export function HolidaysLine({ days }: { days: readonly { name: string; date: string }[] }) {
  return days.length ? <p className="fine poreia-reference">{days.map((day) => `${day.name}, ${day.date}`).join('; ')}</p> : null;
}
