import { useMemo } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, PtoIcon, WorkIcon } from '../app/icons';
import { useBookings, useItineraryItems, useLeaveRequests, useTrips, useWorkProfiles } from '../app/state';
import { addDays, dateText, parseDate, workHoursOn } from '../core/pto';
import { PageTop, PoreiaHeader } from '../app/ui';

function labelFor(date: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseDate(date));
}

export default function CalendarPage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const requests = useLeaveRequests();
  const trips = useTrips();
  const itineraryItems = useItineraryItems();
  const bookings = useBookings();
  const profile = profiles[0];
  const start = useMemo(() => dateText(new Date()), []);
  const dates = useMemo(() => Array.from({ length: 21 }, (_, index) => addDays(start, index)), [start]);
  const travelEvents = useMemo(() => {
    const visible = new Set(dates);
    const events: { id: string; date: string; title: string; detail: string; tripId: string }[] = [];
    for (const trip of trips) {
      if (trip.startDate && visible.has(trip.startDate)) events.push({ id: `${trip.id}:start`, date: trip.startDate, title: trip.name, detail: `${trip.destination || 'Destination to decide'} · departure`, tripId: trip.id });
      if (trip.endDate && trip.endDate !== trip.startDate && visible.has(trip.endDate)) events.push({ id: `${trip.id}:end`, date: trip.endDate, title: trip.name, detail: `${trip.destination || 'Destination to decide'} · return`, tripId: trip.id });
    }
    for (const booking of bookings) if (booking.startDate && visible.has(booking.startDate)) {
      const trip = trips.find((item) => item.id === booking.tripId);
      events.push({ id: `booking:${booking.id}`, date: booking.startDate, title: booking.provider, detail: `${booking.type.replace('-', ' ')} · ${trip?.name || 'Trip'}`, tripId: booking.tripId });
    }
    for (const item of itineraryItems) if (item.date && visible.has(item.date)) {
      const trip = trips.find((entry) => entry.id === item.tripId);
      events.push({ id: `item:${item.id}`, date: item.date, title: item.title, detail: `${item.location || 'Itinerary'} · ${trip?.name || 'Trip'}`, tripId: item.tripId });
    }
    return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [bookings, dates, itineraryItems, trips]);
  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader eyebrow="Plan around real commitments" title="Calendar"><button type="button" className="button-quiet" onClick={() => nav.go({ name: 'vacation' })}><PtoIcon size={18} /> Vacation Time</button></PoreiaHeader>
    <div className="page page--under-hero">
      {!profile ? <section className="card poreia-empty"><CalendarIcon size={28} /><h2 className="card__title">Add your work schedule first</h2><p className="muted">Once Poreia knows which days you work, this calendar can show the leave cost of a trip.</p><button type="button" className="button-main" onClick={() => nav.go({ name: 'vacation' })}>Set up schedule</button></section> : <>
        <section className="card poreia-card poreia-section"><div className="poreia-section-head"><h2>Next three weeks</h2><span className="label">{profile.timezone}</span></div><div className="poreia-list">{dates.map((date) => { const hours = workHoursOn(date, profile); const leave = requests.find((request) => request.startDate <= date && request.endDate >= date && request.status !== 'denied' && request.status !== 'canceled'); return <div className="poreia-row" key={date}><span className="poreia-row__text"><strong>{labelFor(date)}</strong><small>{leave ? `${leave.status[0].toUpperCase() + leave.status.slice(1)} leave` : hours ? `${hours} scheduled work hours` : 'No scheduled work'}</small></span>{leave ? <PtoIcon size={20} /> : hours ? <WorkIcon size={20} /> : <span className="muted">—</span>}</div>; })}</div></section>
        <section className="poreia-section"><div className="poreia-section-head"><h2>Trip schedule</h2><span className="label">Next three weeks</span></div>{travelEvents.length === 0 ? <div className="card poreia-empty"><CalendarIcon size={28} /><p className="muted">Trips, reservations, and itinerary items will appear here once they have dates.</p></div> : <div className="poreia-list">{travelEvents.map((event) => <button type="button" className="poreia-row poreia-row--button" key={event.id} onClick={() => nav.go({ name: 'trip', id: event.tripId })}><span className="poreia-row__text"><strong>{labelFor(event.date)} · {event.title}</strong><small>{event.detail}</small></span><span className="poreia-balance">Open</span></button>)}</div>}</section>
        <section className="poreia-section"><div className="poreia-section-head"><h2>Planning note</h2></div><p className="muted">This view uses your manual schedule, leave records, trips, reservations, and itinerary. Employer calendars and family commitments can be added as integrations later without changing the dates you enter here.</p></section>
      </>}
    </div>
  </div>;
}
