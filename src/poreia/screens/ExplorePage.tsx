import { useLocatedPlace } from '../app/locate';
import { useState } from 'react';
import type { PoreiaNav } from '../app/App';
import { newId, nowStamp, settings, spots, today, trips } from '../app/state';
import { PlaceSearch } from '../app/ui';
import { BookLinks, CountryCard, GuideCard, Weather, type Target } from '../components/Destination';
import Around from '../components/Around';
import type { SearchKind } from '../core/links';
import type { Place, Trip } from '../core/model';
import RouteEmpty from '../components/RouteEmpty';
import PlaceHeader from '../components/PlaceHeader';
import WhenToGo from '../components/WhenToGo';
import DateRange from '../components/DateRange';
import { TimeOffLine, YearBudgetLine } from '../components/References';

const KEPT = 'poreiaExplore';
const RECENT = 'poreiaExploreRecent';

// A small, clearly curated set of real places gives a new user somewhere to begin without inventing live facts.
const STARTER_PLACES: Place[] = [
  { name: 'Lisbon', label: 'Lisbon, Portugal', country: 'Portugal', countryCode: 'PT', lat: 38.7223, lon: -9.1393, timezone: 'Europe/Lisbon' },
  { name: 'Kyoto', label: 'Kyoto, Japan', country: 'Japan', countryCode: 'JP', lat: 35.0116, lon: 135.7681, timezone: 'Asia/Tokyo' },
  { name: 'Banff', label: 'Banff, Alberta, Canada', country: 'Canada', countryCode: 'CA', lat: 51.1784, lon: -115.5708, timezone: 'America/Edmonton' },
  { name: 'Amalfi Coast', label: 'Amalfi Coast, Italy', country: 'Italy', countryCode: 'IT', lat: 40.6333, lon: 14.6029, timezone: 'Europe/Rome' },
  { name: 'Mexico City', label: 'Mexico City, Mexico', country: 'Mexico', countryCode: 'MX', lat: 19.4326, lon: -99.1332, timezone: 'America/Mexico_City' },
  { name: 'Copenhagen', label: 'Copenhagen, Denmark', country: 'Denmark', countryCode: 'DK', lat: 55.6761, lon: 12.5683, timezone: 'Europe/Copenhagen' },
];

type Kept = { place?: Place; start?: string; end?: string; travelers?: number };

function kept(): Kept {
  try {
    return JSON.parse(sessionStorage.getItem(KEPT) ?? '{}') as Kept;
  } catch {
    return {};
  }
}

function recentPlaces(): Place[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((place): place is Place => Boolean(place && typeof place === 'object' && typeof (place as Place).name === 'string')).slice(0, 6) : [];
  } catch {
    return [];
  }
}

const placeKey = (place: Place) => `${place.lat ?? ''}|${place.lon ?? ''}|${(place.label ?? place.name).toLowerCase()}`;

