import { watchLocal } from '../../app/family/localChanges';
import type { Provider } from '../../core/providers';
import { addDays } from '../../core/scheduling/dates';
import { daysOf, entryTitle, nextUp, phaseOf, phaseText, sortTrips, type Booking, type PackItem, type PlanItem, type Trip } from '../core/model';

const clockText = (time?: string) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/*
 * A trip under way, or one starting within three days: its name, where it stands, the next thing on it and what is
 * left to pack. Never confirmation codes, documents or spending (manifest, poreia.home). The next thing follows the clock.
 */
export const poreiaHome: Provider<'home'> = {
  app: 'poreia',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['local:poreia:trip:', 'local:poreia:booking:', 'local:poreia:plan:', 'local:poreia:pack:'],
  async read(ctx) {
    const known = <T extends { id: string }>(list: T[]) => list.filter((record) => typeof record.id === 'string');
    const [trips, bookings, plans, packing] = await Promise.all([
      ctx.records<Trip>('local:poreia:trip:'),
      ctx.records<Booking>('local:poreia:booking:'),
      ctx.records<PlanItem>('local:poreia:plan:'),
      ctx.records<PackItem>('local:poreia:pack:'),
    ]);
    const { now: away, ahead } = sortTrips(known(trips), ctx.today);
    const trip = away[0] ?? ahead.find((each) => { const phase = phaseOf(each, ctx.today); return phase.kind === 'ahead' && phase.days <= 3; });
    if (!trip) return [];
    const clock = `${String(ctx.now.getHours()).padStart(2, '0')}:${String(ctx.now.getMinutes()).padStart(2, '0')}`;
    const next = nextUp(daysOf(trip, known(bookings).filter((each) => each.tripId === trip.id), known(plans).filter((each) => each.tripId === trip.id)), ctx.today, clock);
    const left = known(packing).filter((each) => each.tripId === trip.id && !each.packed).length;
    const nextText = next ? `${next.date === ctx.today ? clockText(next.entry.time) || 'Today' : next.date === addDays(ctx.today, 1) ? 'Tomorrow' : ''} ${entryTitle(next.entry)}`.trim() : undefined;
    return [
      {
        ref: { app: 'poreia', kind: 'trip', id: trip.id },
        group: 'attention',
        title: away[0] === trip ? `${trip.name} · ${phaseText(phaseOf(trip, ctx.today))}` : `${trip.name} ${phaseText(phaseOf(trip, ctx.today)).toLowerCase()}`,
        detail: [nextText, away[0] !== trip && left ? `${left} to pack` : undefined].filter(Boolean).join(' · '),
        open: `/poreia/?open=${encodeURIComponent(`trip:${trip.id}`)}`,
        icon: 'suitcase',
        swipe: { id: `trip:${trip.id}` },
        notForMe: 'trips',
      },
    ];
  },
  subscribe(listener) {
    const offs = ['poreia:trip:', 'poreia:booking:', 'poreia:plan:', 'poreia:pack:'].map((prefix) => watchLocal(prefix, listener));
    return () => offs.forEach((off) => off());
  },
  // The next thing on the trip moves by the minute.
  maxAgeMs: 60_000,
};
