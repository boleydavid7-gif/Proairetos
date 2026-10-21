import { useState } from 'react';
import type { PoreiaNav } from '../app/App';
import { newId, nowStamp, settings, today, trips } from '../app/state';
import { PlaceSearch } from '../app/ui';
import { BookLinks, CountryCard, EventsCard, GuideCard, SightsCard, Weather, type Target } from '../components/Destination';
import type { SearchKind } from '../core/links';
import type { Place, Trip } from '../core/model';

const KEPT = 'poreiaExplore';

type Kept = { place?: Place; start?: string; end?: string; travelers?: number };

function kept(): Kept {
  try {
    return JSON.parse(sessionStorage.getItem(KEPT) ?? '{}') as Kept;
  } catch {
    return {};
  }
}

/** Look around a place before it is a trip: weather, booking searches, events, sights, the guide. */
export default function ExplorePage({ nav, search }: { nav: PoreiaNav; search?: SearchKind }) {
  const prefs = settings.use();
  const list = trips.use();
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
  const target: Target | undefined = state.place ? { place: state.place, start: state.start, end: state.end, travelers: state.travelers ?? prefs.travelers } : undefined;

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">Explore</h1>
      </div>
      <PlaceSearch label="Where to" value={state.place} onPick={(place) => change({ place })} placeholder="Anywhere: a city, island, region" />
      {places.length > 0 && !state.place && (
        <div className="chip-row poreia-scroll-chips" aria-label="Places from your trips">
          {places.map((place) => (
            <button key={place.label ?? place.name} type="button" className="chip" onClick={() => change({ place })}>
              {place.name}
            </button>
          ))}
        </div>
      )}
      <div className="input-row">
        <label className="field">
          <span className="field__label">From (optional)</span>
          <input className="input" type="date" value={state.start ?? ''} onChange={(event) => change({ start: event.target.value || undefined })} />
        </label>
        <label className="field">
          <span className="field__label">Until (optional)</span>
          <input className="input" type="date" value={state.end ?? ''} min={state.start} onChange={(event) => change({ end: event.target.value || undefined })} />
        </label>
      </div>

      {target ? (
        <>
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
          <BookLinks target={target} initial={search} />
          <Weather target={target} today={today()} />
          <EventsCard target={target} />
          <SightsCard place={target.place} />
          <CountryCard target={target} />
          <GuideCard place={target.place} />
        </>
      ) : (
        <p className="muted">Pick a place to see its weather, stays, flights, cruises, events, sights and the guide.</p>
      )}
    </div>
  );
}
