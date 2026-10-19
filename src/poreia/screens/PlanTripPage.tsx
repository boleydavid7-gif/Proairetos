import { useMemo, useState, type ReactNode } from 'react';
import type { Nav } from '../app/App';
import { CalendarIcon, CheckIcon, ChevronIcon, DiscoverIcon, PtoIcon, TripsIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { newId } from '../core/id';
import type { Trip, TripStatus } from '../core/trips';
import { putTrip } from '../data/store';
import valleyWide from '../../assets/images/scenes/valley-wide.webp';

type TripType = 'vacation' | 'road-trip' | 'camping' | 'weekend';
type Step = 1 | 2 | 3 | 4 | 5;

const steps: { id: Step; label: string }[] = [
  { id: 1, label: 'Type' },
  { id: 2, label: 'Destination' },
  { id: 3, label: 'Dates' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Review' },
];

const typeOptions: { id: TripType; label: string; description: string; Icon: (props: { size?: number }) => ReactNode }[] = [
  { id: 'vacation', label: 'Vacation', description: 'Leisure travel', Icon: TripsIcon },
  { id: 'road-trip', label: 'Road trip', description: 'Drive and explore', Icon: DiscoverIcon },
  { id: 'camping', label: 'Camping', description: 'Outdoor adventure', Icon: TargetIcon },
  { id: 'weekend', label: 'Weekend getaway', description: 'Short and relaxing', Icon: PtoIcon },
];

function TargetIcon({ size = 24 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19 12 5l8 14" /><path d="M7 16h10" /><path d="M9 12h6" /></svg>;
}

function labelForType(type: TripType): string {
  return typeOptions.find((item) => item.id === type)?.label ?? 'Vacation';
}

function PlanTripPage({ nav }: { nav: Nav }) {
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<TripType>('vacation');
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedLabel = useMemo(() => labelForType(type), [type]);
  const dateSummary = startDate && endDate ? `${startDate} – ${endDate}` : startDate ? `From ${startDate}` : 'Dates to decide';

  const next = () => {
    setError('');
    if (step === 3 && startDate && endDate && endDate < startDate) {
      setError('The last day must be on or after the first day.');
      return;
    }
    setStep((current) => Math.min(5, current + 1) as Step);
  };

  const save = async () => {
    setError('');
    setSaving(true);
    const now = new Date().toISOString();
    const trip: Trip = {
      id: newId(),
      name: name.trim() || (destination.trim() ? `${destination.trim()} trip` : `${selectedLabel} trip`),
      destination: destination.trim() || undefined,
      tripType: type,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      travelers: travelers.split(',').map((item) => item.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
      status: (startDate && endDate ? 'planning' : 'idea') as TripStatus,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await putTrip(trip);
      nav.swap({ name: 'trip', id: trip.id });
    } catch {
      setError('This trip could not be saved. Try again.');
      setSaving(false);
    }
  };

  return <main className="poreia-plan" data-no-title-anchor="" style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 18, 32, 0.18), rgba(5, 18, 32, 0.96) 78%), url(${valleyWide})` }}>
    <header className="poreia-plan__header"><button type="button" className="poreia-plan__circle" aria-label="Back" onClick={nav.back}><ChevronIcon size={22} /></button><Brand light /><button type="button" className="poreia-plan__circle" aria-label="Close" onClick={nav.back}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
    <div className="poreia-plan__progress" aria-label={`Step ${step} of 5`}><div className="poreia-plan__progress-line" aria-hidden="true" />{steps.map((item) => <div className={`poreia-plan__step${item.id === step ? ' is-current' : ''}${item.id < step ? ' is-complete' : ''}`} key={item.id}><span>{item.id < step ? <CheckIcon size={16} /> : item.id}</span><small>{item.label}</small></div>)}</div>
    <div className="poreia-plan__content">
      {step === 1 && <section className="poreia-plan__step-content"><p className="label">Step 1 of 5</p><h1>Plan a trip</h1><p className="poreia-plan__intro">Let’s start with the basics. You can always change these later.</p><h2>What type of trip is this?</h2><div className="poreia-plan__type-grid">{typeOptions.map(({ id, label, description, Icon }) => <button type="button" className={`poreia-plan__type${type === id ? ' is-selected' : ''}`} aria-pressed={type === id} key={id} onClick={() => setType(id)}><Icon size={32} /><strong>{label}</strong><small>{description}</small></button>)}</div><label className="poreia-plan__field"><span>Give your trip a name <small>(optional)</small></span><span className="poreia-plan__input-wrap"><CalendarIcon size={22} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Summer in Italy, National Park Trip" /></span></label><div className="poreia-plan__hint"><DiscoverIcon size={22} /><span><strong>Need ideas?</strong><small>We can suggest a name based on your destination later.</small></span></div></section>}
      {step === 2 && <section className="poreia-plan__step-content"><p className="label">Step 2 of 5</p><h1>Where are you going?</h1><p className="poreia-plan__intro">Choose a destination now or leave it open while you explore.</p><label className="poreia-plan__field"><span>Destination <small>(optional)</small></span><span className="poreia-plan__input-wrap"><DiscoverIcon size={22} /><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="City, region, or country" autoFocus /></span></label><div className="poreia-plan__hint"><DiscoverIcon size={22} /><span><strong>Need inspiration?</strong><small>Explore destinations and save a place to this trip later.</small></span></div></section>}
      {step === 3 && <section className="poreia-plan__step-content"><p className="label">Step 3 of 5</p><h1>When will you go?</h1><p className="poreia-plan__intro">Dates can stay tentative. You can connect your calendar later.</p><div className="poreia-plan__date-pair"><label className="poreia-plan__field"><span>First day</span><span className="poreia-plan__input-wrap"><CalendarIcon size={22} /><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></span></label><label className="poreia-plan__field"><span>Last day</span><span className="poreia-plan__input-wrap"><CalendarIcon size={22} /><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></span></label></div><div className="poreia-plan__hint"><CalendarIcon size={22} /><span><strong>Need help finding dates?</strong><small>Proairetos calendar and Vacation Time can suggest windows later.</small></span></div></section>}
      {step === 4 && <section className="poreia-plan__step-content"><p className="label">Step 4 of 5</p><h1>Make it yours</h1><p className="poreia-plan__intro">Add the details that will help you pick this trip back up later.</p><label className="poreia-plan__field"><span>Who is going? <small>(optional)</small></span><span className="poreia-plan__input-wrap"><TripsIcon size={22} /><input value={travelers} onChange={(event) => setTravelers(event.target.value)} placeholder="Names separated by commas" /></span></label><label className="poreia-plan__field"><span>Notes <small>(optional)</small></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What do you want to remember?" rows={4} /></label></section>}
      {step === 5 && <section className="poreia-plan__step-content"><p className="label">Step 5 of 5</p><h1>Review your trip</h1><p className="poreia-plan__intro">You can keep shaping every detail after you save.</p><div className="poreia-plan__review"><div><span>Trip type</span><strong>{selectedLabel}</strong></div><div><span>Name</span><strong>{name.trim() || (destination.trim() ? `${destination.trim()} trip` : `${selectedLabel} trip`)}</strong></div><div><span>Destination</span><strong>{destination.trim() || 'To decide'}</strong></div><div><span>Dates</span><strong>{dateSummary}</strong></div><div><span>Travelers</span><strong>{travelers.trim() || 'To add later'}</strong></div></div>{error && <p className="form-error" role="alert">{error}</p>}</section>}
    </div>
    <div className="poreia-plan__footer">{step > 1 && <button type="button" className="button-quiet" onClick={() => { setError(''); setStep((current) => Math.max(1, current - 1) as Step); }}>Back</button>}{step < 5 ? <button type="button" className="button-main" onClick={next}>Next <ChevronIcon size={22} /></button> : <button type="button" className="button-main" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Create trip'} <CheckIcon size={20} /></button>}</div>
  </main>;
}

export default PlanTripPage;
