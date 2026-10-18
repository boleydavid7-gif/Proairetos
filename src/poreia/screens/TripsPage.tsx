import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ChevronIcon, DiscoverIcon, PlusIcon, TripsIcon } from '../app/icons';
import { useBookings, useItineraryItems, usePlaces, useSavingsPlans, useTrips } from '../app/state';
import { dateText } from '../core/pto';
import { newId } from '../core/id';
import { tripTaskProgress, type PlaceIdea, type Trip, type TripStatus } from '../core/trips';
import { putPlace, putTrip } from '../data/store';
import { formatDate } from '../../oikonomia/core/bills';
import { PoreiaHeader } from '../app/ui';
import lakeWide from '../../assets/images/scenes/lake-wide.webp';
import valleyWide from '../../assets/images/scenes/valley-wide.webp';
import lakeLightWide from '../../assets/images/scenes/lake-light-wide.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';

type TripFilter = 'all' | 'upcoming' | 'planning' | 'past' | 'ideas';
const statuses: TripStatus[] = ['idea', 'planning', 'tentative', 'booked', 'in-progress'];
const tripImages = [lakeLightWide, valleyWide, morningWide, lakeWide];
const today = () => dateText(new Date());
const statusLabel = (status: TripStatus) => status === 'in-progress' ? 'In progress' : status[0].toUpperCase() + status.slice(1);
const dateLabel = (trip: Trip) => trip.startDate && trip.endDate ? `${formatDate(trip.startDate, 'short')} – ${formatDate(trip.endDate, 'short')}` : trip.startDate ? `From ${formatDate(trip.startDate, 'short')}` : 'Dates not set';

function TripForm({ onDone, onCancel }: { onDone: (trip: Trip) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState('');
  const [travelers, setTravelers] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TripStatus>('idea');
  const [error, setError] = useState('');
  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give this trip a name so you can find it later.');
    if (startDate && endDate && endDate < startDate) return setError('The last day must be on or after the first day.');
    const now = new Date().toISOString();
    const trip: Trip = { id: newId(), name: trimmed, destination: destination.trim() || undefined, tripType: tripType.trim() || undefined, notes: notes.trim() || undefined, startDate: startDate || undefined, endDate: endDate || undefined, status, travelers: travelers.split(',').map((item) => item.trim()).filter(Boolean), createdAt: now, updatedAt: now };
    await putTrip(trip);
    onDone(trip);
  };
  return <form className="card poreia-form poreia-trip-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="poreia-section-head"><h2>Plan a trip</h2><button type="button" className="text-link" onClick={onCancel}>Cancel</button></div>
    <label className="field"><span className="field__label">Trip name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="A week by the coast" autoFocus required /></label>
    <label className="field"><span className="field__label">Destination</span><input className="input" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Optional while you explore" /></label>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Trip type</span><input className="input" value={tripType} onChange={(event) => setTripType(event.target.value)} placeholder="Beach, road trip…" /></label><label className="field"><span className="field__label">Travelers</span><input className="input" value={travelers} onChange={(event) => setTravelers(event.target.value)} placeholder="Names, separated by commas" /></label></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">First day</span><input className="input" type="date" min={today()} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span className="field__label">Last day</span><input className="input" type="date" min={startDate || today()} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    <label className="field"><span className="field__label">Notes</span><textarea className="input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What do you want to remember about this trip?" /></label>
    <label className="field"><span className="field__label">Planning status</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value as TripStatus)}>{statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button-main">Save trip</button>
  </form>;
}

function readinessFor(trip: Trip, items: ReturnType<typeof useItineraryItems>, bookings: ReturnType<typeof useBookings>, savings: ReturnType<typeof useSavingsPlans>): { complete: number; total: number } {
  if (trip.checklist?.length) return tripTaskProgress(trip);
  const checks = [
    Boolean(trip.destination),
    Boolean(trip.startDate && trip.endDate),
    bookings.some((booking) => booking.tripId === trip.id && !['canceled', 'refunded'].includes(booking.status)),
    items.some((item) => item.tripId === trip.id && item.status !== 'canceled'),
    savings.some((plan) => plan.tripId === trip.id),
  ];
  return { complete: checks.filter(Boolean).length, total: checks.length };
}

function nextAction(trip: Trip, itemCount: number, bookingCount: number): string {
  if (!trip.destination) return 'Choose a destination';
  if (!trip.startDate || !trip.endDate) return 'Choose dates';
  if (!bookingCount) return 'Add your first booking';
  if (!itemCount) return 'Build the itinerary';
  return 'Continue planning';
}

