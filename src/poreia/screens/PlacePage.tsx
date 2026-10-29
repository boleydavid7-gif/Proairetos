import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { dayText } from '../app/ui';
import { newId, nowStamp, plans, spots, today, trips } from '../app/state';
import { tripDates } from '../core/model';
import { categoryLabel, type Spot } from '../core/spots';

/** A saved place kept entirely on the device, with simple actions for organizing a trip. */
export default function PlacePage({ nav, spot, tripId }: { nav: PoreiaNav; spot: Spot; tripId?: string }) {
  const all = trips.use();
  const savedList = spots.use();
  const [chosenTrip, setChosenTrip] = useState(tripId ?? all.find((trip) => (trip.end ?? trip.start ?? '') >= today())?.id ?? all[0]?.id ?? '');
  const trip = all.find((each) => each.id === chosenTrip);
  const ref = spot.ref ?? spot.id;
  const saved = savedList.find((each) => each.tripId === chosenTrip && (each.ref ?? each.id) === ref);
  const savedIdea = savedList.find((each) => !each.tripId && (each.ref ?? each.id) === ref);
  const dates = trip ? tripDates(trip) : [];
  const [date, setDate] = useState(dates.includes(today()) ? today() : (dates[0] ?? ''));
  const [time, setTime] = useState('');

  const saveToTrip = () => {
    if (!trip) return;
    const kept: Spot = { ...spot, id: newId(), ref, tripId: trip.id, createdAt: nowStamp() };
    spots.put(kept);
    offerUndo(`“${spot.name}” saved to ${trip.name}`, () => spots.remove(kept.id));
  };
  const removeFromTrip = () => {
    if (!saved) return;
    spots.remove(saved.id);
    offerUndo(`“${spot.name}” removed from ${trip?.name ?? 'the trip'}`, () => spots.put(saved));
  };
  const saveIdea = () => {
    if (savedIdea) return;
    const kept: Spot = { ...spot, id: newId(), ref, tripId: undefined, createdAt: nowStamp() };
    spots.put(kept);
    offerUndo(`“${spot.name}” saved as an idea`, () => spots.remove(kept.id));
  };
  const removeIdea = () => {
    if (!savedIdea) return;
    spots.remove(savedIdea.id);
    offerUndo(`“${spot.name}” removed from saved ideas`, () => spots.put(savedIdea));
  };
  const addToDay = () => {
    if (!trip || !date) return;
    const now = nowStamp();
    const item = { id: newId(), tripId: trip.id, date, time: time || undefined, title: spot.name, where: spot.address, lat: spot.lat, lon: spot.lon, url: spot.url, createdAt: now, updatedAt: now };
    plans.put(item);
    offerUndo(`“${spot.name}” added, ${dayText(date)}`, () => plans.remove(item.id));
  };

  return (
    <div className="page poreia-page poreia-place-page">
      <BackLink label={tripId ? (all.find((each) => each.id === tripId)?.name ?? 'Back') : 'Back'} onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{spot.name}</h1>
        <p className="muted">{[spot.kind, spot.category ? categoryLabel(spot.category) : undefined].filter(Boolean).join(' · ')}</p>
      </div>
      {spot.about && <p>{spot.about}</p>}
      {(spot.address || spot.hours || spot.price || spot.phone || spot.details?.length) && (
        <dl className="detail-list">
          {spot.address && <><dt>Address</dt><dd>{spot.address}</dd></>}
          {spot.hours && <><dt>Hours</dt><dd>{spot.hours}</dd></>}
          {spot.price && <><dt>Price</dt><dd>{spot.price}</dd></>}
          {spot.phone && <><dt>Phone</dt><dd>{spot.phone}</dd></>}
          {spot.details?.map((line) => <span key={line} style={{ display: 'contents' }}><dt>Also</dt><dd>{line}</dd></span>)}
        </dl>
      )}

      <section className="card">
        <h2 className="card__title">Keep this idea</h2>
        {savedIdea ? <button type="button" className="button-quiet" onClick={removeIdea}>Saved idea · Remove</button> : <button type="button" className="button-main" onClick={saveIdea}>Save as an idea</button>}
      </section>

      {all.length > 0 ? (
        <section className="card">
          <h2 className="card__title">{tripId && trip ? trip.name : 'Add it to a trip'}</h2>
          {!tripId && <label className="field"><span className="field__label">Trip</span><select className="input" value={chosenTrip} onChange={(event) => setChosenTrip(event.target.value)}>{all.map((each) => <option key={each.id} value={each.id}>{each.name}</option>)}</select></label>}
          {saved ? <button type="button" className="button-quiet" onClick={removeFromTrip}>Saved · Remove</button> : <button type="button" className="button-quiet" onClick={saveToTrip}>Add to {trip?.name ?? 'the trip'}</button>}
          {dates.length > 0 && <>
            <p className="label">Add to a day</p>
            <div className="input-row">
              <label className="field"><span className="field__label">Day</span><select className="input" value={date} onChange={(event) => setDate(event.target.value)}>{dates.map((each) => <option key={each} value={each}>{dayText(each)}</option>)}</select></label>
              <label className="field"><span className="field__label">Time</span><input className="input" type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            </div>
            <button type="button" className="button-quiet" disabled={!date} onClick={addToDay}>Add to {date ? dayText(date) : 'the day'}</button>
          </>}
        </section>
      ) : null}
    </div>
  );
}
