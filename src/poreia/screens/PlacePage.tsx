import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { deviceKind } from '../../app/install/installPrompt';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { newId, nowStamp, plans, spots, today, trips } from '../app/state';
import { dayText, Outbound } from '../app/ui';
import MapView from '../components/MapView';
import { GoogleDetails } from '../components/GoogleDetails';
import { directionsTo, stayLinks } from '../core/links';
import { tripDates } from '../core/model';
import { categoryLabel, type Spot } from '../core/spots';

const SOURCE: Record<Spot['source'], { name: string; href: string }> = {
  map: { name: 'OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
  guide: { name: 'Wikivoyage (CC BY-SA)', href: 'https://en.wikivoyage.org/' },
  event: { name: 'Ticketmaster', href: 'https://www.ticketmaster.com/' },
  stay: { name: 'LiteAPI', href: 'https://www.liteapi.travel/' },
};

/** One place, in the app: where it is, what is known about it, and what to do with it (save, add to a day, go). */
export default function PlacePage({ nav, spot, tripId }: { nav: PoreiaNav; spot: Spot; tripId?: string }) {
  const all = trips.use();
  const savedList = spots.use();
  const [chosenTrip, setChosenTrip] = useState(tripId ?? all.find((trip) => (trip.end ?? trip.start ?? '') >= today())?.id ?? all[0]?.id ?? '');
  const trip = all.find((each) => each.id === chosenTrip);
  const ref = spot.ref ?? spot.id;
  const saved = savedList.find((each) => each.tripId === chosenTrip && (each.ref ?? each.id) === ref);
  const dates = trip ? tripDates(trip) : [];
  const [date, setDate] = useState(dates.includes(today()) ? today() : (dates[0] ?? ''));
  const [time, setTime] = useState('');
  const apple = deviceKind() === 'iphone' || /Mac/.test(navigator.platform);

  const save = () => {
    if (!trip) return;
    const kept: Spot = { ...spot, id: newId(), ref, tripId: trip.id, createdAt: nowStamp() };
    spots.put(kept);
    offerUndo(`“${spot.name}” saved to ${trip.name}`, () => spots.remove(kept.id));
  };
  const unsave = () => {
    if (!saved) return;
    spots.remove(saved.id);
    offerUndo(`“${spot.name}” removed from ${trip?.name ?? 'the trip'}`, () => spots.put(saved));
  };
  const addToDay = () => {
    if (!trip || !date) return;
    const item = { id: newId(), tripId: trip.id, date, time: time || undefined, title: spot.name, where: spot.address, lat: spot.lat, lon: spot.lon, url: spot.url, createdAt: nowStamp(), updatedAt: nowStamp() };
    plans.put(item);
    offerUndo(`“${spot.name}” added, ${dayText(date)}`, () => plans.remove(item.id));
  };

  return (
    <div className="page poreia-page poreia-place-page">
      <BackLink label={tripId ? (all.find((each) => each.id === tripId)?.name ?? 'Back') : 'Back'} onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{spot.name}</h1>
        <p className="muted">{[spot.kind, spot.source === 'guide' ? `From the guide · ${categoryLabel(spot.category)}` : undefined].filter(Boolean).join(' · ')}</p>
      </div>
      {spot.image && <img className="poreia-place-page__photo" src={spot.image} alt="" />}

      {spot.lat !== undefined && spot.lon !== undefined && (
        <MapView center={{ lat: spot.lat, lon: spot.lon }} pins={[{ id: spot.id, lat: spot.lat, lon: spot.lon, label: spot.name, category: spot.category }]} chosen={spot.id} zoom={15} height="13rem" label={`Map of ${spot.name}`} />
      )}

      <div className="button-row">
        <a className="button-main" href={directionsTo(spot.name, spot.lat, spot.lon, apple)} target="_blank" rel="noopener noreferrer">
          Directions
        </a>
        {spot.url && (
          <a className="button-quiet" href={spot.url} target="_blank" rel="noopener noreferrer">
            {spot.source === 'event' ? 'Tickets' : 'Website'}
          </a>
        )}
        {spot.phone && (
          <a className="button-quiet" href={`tel:${spot.phone.replace(/[^\d+]/g, '')}`}>
            Call
          </a>
        )}
      </div>

      {spot.about && <p>{spot.about}</p>}

      <GoogleDetails name={spot.name} lat={spot.lat} lon={spot.lon} />

      {(spot.address || spot.hours || spot.price || spot.phone || spot.details?.length) && (
        <dl className="detail-list">
          {spot.address && (
            <>
              <dt>{spot.source === 'event' ? 'Venue' : 'Address'}</dt>
              <dd>{spot.address}</dd>
            </>
          )}
          {spot.hours && (
            <>
              <dt>{spot.source === 'event' ? 'When' : 'Hours'}</dt>
              <dd>{spot.hours}</dd>
            </>
          )}
          {spot.price && (
            <>
              <dt>Price</dt>
              <dd>{spot.price}</dd>
            </>
          )}
          {spot.phone && (
            <>
              <dt>Phone</dt>
              <dd>{spot.phone}</dd>
            </>
          )}
          {spot.details?.map((line) => (
            <span key={line} style={{ display: 'contents' }}>
              <dt>Also</dt>
              <dd>{line}</dd>
            </span>
          ))}
        </dl>
      )}

      {spot.source === 'stay' && (
        <section className="card">
          <h2 className="card__title">Book it</h2>
          <ul className="poreia-links">
            {stayLinks(spot.name, trip?.place?.name ?? '', trip?.start, trip?.end, trip?.travelers).map((link) => (
              <li key={link.site}>
                <Outbound href={link.url}>
                  <span>{link.site}</span>
                  <span className="muted">Opens this stay with your dates</span>
                </Outbound>
              </li>
            ))}
          </ul>
        </section>
      )}

      {all.length > 0 ? (
        <section className="card">
          <h2 className="card__title">{tripId && trip ? trip.name : 'Keep it for a trip'}</h2>
          {!tripId && (
            <label className="field">
              <span className="field__label">Trip</span>
              <select className="input" value={chosenTrip} onChange={(event) => setChosenTrip(event.target.value)}>
                {all.map((each) => (
                  <option key={each.id} value={each.id}>
                    {each.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {saved ? (
            <button type="button" className="button-quiet" onClick={unsave}>
              Saved · Remove
            </button>
          ) : (
            <button type="button" className="button-quiet" onClick={save}>
              Save to {trip?.name ?? 'the trip'}
            </button>
          )}
          {dates.length > 0 && (
            <>
              <p className="label">Add to a day</p>
              <div className="input-row">
                <label className="field">
                  <span className="field__label">Day</span>
                  <select className="input" value={date} onChange={(event) => setDate(event.target.value)}>
                    {dates.map((each) => (
                      <option key={each} value={each}>
                        {dayText(each)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">Time</span>
                  <input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                </label>
              </div>
              <button type="button" className="button-quiet" disabled={!date} onClick={addToDay}>
                Add to {date ? dayText(date) : 'the day'}
              </button>
            </>
          )}
        </section>
      ) : (
        <p className="muted">Add a trip to save places.</p>
      )}

      <p className="fine">
        From <Outbound href={SOURCE[spot.source].href}>{SOURCE[spot.source].name}</Outbound>
        .
      </p>
    </div>
  );
}