function FeaturedTrip({ trip, items, bookings, savings, nav, image }: { trip: Trip; items: ReturnType<typeof useItineraryItems>; bookings: ReturnType<typeof useBookings>; savings: ReturnType<typeof useSavingsPlans>; nav: Nav; image: string }) {
  const itemCount = items.filter((item) => item.tripId === trip.id).length;
  const bookingCount = bookings.filter((booking) => booking.tripId === trip.id).length;
  const readiness = readinessFor(trip, items, bookings, savings);
  const progress = Math.round(readiness.complete / readiness.total * 100);
  const mapLink = trip.destination ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination)}` : undefined;
  return <article className="poreia-featured-trip"><div className="poreia-featured-trip__art" style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 28, 36, 0.05), rgba(7, 28, 36, 0.78)), url(${image})` }} aria-hidden="true"><TripsIcon size={32} /></div><div className="poreia-featured-trip__body"><div className="poreia-section-head"><span className="label">{statusLabel(trip.status)}</span><span className="poreia-balance">{progress}% ready</span></div><h2>{trip.name}</h2><p>{trip.destination || 'Destination to decide'} · {dateLabel(trip)}{trip.travelers.length ? ` · ${trip.travelers.length} travelers` : ''}</p><div className="poreia-progress" role="progressbar" aria-label={`${trip.name} checklist progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><small className="poreia-featured-trip__next">{readiness.complete} of {readiness.total} planning checks complete · Next: {nextAction(trip, itemCount, bookingCount)}</small><div className="button-row"><button type="button" className="button-main" onClick={() => nav.go({ name: 'trip', id: trip.id })}>Continue planning</button>{mapLink && <a className="button-quiet" href={mapLink} target="_blank" rel="noreferrer">Open map</a>}</div></div></article>;
}

function TripCard({ trip, items, bookings, savings, nav, image }: { trip: Trip; items: ReturnType<typeof useItineraryItems>; bookings: ReturnType<typeof useBookings>; savings: ReturnType<typeof useSavingsPlans>; nav: Nav; image: string }) {
  const itemCount = items.filter((item) => item.tripId === trip.id).length;
  const bookingCount = bookings.filter((booking) => booking.tripId === trip.id).length;
  const readiness = readinessFor(trip, items, bookings, savings);
  const progress = Math.round(readiness.complete / readiness.total * 100);
  return <button type="button" className="poreia-trip-card" onClick={() => nav.go({ name: 'trip', id: trip.id })}><span className="poreia-trip-card__thumb" style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 28, 36, 0.05), rgba(7, 28, 36, 0.62)), url(${image})` }} aria-hidden="true" /><span className="poreia-row__text"><strong>{trip.name}</strong><small>{trip.destination || 'Destination to decide'} · {dateLabel(trip)}{trip.travelers.length ? ` · ${trip.travelers.length} travelers` : ''}</small><span className="poreia-trip-card__progress"><span style={{ width: `${progress}%` }} /></span><small>{readiness.complete} of {readiness.total} checks · {nextAction(trip, itemCount, bookingCount)}</small></span><span className="poreia-trip-card__side"><span>{statusLabel(trip.status)}</span><ChevronIcon size={18} /></span></button>;
}

function Ideas({ places, onConvert }: { places: PlaceIdea[]; onConvert: (place: PlaceIdea) => void }) {
  if (!places.length) return <div className="card poreia-empty"><DiscoverIcon size={28} /><p className="muted">Save a destination idea from Discover and turn it into a trip when you are ready.</p></div>;
  return <div className="poreia-list">{places.map((place) => <div className="poreia-row poreia-row--stack" key={place.id}><DiscoverIcon size={22} /><span className="poreia-row__text"><strong>{place.name}</strong><small>{place.location || 'Location to decide'}{place.note ? ` · ${place.note}` : ''}</small></span>{place.tripId ? <span className="poreia-balance">Trip saved</span> : <button type="button" className="text-link" onClick={() => onConvert(place)}>Plan trip</button>}</div>)}</div>;
}

