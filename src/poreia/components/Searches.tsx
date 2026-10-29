import { useEffect, useRef, useState } from 'react';
import { ChevronIcon } from '../../app/family/icons';
import { Waiting } from '../../lamplight/Waiting';
import type { PoreiaNav } from '../app/App';
import { settings } from '../app/state';
import { Outbound } from '../app/ui';
import { findAirports, searchFlights, searchStays, type Airport, type FlightOffer, type StayOffer } from '../app/world';
import { flightLink } from '../core/links';
import { moneyText, nightsOf } from '../core/model';
import type { Spot } from '../core/spots';
import type { Target } from './Destination';

/*
 * Searches with prices shown in the app, when the site has the keys: stays from LiteAPI and flights from Duffel. Each
 * result opens in Poreia; the booking itself happens on the provider's site, filled in from the result.
 */

const cents = (amount: number) => Math.round(amount * 100);

export const stayAsSpot = (stay: StayOffer, nights: number): Spot => ({
  id: `stay-${stay.id}`,
  name: stay.name,
  kind: stay.stars ? `${stay.stars}-star stay` : 'Stay',
  category: 'sleep',
  source: 'stay',
  lat: stay.lat,
  lon: stay.lon,
  address: stay.address,
  image: stay.photo,
  price: stay.price ? `${moneyText({ cents: cents(stay.price.amount), currency: stay.price.currency })}${nights ? ` for ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}` : undefined,
  details: [stay.room, stay.board, stay.refundable ? 'Free cancellation' : stay.refundable === false ? 'Not refundable' : undefined, stay.rating ? `Guests rate it ${stay.rating.toFixed(1)} of 10${stay.reviews ? ` (${stay.reviews} reviews)` : ''}` : undefined].filter((each): each is string => Boolean(each)),
});

/** Stays near the place for the trip's dates, cheapest first, with the price for the whole stay. */
export function StayResults({ target, nav, tripId }: { target: Target; nav: PoreiaNav; tripId?: string }) {
  const prefs = settings.use();
  const [state, setState] = useState<{ key: string; stays?: StayOffer[]; problem?: string }>();
  const { lat, lon } = target.place;
  const key = lat !== undefined && lon !== undefined && target.start && target.end && target.end > target.start ? `${lat},${lon},${target.start},${target.end},${target.travelers},${prefs.currency}` : undefined;
  useEffect(() => {
    if (!key) return;
    let live = true;
    setState({ key });
    searchStays({ lat: lat!, lon: lon!, checkin: target.start!, checkout: target.end!, adults: target.travelers, currency: prefs.currency, nationality: prefs.home?.countryCode?.toUpperCase() })
      .then((stays) => live && setState({ key, stays }))
      .catch((error: Error) => live && setState({ key, problem: error.message }));
    return () => {
      live = false;
    };
  }, [key]);
  if (!key) return <p className="muted">No dates on this trip yet.</p>;
  const nights = nightsOf({ start: target.start, end: target.end });
  return (
    <>
      {!state?.stays && !state?.problem && (
        <p className="muted">
          <Waiting>Finding stays…</Waiting>
        </p>
      )}
      {state?.problem && <p className="muted">{state.problem}</p>}
      {state?.stays?.length === 0 && <p className="muted">No stays with rooms for these dates nearby.</p>}
      {state?.stays && state.stays.length > 0 && (
        <ul className="rows poreia-spots poreia-stays">
          {state.stays.slice(0, 25).map((stay) => (
            <li key={stay.id}>
              <button type="button" className="row" onClick={() => nav.go({ name: 'place', spot: stayAsSpot(stay, nights), tripId })}>
                {stay.photo ? <img className="poreia-spots__photo" src={stay.photo} alt="" /> : <span className="poreia-spots__dot poreia-pin--sleep" aria-hidden="true" />}
                <span className="row__text">
                  <span>{stay.name}</span>
                  <span className="row__detail">{[stay.stars ? `${stay.stars}★` : undefined, stay.rating ? `${stay.rating.toFixed(1)}/10` : undefined, stay.refundable ? 'Free cancellation' : undefined].filter(Boolean).join(' · ')}</span>
                </span>
                {stay.price && <span className="poreia-trip-row__when">{moneyText({ cents: cents(stay.price.amount), currency: stay.price.currency })}</span>}
                <ChevronIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {state?.stays && state.stays.length > 0 && <p className="fine">Prices for the whole stay{nights ? `, ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}, from LiteAPI. Booked on the provider’s site.</p>}
    </>
  );
}

