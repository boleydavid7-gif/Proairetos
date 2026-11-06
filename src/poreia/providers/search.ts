import { present, type Provider } from '../../core/providers';
import { watchLocal } from '../../app/family/localChanges';
import { kindLabel, type Booking, type PlanItem, type Trip } from '../core/model';

/*
 * Trips, bookings and plans: names and titles, places, providers, addresses and the person's notes. Not confirmation
 * codes, travel documents, spending or loyalty numbers (manifest, poreia.search).
 */
export const poreiaSearch: Provider<'search'> = {
  app: 'poreia',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['local:poreia:trip:', 'local:poreia:booking:', 'local:poreia:plan:'],
  async read(ctx) {
    const [trips, bookings, plans] = await Promise.all([
      ctx.records<Trip>('local:poreia:trip:'),
      ctx.records<Booking>('local:poreia:booking:'),
      ctx.records<PlanItem>('local:poreia:plan:'),
    ]);
    const known = <T extends { id: string }>(list: T[]) => list.filter((record) => typeof record.id === 'string');
    const tripNames = new Map(known(trips).map((trip) => [trip.id, trip.name]));
    return [
      ...known(trips).map((trip) => ({
        ref: { app: 'poreia' as const, kind: 'trip', id: trip.id },
        title: trip.name,
        titleField: 'trip name',
        fields: present({ name: 'place', text: trip.place?.label ?? trip.place?.name }, { name: 'trip notes', text: trip.notes }),
        at: trip.createdAt,
        label: 'Trip in Poreia',
        open: `/poreia/?open=${encodeURIComponent(`trip:${trip.id}`)}`,
      })),
      ...known(bookings).map((booking) => ({
        ref: { app: 'poreia' as const, kind: 'booking', id: booking.id },
        title: booking.title,
        titleField: 'booking name',
        fields: present(
          { name: 'booking provider', text: booking.provider },
          { name: 'booking place', text: [booking.address, booking.from, booking.to].filter(Boolean).join(' ') },
          { name: 'booking notes', text: booking.notes },
        ),
        at: booking.createdAt,
        label: `${kindLabel(booking.kind)} in ${tripNames.get(booking.tripId) ?? 'Poreia'}`,
        open: `/poreia/?open=${encodeURIComponent(`booked:${booking.id}`)}`,
      })),
      ...known(plans).map((item) => ({
        ref: { app: 'poreia' as const, kind: 'plan', id: item.id },
        title: item.title,
        titleField: 'plan title',
        fields: present({ name: 'plan place', text: item.where }, { name: 'plan note', text: item.note }),
        at: item.createdAt,
        label: `Plan in ${tripNames.get(item.tripId) ?? 'Poreia'}`,
        open: `/poreia/?open=${encodeURIComponent(`plan:${item.id}`)}`,
      })),
    ];
  },
  subscribe(listener) {
    const offs = ['poreia:trip:', 'poreia:booking:', 'poreia:plan:'].map((prefix) => watchLocal(prefix, listener));
    return () => offs.forEach((off) => off());
  },
};