export default function TripsPage({ nav }: { nav: Nav }) {
  const trips = useTrips();
  const places = usePlaces();
  const items = useItineraryItems();
  const bookings = useBookings();
  const savings = useSavingsPlans();
  const [filter, setFilter] = useState<TripFilter>('all');
  const [showForm, setShowForm] = useState(() => {
    const requested = localStorage.getItem('poreia:openTripForm') === 'yes';
    if (requested) localStorage.removeItem('poreia:openTripForm');
    return requested;
  });
  const currentDay = today();
  const active = trips.filter((trip) => trip.status !== 'canceled');
  const past = active.filter((trip) => trip.status === 'completed' || (trip.endDate !== undefined && trip.endDate < currentDay && trip.status !== 'in-progress')).sort((a, b) => (b.endDate ?? b.startDate ?? '').localeCompare(a.endDate ?? a.startDate ?? ''));
  const future = active.filter((trip) => !past.includes(trip) && trip.status !== 'in-progress').sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'));
  const inProgress = active.filter((trip) => trip.status === 'in-progress');
  const planning = future.filter((trip) => trip.status !== 'completed');
  const upNext = future.find((trip) => trip.startDate !== undefined);
  const ideas = places.filter((place) => !place.tripId);
  const visibleTrips = filter === 'past' ? past : filter === 'planning' ? planning : filter === 'upcoming' ? [...inProgress, ...future] : active;
  const sections = useMemo(() => {
    if (filter === 'ideas') return [];
    if (filter === 'past') return [{ title: 'Past trips', trips: past }];
    if (filter === 'planning') return [{ title: 'Planning', trips: planning }];
    if (filter === 'upcoming') return [{ title: 'Upcoming', trips: visibleTrips.filter((trip) => trip.id !== upNext?.id) }];
    return [{ title: 'In progress', trips: inProgress }, { title: 'Upcoming', trips: future.filter((trip) => trip.id !== upNext?.id) }, { title: 'Past trips', trips: past }];
  }, [filter, future, inProgress, past, planning, upNext?.id, visibleTrips]);

  const convertIdea = async (place: PlaceIdea) => {
    const now = new Date().toISOString();
    const trip: Trip = { id: newId(), name: place.name, destination: place.location, notes: place.note, status: 'idea', travelers: [], createdAt: now, updatedAt: now };
    await putTrip(trip);
    await putPlace({ ...place, tripId: trip.id, updatedAt: now });
    nav.go({ name: 'trip', id: trip.id });
  };

  return <div className="page poreia-page"><PoreiaHeader compact eyebrow="Your travel workspace" title="Your trips" description="Your adventures, all in one place."><button type="button" className="poreia-header__plus poreia-header__plan" onClick={() => setShowForm(true)}><PlusIcon size={18} /> Plan a new trip</button></PoreiaHeader>
    <div className="page page--under-hero poreia-trips-page">
      {showForm && <TripForm onCancel={() => setShowForm(false)} onDone={(trip) => nav.go({ name: 'trip', id: trip.id })} />}
      <div className="segmented segmented--even poreia-trip-filters" role="tablist" aria-label="Trip filter">{(['all', 'upcoming', 'planning', 'past', 'ideas'] as TripFilter[]).map((item) => <button type="button" role="tab" aria-selected={filter === item} className="segmented__option" key={item} onClick={() => setFilter(item)}>{item === 'ideas' ? 'Ideas' : item[0].toUpperCase() + item.slice(1)}</button>)}</div>
      {filter === 'ideas' ? <section className="poreia-section"><div className="poreia-section-head"><h2>Saved ideas</h2><span className="label">{ideas.length}</span></div><Ideas places={ideas} onConvert={(place) => void convertIdea(place)} /></section> : <>
        {(filter === 'all' || filter === 'upcoming') && (upNext ? <section className="poreia-section"><div className="poreia-section-head"><h2>Up next</h2><span className="label">{upNext.startDate ? formatDate(upNext.startDate, 'long') : 'Dates open'}</span></div><FeaturedTrip trip={upNext} items={items} bookings={bookings} savings={savings} nav={nav} image={tripImages[0]} /></section> : !visibleTrips.length ? <section className="card poreia-empty"><TripsIcon size={28} /><h2 className="card__title">No trips planned yet</h2><p className="muted">Your next adventure can start with a place, an idea, or a few dates.</p><div className="button-row"><button type="button" className="button-main" onClick={() => setShowForm(true)}>Plan your first trip</button><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'discover' })}>Discover destinations</button></div></section> : null)}
        {sections.map((section) => section.trips.length || filter !== 'all' ? <section className="poreia-section" key={section.title}><div className="poreia-section-head"><h2>{section.title}</h2><span className="label">{section.trips.length}</span></div>{section.trips.length ? <div className="poreia-trip-list">{section.trips.map((trip, index) => <TripCard key={trip.id} trip={trip} items={items} bookings={bookings} savings={savings} nav={nav} image={tripImages[(index + 1) % tripImages.length]} />)}</div> : <p className="muted">{section.title === 'In progress' ? 'Nothing is underway right now.' : section.title === 'Past trips' ? 'Completed trips will appear here.' : 'No trips match this filter yet.'}</p>}</section> : null)}
        {filter !== 'past' && ideas.length > 0 && <section className="poreia-section"><div className="poreia-section-head"><h2>Saved ideas</h2><button type="button" className="text-link" onClick={() => setFilter('ideas')}>See all</button></div><Ideas places={ideas.slice(0, 3)} onConvert={(place) => void convertIdea(place)} /></section>}
      </>}
    </div>
  </div>;
}