/** An airport by name or code, from Duffel's list of places. */
function AirportField({ label, value, onPick }: { label: string; value: string; onPick: (code: string) => void }) {
  const [text, setText] = useState(value);
  const [found, setFound] = useState<Airport[]>([]);
  const timer = useRef(0);
  useEffect(() => setText(value), [value]);
  return (
    <div className="poreia-place">
      <label className="field">
        <span className="field__label">{label}</span>
        <input
          className="input"
          value={text}
         
          autoCapitalize="characters"
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            window.clearTimeout(timer.current);
            if (/^[A-Za-z]{3}$/.test(next.trim())) onPick(next.trim().toUpperCase());
            timer.current = window.setTimeout(() => {
              findAirports(next)
                .then(setFound)
                .catch(() => setFound([]));
            }, 300);
          }}
          onBlur={() => window.setTimeout(() => setFound([]), 180)}
        />
      </label>
      {found.length > 0 && (
        <ul className="poreia-place__list" role="listbox" aria-label={`${label}: airports`}>
          {found.map((airport) => (
            <li key={airport.code}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setText(`${airport.code} · ${airport.name}`);
                  setFound([]);
                  onPick(airport.code);
                }}
              >
                {airport.code} · {airport.name}
                {airport.city && airport.city !== airport.name ? `, ${airport.city}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const clock = (iso: string) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '');
const hours = (minutes: number) => (minutes ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim() : '');
const nextDay = (from: string, to: string) => (from && to && to.slice(0, 10) > from.slice(0, 10) ? ' (+1)' : '');

/** Flights between two airports for the trip's dates, with prices; the booking opens on Google Flights. */
export function FlightSearch({ target }: { target: Target }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [state, setState] = useState<{ offers?: FlightOffer[]; problem?: string; busy?: boolean }>({});
  const [open, setOpen] = useState<string>();
  const search = () => {
    if (!from || !to || !target.start) return;
    setState({ busy: true });
    searchFlights({ from, to, depart: target.start, return: target.end && target.end > target.start ? target.end : undefined, adults: target.travelers })
      .then((offers) => setState({ offers }))
      .catch((error: Error) => setState({ problem: error.message }));
  };
  if (!target.start) return <p className="muted">No dates on this trip yet.</p>;
  return (
    <>
      <div className="input-row">
        <AirportField label="From" value={from} onPick={setFrom} />
        <AirportField label="To" value={to} onPick={setTo} />
      </div>
      <button type="button" className="button-quiet" disabled={!from || !to || state.busy} onClick={search}>
        {state.busy ? <Waiting>Searching…</Waiting> : 'Search flights'}
      </button>
      {state.problem && <p className="muted">{state.problem}</p>}
      {state.offers?.length === 0 && <p className="muted">No flights found for these dates.</p>}
      {state.offers && state.offers.length > 0 && (
        <ul className="poreia-flights">
          {state.offers.slice(0, 20).map((offer) => (
            <li key={offer.id}>
              <button type="button" className="poreia-flight" aria-expanded={open === offer.id} onClick={() => setOpen(open === offer.id ? undefined : offer.id)}>
                <span className="poreia-flight__price">{moneyText({ cents: cents(offer.price.amount), currency: offer.price.currency })}</span>
                <span className="poreia-flight__airline">{offer.airline}</span>
                {offer.slices.map((slice, index) => (
                  <span key={index} className="poreia-flight__slice">
                    {slice.from} {clock(slice.departs)} → {slice.to} {clock(slice.arrives)}
                    {nextDay(slice.departs, slice.arrives)}
                    <span className="muted"> · {hours(slice.minutes)} · {slice.stops === 0 ? 'Nonstop' : `${slice.stops} ${slice.stops === 1 ? 'stop' : 'stops'}`}</span>
                  </span>
                ))}
              </button>
              {open === offer.id && (
                <div className="poreia-flight__more">
                  <p className="muted">{offer.slices.map((slice) => slice.flights.join(', ')).join(' · return ')}</p>
                  <Outbound href={flightLink(offer.slices.flatMap((slice) => slice.flights), from, to, target.start!, target.end).url}>Book on Google Flights</Outbound>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {state.offers && state.offers.length > 0 && <p className="fine">Prices for all travelers, from Duffel.</p>}
    </>
  );
}
