import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, CheckIcon, TripsIcon } from '../app/icons';
import { useAddedApps } from '../../app/family/added';
import { useBookings, useItineraryItems, useSavingsPlans, useTrips } from '../app/state';
import { newId } from '../core/id';
import { savingsContribution, type SavingsCadence, type TripSavingsPlan } from '../core/savings';
import { dateText } from '../core/pto';
import { bookingRemaining, tripRemainingCost, type Booking, type BookingStatus, type BookingType, type ItineraryItem, type ItineraryItemStatus, type Trip } from '../core/trips';
import { putBooking, putItineraryItem, putSavingsPlan } from '../data/store';
import { syncPlanToOikonomia } from '../data/oikonomiaBridge';
import { formatDate, formatMoney } from '../../oikonomia/core/bills';
import { loadSettings } from '../../oikonomia/data/store';
import { BackLink, PageTop, PoreiaHeader } from '../app/ui';

const itineraryStatuses: ItineraryItemStatus[] = ['planned', 'confirmed', 'completed', 'canceled'];
const bookingTypes: BookingType[] = ['flight', 'lodging', 'rental-car', 'train', 'cruise', 'bus', 'tour', 'restaurant', 'ticket', 'other'];
const bookingStatuses: BookingStatus[] = ['planned', 'reserved', 'confirmed', 'canceled', 'refunded', 'completed'];

const labelFor = (value: string) => value === 'rental-car' ? 'Rental car' : value === 'in-progress' ? 'In progress' : value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
const moneyCents = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : undefined;
};
const dateLabel = (value?: string) => value ? formatDate(value, 'long') : 'Date to decide';

function ItineraryForm({ tripId }: { tripId: string }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<ItineraryItemStatus>('planned');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed || (startTime && endTime && endTime <= startTime)) return;
    const now = new Date().toISOString();
    const item: ItineraryItem = {
      id: newId(), tripId, title: trimmed, date: date || undefined, startTime: startTime || undefined,
      endTime: endTime || undefined, location: location.trim() || undefined, expectedCostCents: moneyCents(cost),
      travelers: [], status, createdAt: now, updatedAt: now,
    };
    await putItineraryItem(item);
    setTitle(''); setDate(''); setStartTime(''); setEndTime(''); setLocation(''); setCost(''); setStatus('planned');
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  };

  return <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="poreia-section-head"><h2>Add an itinerary item</h2><CalendarIcon size={22} /></div>
    <label className="field"><span className="field__label">What are you doing?</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Museum visit or dinner reservation" required /></label>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Day</span><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field"><span className="field__label">Location</span><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Optional" /></label></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Starts</span><input className="input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label className="field"><span className="field__label">Ends</span><input className="input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Expected cost (USD)</span><input className="input" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Optional" /></label><label className="field"><span className="field__label">Status</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value as ItineraryItemStatus)}>{itineraryStatuses.map((item) => <option key={item} value={item}>{labelFor(item)}</option>)}</select></label></div>
    <button type="submit" className="button-main">{saved ? 'Item saved' : 'Add to itinerary'}</button>
  </form>;
}

function BookingForm({ tripId }: { tripId: string }) {
  const [type, setType] = useState<BookingType>('lodging');
  const [provider, setProvider] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [total, setTotal] = useState('');
  const [paid, setPaid] = useState('');
  const [status, setStatus] = useState<BookingStatus>('planned');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const trimmed = provider.trim();
    if (!trimmed || (startDate && endDate && endDate < startDate)) return;
    const now = new Date().toISOString();
    const booking: Booking = {
      id: newId(), tripId, type, provider: trimmed, confirmationNumber: confirmationNumber.trim() || undefined,
      startDate: startDate || undefined, endDate: endDate || undefined, totalCents: moneyCents(total), amountPaidCents: moneyCents(paid),
      currency: 'USD', status, createdAt: now, updatedAt: now,
    };
    await putBooking(booking);
    setProvider(''); setConfirmationNumber(''); setStartDate(''); setEndDate(''); setTotal(''); setPaid(''); setType('lodging'); setStatus('planned');
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  };

  return <form className="card poreia-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="poreia-section-head"><h2>Add a reservation</h2><TripsIcon size={22} /></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Type</span><select className="input" value={type} onChange={(event) => setType(event.target.value as BookingType)}>{bookingTypes.map((item) => <option key={item} value={item}>{labelFor(item)}</option>)}</select></label><label className="field"><span className="field__label">Provider</span><input className="input" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Airline, hotel, or venue" required /></label></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">First day</span><input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span className="field__label">Last day</span><input className="input" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Total (USD)</span><input className="input" inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="Optional" /></label><label className="field"><span className="field__label">Paid (USD)</span><input className="input" inputMode="decimal" value={paid} onChange={(event) => setPaid(event.target.value)} placeholder="Optional" /></label></div>
    <div className="poreia-form__pair"><label className="field"><span className="field__label">Confirmation number</span><input className="input" value={confirmationNumber} onChange={(event) => setConfirmationNumber(event.target.value)} placeholder="Optional" /></label><label className="field"><span className="field__label">Status</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value as BookingStatus)}>{bookingStatuses.map((item) => <option key={item} value={item}>{labelFor(item)}</option>)}</select></label></div>
    <button type="submit" className="button-main">{saved ? 'Reservation saved' : 'Save reservation'}</button>
  </form>;
}

