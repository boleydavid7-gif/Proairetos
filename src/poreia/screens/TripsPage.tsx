import { useState } from 'react';
import type { Nav } from '../app/App';
import { PlusIcon, TripsIcon } from '../app/icons';
import { useTrips } from '../app/state';
import { newId } from '../core/id';
import type { Trip, TripStatus } from '../core/trips';
import { putTrip } from '../data/store';
import { PageTop, PoreiaHeader } from '../app/ui';

const statuses: TripStatus[] = ['idea', 'planning', 'tentative', 'booked', 'in-progress', 'completed', 'canceled'];
const today = () => new Date().toISOString().slice(0, 10);

function TripForm() {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TripStatus>('idea');
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || (startDate && endDate && endDate < startDate)) return;
    const now = new Date().toISOString();
    const trip: Trip = { id: newId(), name: trimmed, destination: destination.trim() || undefined, startDate: startDate || undefined, endDate: endDate || undefined, status, travelers: [], createdAt: now, updatedAt: now };
    await putTrip(trip);
    setName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setStatus('idea');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  return <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="poreia-section-head"><h2>Start a trip</h2><PlusIcon size={22} /></div>
    <label className="field"><span className="field__label">Trip name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="A week by the coast" required /></label>
    <label className="field"><span className="field__label">Destination</span><input className="input" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Optional while you explore" /></label>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">First day</span><input className="input" type="date" min={today()} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span className="field__label">Last day</span><input className="input" type="date" min={startDate || today()} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    <label className="field"><span className="field__label">Planning status</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value as TripStatus)}>{statuses.map((item) => <option key={item} value={item}>{item === 'in-progress' ? 'In progress' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
    <button type="submit" className="button-main">{saved ? 'Trip saved' : 'Save trip'}</button>
  </form>;
}

export default function TripsPage({ nav }: { nav: Nav }) {
  const trips = useTrips().sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999'));
  return <div className="page poreia-page"><PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop><PoreiaHeader eyebrow="Your travel workspace" title="Trips" />
    <div className="page page--under-hero">
      <TripForm />
      <section className="poreia-section"><div className="poreia-section-head"><h2>Trip workspaces</h2><span className="label">{trips.length}</span></div>{trips.length === 0 ? <div className="card poreia-empty"><TripsIcon size={28} /><p className="muted">Your first trip can start as an idea. Add dates later when the window becomes clear.</p></div> : <div className="poreia-list">{trips.map((trip) => <button type="button" className="poreia-row poreia-row--button" key={trip.id} onClick={() => nav.swap({ name: 'calendar' })}><TripsIcon size={22} /><span className="poreia-row__text"><strong>{trip.name}</strong><small>{trip.destination || 'Destination to decide'} · {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : 'Dates to decide'}</small></span><span className="poreia-balance">{trip.status === 'in-progress' ? 'In progress' : trip.status}</span></button>)}</div>}</section>
    </div>
  </div>;
}
