import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, DiscoverIcon, HeartIcon, PtoIcon, TripsIcon } from '../app/icons';
import { useBookings, useItineraryItems, usePlaces, usePtoAccounts, usePtoLedger, useLeaveRequests, useSavingsPlans, useTrips, useWorkProfiles } from '../app/state';
import { balanceAt, dateText } from '../core/pto';
import { CURATED_PLACES, normalizedPlaceKey, type CuratedPlace } from '../core/discover';
import { newId } from '../core/id';
import type { PlaceIdea, Trip } from '../core/trips';
import { putPlace, removePlace } from '../data/store';
import { formatDate } from '../../oikonomia/core/bills';
import lakeWide from '../../assets/images/scenes/lake-wide.webp';
import valleyWide from '../../assets/images/scenes/valley-wide.webp';
import lakeLightWide from '../../assets/images/scenes/lake-light-wide.webp';
import morningWide from '../../assets/images/scenes/morning-wide.webp';
import { PoreiaHeader } from '../app/ui';

const suggestionImages = [lakeLightWide, valleyWide, morningWide, lakeWide];

function tripLabel(status: string): string {
  return status === 'in-progress' ? 'In progress' : status[0].toUpperCase() + status.slice(1);
}

function tripDates(trip: Trip): string {
  if (trip.startDate && trip.endDate) return `${formatDate(trip.startDate, 'short')} – ${formatDate(trip.endDate, 'short')}`;
  if (trip.startDate) return `From ${formatDate(trip.startDate, 'short')}`;
  return 'Dates not set';
}