function ItineraryList({ items }: { items: ItineraryItem[] }) {
  if (items.length === 0) return <div className="card poreia-empty"><CalendarIcon size={28} /><p className="muted">Keep the days flexible or add the first thing you know you want to do.</p></div>;
  return <div className="poreia-list">{items.map((item) => <div className="poreia-row poreia-row--stack" key={item.id}><div className="poreia-row__text"><strong>{item.title}</strong><small>{dateLabel(item.date)}{item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : ''}{item.location ? ` · ${item.location}` : ''}</small></div><span className="poreia-balance">{labelFor(item.status)}</span>{item.expectedCostCents !== undefined && <small className="poreia-row__amount">{formatMoney(item.expectedCostCents)}</small>}</div>)}</div>;
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) return <div className="card poreia-empty"><TripsIcon size={28} /><p className="muted">Add a flight, stay, activity, or other reservation when it is booked.</p></div>;
  return <div className="poreia-list">{bookings.map((booking) => { const remaining = bookingRemaining(booking); return <div className="poreia-row poreia-row--stack" key={booking.id}><div className="poreia-row__text"><strong>{booking.provider}</strong><small>{labelFor(booking.type)} · {dateLabel(booking.startDate)}{booking.endDate && booking.endDate !== booking.startDate ? ` – ${dateLabel(booking.endDate)}` : ''}{booking.confirmationNumber ? ` · ${booking.confirmationNumber}` : ''}</small></div><span className="poreia-balance">{labelFor(booking.status)}</span>{booking.totalCents !== undefined && <small className="poreia-row__amount">{remaining > 0 ? `${formatMoney(remaining, booking.currency)} left` : 'Paid'}</small>}</div>; })}</div>;
}

function TripReadiness({ trip, items, bookings, plan }: { trip: Trip; items: ItineraryItem[]; bookings: Booking[]; plan?: TripSavingsPlan }) {
  const checks = [
    { label: 'Dates chosen', done: Boolean(trip.startDate && trip.endDate) },
    { label: 'A reservation recorded', done: bookings.length > 0 },
    { label: 'Itinerary started', done: items.length > 0 },
    { label: 'Savings plan set', done: Boolean(plan) },
  ];
  const complete = checks.filter((check) => check.done).length;
  return <section className="card poreia-card poreia-section"><div className="poreia-section-head"><h2>Trip readiness</h2><span className="label">{complete} of {checks.length}</span></div><div className="poreia-progress" role="progressbar" aria-label="Trip readiness" aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={complete}><span style={{ width: `${(complete / checks.length) * 100}%` }} /></div><div className="poreia-readiness-list">{checks.map((check) => <span key={check.label} className={check.done ? 'poreia-readiness-item poreia-readiness-item--done' : 'poreia-readiness-item'} aria-label={`${check.label}: ${check.done ? 'complete' : 'not started'}`}><span className="poreia-readiness-marker" aria-hidden="true">{check.done ? <CheckIcon size={16} /> : <span className="poreia-readiness-empty" />}</span>{check.label}</span>)}</div></section>;
}