/** Look around a place before it is a trip: weather, booking searches, events, sights, the guide. */
export default function ExplorePage({ nav, search }: { nav: PoreiaNav; search?: SearchKind }) {
  const prefs = settings.use();
  const list = trips.use();
  const savedSpots = spots.use();
  const [recent, setRecent] = useState<Place[]>(recentPlaces);
  const [state, setState] = useState<Kept>(kept);
  const change = (patch: Kept) => {
    const next = { ...state, ...patch };
    setState(next);
    try {
      sessionStorage.setItem(KEPT, JSON.stringify(next));
    } catch {
      // Not kept between visits; nothing else changes.
    }
  };
  const places = [...new Map(list.filter((trip) => trip.place?.lat !== undefined).map((trip) => [trip.place!.label ?? trip.place!.name, trip.place!])).values()].slice(0, 8);
  const saved = [...new Map(savedSpots.map((spot) => [`${spot.tripId ?? ''}|${spot.ref ?? spot.id}`, spot])).values()].slice(0, 8);
  const place = useLocatedPlace(state.place);
  const target: Target | undefined = place ? { place, start: state.start, end: state.end, travelers: state.travelers ?? prefs.travelers } : undefined;
  const choosePlace = (picked?: Place) => {
    change({ place: picked });
    if (!picked) return;
    setRecent((current) => {
      const next = [picked, ...current.filter((each) => placeKey(each) !== placeKey(picked))].slice(0, 6);
      try {
        localStorage.setItem(RECENT, JSON.stringify(next));
      } catch {
        // Recent places are a convenience; the current search still works when storage is unavailable.
      }
      return next;
    });
  };

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">Explore</h1>
      </div>
      <PlaceSearch label="Where to" value={state.place} onPick={choosePlace} placeholder="City, island or region" />
      {places.length > 0 && !state.place && (
        <div className="chip-row poreia-scroll-chips" aria-label="Places from your trips">
          {places.map((place) => (
            <button key={place.label ?? place.name} type="button" className="chip" onClick={() => choosePlace(place)}>
              {place.name}
            </button>
          ))}
        </div>
      )}
      {!state.place && (
        <>
          <section className="card poreia-explore-start">
            <h2 className="card__title">Start with an idea</h2>
            <p className="muted">Choose a real place to see weather, nearby places, guides, and booking options.</p>
            <div className="chip-row poreia-scroll-chips" aria-label="Curated places">
              {STARTER_PLACES.map((starter) => (
                <button key={starter.label} type="button" className="chip" onClick={() => choosePlace(starter)}>
                  {starter.name}
                </button>
              ))}
            </div>
          </section>
          {recent.length > 0 && (
            <section className="card poreia-explore-start">
              <div className="section-head">
                <h2 className="card__title">Recent places</h2>
                <button type="button" className="text-link" onClick={() => {
                  setRecent([]);
                  try {
                    localStorage.removeItem(RECENT);
                  } catch {
                    // Recent places are optional and may be unavailable in private browsing.
                  }
                }}>
                  Clear
                </button>
              </div>
              <div className="chip-row poreia-scroll-chips" aria-label="Recent places">
                {recent.map((place) => (
                  <button key={placeKey(place)} type="button" className="chip" onClick={() => choosePlace(place)}>
                    {place.name}
                  </button>
                ))}
              </div>
            </section>
          )}
          {saved.length > 0 && (
            <section className="card poreia-explore-start">
              <div className="section-head">
                <h2 className="card__title">Saved places</h2>
                <span className="fine">From your trips</span>
              </div>
              <ul className="rows">
                {saved.map((spot) => {
                  const trip = list.find((each) => each.id === spot.tripId);
                  return (
                    <li key={`${spot.tripId ?? ''}|${spot.ref ?? spot.id}`}>
                      <button type="button" className="row" onClick={() => nav.go({ name: 'place', spot, tripId: spot.tripId })}>
                        <span className="row__text">
                          <span>{spot.name}</span>
                          <span className="row__detail">{trip?.name ?? 'Saved place'}</span>
                        </span>
                        <span className="row__detail">{spot.kind}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
      <DateRange start={state.start} end={state.end} onChange={(dates) => change(dates)} />
      {state.start && (
        <>
          <TimeOffLine start={state.start} end={state.end} />
          <YearBudgetLine year={Number(state.start.slice(0, 4))} />
        </>
      )}

      {target ? (
        <>
          <PlaceHeader place={target.place} />
          <button
            type="button"
            className="button-main"
            onClick={() => {
              const now = nowStamp();
              const trip: Trip = { id: newId(), name: target.place.name, place: target.place, start: target.start, end: target.end ?? target.start, travelers: target.travelers, stage: 'idea', createdAt: now, updatedAt: now };
              trips.put(trip);
              nav.go({ name: 'trip', id: trip.id });
            }}
          >
            Make it a trip
          </button>
          <BookLinks target={target} initial={search} nav={nav} />
          <Around place={target.place} start={target.start} end={target.end} nav={nav} />
          <Weather target={target} today={today()} />
          <WhenToGo place={target.place} start={target.start} end={target.end} />
          <CountryCard target={target} />
          <GuideCard place={target.place} />
        </>
      ) : (
        <RouteEmpty glyph="globe" title="Where to?" line="Weather, stays, flights and things to do." />
      )}
    </div>
  );
}