function planningProgress(tripId: string, itineraryItems: ReturnType<typeof useItineraryItems>, bookings: ReturnType<typeof useBookings>, savings: ReturnType<typeof useSavingsPlans>): number {
  const checks = [
    itineraryItems.some((item) => item.tripId === tripId && item.status !== 'canceled'),
    bookings.some((booking) => booking.tripId === tripId && !['canceled', 'refunded'].includes(booking.status)),
    savings.some((plan) => plan.tripId === tripId),
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function nextAction(trip: Trip, itineraryCount: number, bookingCount: number): string {
  if (!trip.destination) return 'Choose a destination';
  if (!trip.startDate || !trip.endDate) return 'Choose dates';
  if (!bookingCount) return 'Add your first booking';
  if (!itineraryCount) return 'Build the itinerary';
  return 'Continue planning';
}

function openTripCreator(nav: Nav): void {
  localStorage.setItem('poreia:openTripForm', 'yes');
  nav.swap({ name: 'trips' });
}

function FeaturedTrip({ trip, itineraryItems, bookings, savings, nav }: { trip: Trip; itineraryItems: ReturnType<typeof useItineraryItems>; bookings: ReturnType<typeof useBookings>; savings: ReturnType<typeof useSavingsPlans>; nav: Nav }) {
  const tripItems = itineraryItems.filter((item) => item.tripId === trip.id && item.status !== 'canceled');
  const tripBookings = bookings.filter((booking) => booking.tripId === trip.id && !['canceled', 'refunded'].includes(booking.status));
  const progress = planningProgress(trip.id, itineraryItems, bookings, savings);
  const mapLink = trip.destination ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination)}` : undefined;
  return <article className="poreia-home-trip-card">
    <div className="poreia-home-trip-card__art" style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 28, 36, 0.04), rgba(7, 28, 36, 0.78)), url(${valleyWide})` }} aria-hidden="true"><TripsIcon size={32} /></div>
    <div className="poreia-home-trip-card__body">
      <div className="poreia-section-head"><span className="label">{tripLabel(trip.status)}</span><span className="poreia-balance">{progress}% planned</span></div>
      <h3>{trip.name}</h3>
      <p>{trip.destination || 'Destination to decide'} · {tripDates(trip)}{trip.travelers.length ? ` · ${trip.travelers.length} travelers` : ''}</p>
      <div className="poreia-progress" role="progressbar" aria-label={`${trip.name} planning progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
      <small className="poreia-home-trip-card__next">Next: {nextAction(trip, tripItems.length, tripBookings.length)}</small>
      <div className="button-row"><button type="button" className="button-main" onClick={() => nav.go({ name: 'trip', id: trip.id })}>Continue planning</button>{mapLink && <a className="button-quiet" href={mapLink} target="_blank" rel="noreferrer">Map</a>}</div>
    </div>
  </article>;
}

function SuggestionCard({ place, image, saved, onOpen, onToggle }: { place: CuratedPlace; image: string; saved?: PlaceIdea; onOpen: () => void; onToggle: () => void }) {
  return <article className="poreia-home-suggestion-card">
    <button type="button" className="poreia-home-suggestion-card__open" onClick={onOpen}>
      <span className="poreia-home-suggestion-card__art" style={{ backgroundImage: `linear-gradient(180deg, transparent 34%, rgba(3, 14, 22, 0.82)), url(${image})` }} aria-hidden="true" />
      <span className="poreia-home-suggestion-card__body"><strong>{place.name}</strong><small>{place.location}</small><span>{place.category} · {place.collection}</span></span>
    </button>
    <button type="button" className="poreia-home-suggestion-card__save" aria-label={saved ? `Remove ${place.name} from saved places` : `Save ${place.name}`} aria-pressed={Boolean(saved)} onClick={onToggle}><HeartIcon size={18} /></button>
  </article>;
}

export default function HomePage({ nav }: { nav: Nav }) {
  const profiles = useWorkProfiles();
  const accounts = usePtoAccounts();
  const ledger = usePtoLedger();
  const requests = useLeaveRequests();
  const trips = useTrips();
  const places = usePlaces();
  const bookings = useBookings();
  const itineraryItems = useItineraryItems();
  const savings = useSavingsPlans();
  const [saveError, setSaveError] = useState('');
  const profile = profiles[0];
  const account = accounts[0];
  const today = dateText(new Date());
  const balance = profile && account ? balanceAt(account, ledger, profile, today, requests) : undefined;
  const activeTrips = trips.filter((trip) => !['completed', 'canceled'].includes(trip.status));
  const nextTrip = [...activeTrips]
    .filter((trip) => trip.status === 'in-progress' || !trip.endDate || trip.endDate >= today)
    .sort((a, b) => (a.status === 'in-progress' ? 0 : 1) - (b.status === 'in-progress' ? 0 : 1) || (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'))[0];
  const suggested = useMemo(() => CURATED_PLACES.slice(0, 4), []);
  const savedByKey = (place: CuratedPlace) => places.find((saved) => normalizedPlaceKey(saved.name, saved.location, saved.providerId) === normalizedPlaceKey(place.name, place.location, place.id));

  const toggleSuggestion = async (place: CuratedPlace) => {
    setSaveError('');
    const saved = savedByKey(place);
    try {
      if (saved) {
        await removePlace(saved.id);
        return;
      }
      const now = new Date().toISOString();
      await putPlace({ id: newId(), name: place.name, location: place.location, note: place.description, category: place.category, collection: place.collection, source: 'curated', provider: 'Lamplight curated guide', providerId: place.id, externalUrl: place.url, createdAt: now, updatedAt: now });
    } catch {
      setSaveError('That destination could not be saved. Try again.');
    }
  };
  const openSuggestion = (place: CuratedPlace) => {
    localStorage.setItem('poreia.discover.open', place.id);
    nav.swap({ name: 'discover' });
  };

  return <div className="home poreia-home">
    <PoreiaHeader compact title={nextTrip ? nextTrip.name : 'Where will you go?'} description={nextTrip ? `Keep shaping ${nextTrip.destination || 'your next escape'} at your own pace.` : 'Find your next escape and make the most of your time away.'} style={{ backgroundImage: `linear-gradient(180deg, rgba(7, 28, 36, 0.16), rgba(7, 28, 36, 0.95) 92%), url(${lakeWide})` }} />

    <div className="page page--under-hero poreia-home-content">
      <section className="poreia-section"><div className="poreia-section-head"><h2>Upcoming trip</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'trips' })}>View all</button></div>{nextTrip ? <FeaturedTrip trip={nextTrip} itineraryItems={itineraryItems} bookings={bookings} savings={savings} nav={nav} /> : <div className="card poreia-home-empty"><TripsIcon size={28} /><div><h3>Your next adventure starts here</h3><p className="muted">Create a trip or save a destination idea while you explore.</p></div><div className="button-row"><button type="button" className="button-main" onClick={() => openTripCreator(nav)}>Plan a trip</button><button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'discover' })}>Explore destinations</button></div></div>}</section>

      <section className="poreia-section"><div className="poreia-section-head"><h2>Quick actions</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'trips' })}>See all</button></div><div className="poreia-action-grid poreia-action-grid--home">
        <button type="button" className="poreia-action-tile" onClick={() => openTripCreator(nav)}><TripsIcon size={20} /><span><strong>Plan a trip</strong><small>Start a new adventure.</small></span></button>
        <button type="button" className="poreia-action-tile" onClick={() => nav.swap({ name: 'discover' })}><DiscoverIcon size={20} /><span><strong>Explore</strong><small>Find destinations and ideas.</small></span></button>
        <button type="button" className="poreia-action-tile" onClick={() => nextTrip ? nav.go({ name: 'trip', id: nextTrip.id }) : openTripCreator(nav)}><CalendarIcon size={20} /><span><strong>Build itinerary</strong><small>Add places and activities.</small></span></button>
        <button type="button" className="poreia-action-tile" onClick={() => nav.go({ name: 'vacation' })}><PtoIcon size={20} /><span><strong>Find dates</strong><small>See when you can travel.</small></span></button>
      </div></section>

      <section className="poreia-section"><div className="poreia-section-head"><h2>Suggested destinations</h2><button type="button" className="text-link" onClick={() => nav.swap({ name: 'discover' })}>See all</button></div><div className="poreia-home-suggestions" aria-label="Suggested destinations">{suggested.map((place, index) => <SuggestionCard key={place.id} place={place} image={suggestionImages[index % suggestionImages.length]} saved={savedByKey(place)} onOpen={() => openSuggestion(place)} onToggle={() => void toggleSuggestion(place)} />)}</div>{saveError && <p className="form-error" role="alert">{saveError}</p>}</section>

      {balance !== undefined && <section className="poreia-home-availability"><div><p className="label">Vacation availability</p><h2>{balance} hours available</h2><p>Compare dates when you are ready to shape the next trip.</p></div><button type="button" className="button-quiet" onClick={() => nav.go({ name: 'vacation' })}>Compare dates</button></section>}
    </div>
  </div>;
}