function SavingsPlanner({ trip, items, bookings, plan }: { trip: Trip; items: ItineraryItem[]; bookings: Booking[]; plan?: TripSavingsPlan }) {
  const added = useAddedApps();
  const oikonomiaAvailable = added.includes('oikonomia');
  const currency = bookings.find((booking) => booking.currency)?.currency ?? (oikonomiaAvailable ? loadSettings().currency : 'USD');
  const estimated = tripRemainingCost(bookings, items);
  const [target, setTarget] = useState(plan ? (plan.targetCents / 100).toFixed(2) : '');
  const [startDate, setStartDate] = useState(plan?.startDate ?? dateText(new Date()));
  const [cadence, setCadence] = useState<SavingsCadence>(plan?.cadence ?? 'monthly');
  const [saved, setSaved] = useState(plan ? (plan.savedCents / 100).toFixed(2) : '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan && !target && estimated > 0) setTarget((estimated / 100).toFixed(2));
  }, [estimated, plan, target]);

  const targetCents = moneyCents(target) ?? 0;
  const savedCents = moneyCents(saved) ?? 0;
  const contribution = savingsContribution(targetCents, savedCents, startDate, trip.startDate, cadence);
  const save = async () => {
    if (targetCents <= 0 || (trip.startDate && startDate > trip.startDate)) {
      setMessage(trip.startDate && startDate > trip.startDate ? 'Start saving on or before the trip date.' : 'Add a trip savings target first.');
      return;
    }
    setSaving(true); setMessage('');
    const now = new Date().toISOString();
    const next: TripSavingsPlan = { id: plan?.id ?? newId(), tripId: trip.id, targetCents, currency, startDate, targetDate: trip.startDate, cadence, contributionCents: contribution, savedCents, ...(plan?.createdAt ? { createdAt: plan.createdAt } : { createdAt: now }), updatedAt: now };
    const linked = oikonomiaAvailable ? await syncPlanToOikonomia(next) : { available: false };
    await putSavingsPlan({ ...next, ...(linked.envelope ? { envelopeId: linked.envelope.id } : {}) });
    setSaving(false);
    setMessage(linked.available ? 'Saved and linked to Oikonomia’s Vacation envelope.' : 'Saved in Poreia. Add Oikonomia later to mirror this plan.');
  };

  return <section className="card poreia-card poreia-section poreia-savings"><div className="poreia-section-head"><h2>Save for this trip</h2><span className="label">{oikonomiaAvailable ? 'Oikonomia linked' : 'Poreia plan'}</span></div><p className="muted">{estimated > 0 ? `${formatMoney(estimated, currency)} is still estimated or unpaid.` : 'Set a target now; you can refine it as reservations are added.'}{trip.startDate ? ` Trip date: ${dateLabel(trip.startDate)}.` : ' Add trip dates to calculate a schedule.'}</p><div className="poreia-form__pair"><label className="field"><span className="field__label">Savings target ({currency})</span><input className="input" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="2,000" /></label><label className="field"><span className="field__label">Start saving</span><input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label></div><div className="poreia-form__pair"><label className="field"><span className="field__label">Contribution cadence</span><select className="input" value={cadence} onChange={(event) => setCadence(event.target.value as SavingsCadence)}><option value="weekly">Every week</option><option value="biweekly">Every two weeks</option><option value="monthly">Every month</option></select></label>{oikonomiaAvailable ? <div className="poreia-savings-fact"><span className="field__label">Suggested contribution</span><strong>{formatMoney(contribution, currency)} {cadence === 'monthly' ? 'monthly' : cadence === 'weekly' ? 'weekly' : 'every two weeks'}</strong></div> : <label className="field"><span className="field__label">Already saved ({currency})</span><input className="input" inputMode="decimal" value={saved} onChange={(event) => setSaved(event.target.value)} placeholder="0" /></label>}</div>{!oikonomiaAvailable && <p className="hint">Poreia will keep this plan here until Oikonomia is added. Its Vacation envelope is never created while that app is unavailable.</p>}{message && <p className="form-success" role="status">{message}</p>}<button type="button" className="button-main" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : plan ? 'Update savings plan' : 'Create savings plan'}</button></section>;
}

export default function TripDetailPage({ nav, tripId }: { nav: Nav; tripId: string }) {
  const trips = useTrips();
  const items = useItineraryItems();
  const bookings = useBookings();
  const savingsPlans = useSavingsPlans();
  const trip = trips.find((item) => item.id === tripId);
  const tripItems = useMemo(() => items.filter((item) => item.tripId === tripId).sort((a, b) => `${a.date ?? '9999'}${a.startTime ?? ''}`.localeCompare(`${b.date ?? '9999'}${b.startTime ?? ''}`)), [items, tripId]);
  const tripBookings = useMemo(() => bookings.filter((item) => item.tripId === tripId).sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999')), [bookings, tripId]);
  const savingsPlan = savingsPlans.find((item) => item.tripId === tripId);

  if (!trip) return <div className="page poreia-page"><PageTop><BackLink onBack={nav.back} /></PageTop><PoreiaHeader eyebrow="Trip workspace" title="Trip not found" /><div className="page page--under-hero"><div className="card poreia-empty"><p className="muted">This trip may have been removed on another device.</p><button type="button" className="button-main" onClick={nav.back}>Back to trips</button></div></div></div>;

  return <div className="page poreia-page"><PageTop><BackLink onBack={nav.back} /></PageTop><PoreiaHeader eyebrow={trip.destination || 'Trip workspace'} title={trip.name}><span className="poreia-header__status">{labelFor(trip.status)}</span></PoreiaHeader>
    <div className="page page--under-hero poreia-trip-detail">
      <section className="card poreia-card poreia-trip-summary"><div className="poreia-section-head"><h2>Trip overview</h2><span className="label">{tripItems.length} itinerary · {tripBookings.length} reservations</span></div><p className="muted">{trip.startDate && trip.endDate ? `${dateLabel(trip.startDate)} – ${dateLabel(trip.endDate)}` : 'Dates are still open'}{trip.destination ? ` · ${trip.destination}` : ''}</p></section>
      <TripReadiness trip={trip} items={tripItems} bookings={tripBookings} plan={savingsPlan} />
      <SavingsPlanner trip={trip} items={tripItems} bookings={tripBookings} plan={savingsPlan} />
      <ItineraryForm tripId={trip.id} />
      <section className="poreia-section"><div className="poreia-section-head"><h2>Itinerary</h2><span className="label">{tripItems.length}</span></div><ItineraryList items={tripItems} /></section>
      <BookingForm tripId={trip.id} />
      <section className="poreia-section"><div className="poreia-section-head"><h2>Reservations</h2><span className="label">{tripBookings.length}</span></div><BookingList bookings={tripBookings} /></section>
    </div>
  </div>;
}
