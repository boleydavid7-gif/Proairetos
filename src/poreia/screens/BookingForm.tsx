import { useRef, useState } from 'react';
import { useLaunchedFile } from '../../app/family/launchFiles';
import { Waiting } from '../../lamplight/Waiting';
import { BOOKING_FILES, fitsBooking, readBookingFile } from '../app/readFiles';
import { offerUndo, say } from '../../app/family/shell';
import { deviceKind } from '../../app/install/installPrompt';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { bookings, docs, newId, nowStamp, settings, trips, today } from '../app/state';
import { dayText, MoneyField, timeText } from '../app/ui';
import { readConfirmation, type ReadBooking } from '../core/confirmations';
import { directionsTo } from '../core/links';
import { BOOKING_KINDS, kindLabel, moneyText, type Booking, type BookingKind } from '../core/model';
import { peopleOf } from '../components/Together';
import { FlightStatusCard } from '../components/FlightNow';
import { addDays } from '../../core/scheduling/dates';
import { loyaltyFor } from '../core/documents';

const TRAVEL: BookingKind[] = ['flight', 'train', 'bus', 'cruise'];

/** A booking: pasted from its confirmation (read on the device, shown here to check) or written by hand. */
export default function BookingForm({ nav, tripId, id, kind: firstKind, paste }: { nav: PoreiaNav; tripId: string; id?: string; kind?: BookingKind; paste?: boolean }) {
  const existing = id ? bookings.get(id) : undefined;
  const allTrips = trips.use();
  // A new booking can go to any trip; it starts on the one it was opened from.
  const [chosenTrip, setChosenTrip] = useState(tripId);
  const trip = allTrips.find((each) => each.id === (existing?.tripId ?? chosenTrip));
  const fileInput = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<number>();
  const currency = settings.load().currency;
  const [form, setForm] = useState<Omit<Booking, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>>(() => existing ?? { kind: firstKind ?? 'stay', title: '', startDate: trip?.start });
  const [pasted, setPasted] = useState('');
  const [readNote, setReadNote] = useState('');
  const [showPaste, setShowPaste] = useState(Boolean(paste) && !existing);
  const [editing, setEditing] = useState(!existing);
  const set = (patch: Partial<Booking>) => setForm((current) => ({ ...current, ...patch }));

  const take = (found: ReadBooking | undefined) => {
    if (!found) {
      setReadNote('Nothing to read there. Paste the whole confirmation email, or fill in the details below.');
      return;
    }
    setForm((current) => ({ ...current, ...Object.fromEntries(Object.entries(found).filter(([, value]) => value !== undefined && value !== '')) }));
    const got = [found.confirmation && 'confirmation', found.startDate && 'dates', found.cost && 'cost', found.from && found.to && 'route'].filter(Boolean);
    setReadNote(got.length ? `Read: ${got.join(', ')}. Check them below.` : 'Read what it could. Check the details below.');
    setShowPaste(false);
  };
  const read = () => take(readConfirmation(pasted));

  // A screenshot, PDF, calendar invite or saved email: read here, then shown to check like a pasted one.
  const readFile = (file: File) => {
    setReadNote('');
    setReading(0);
    readBookingFile(file, setReading)
      .then(({ booking }) => take(booking))
      .catch(() => setReadNote('Couldn’t read that file. Paste the confirmation, or fill in the details below.'))
      .finally(() => setReading(undefined));
  };
  // Shared into Poreia from another app (Android, computers), or opened with it.
  useLaunchedFile(fitsBooking, (file) => {
    if (!existing) readFile(file);
  });

  const save = () => {
    if (!form.title.trim()) return;
    const now = nowStamp();
    const record: Booking = {
      ...form,
      title: form.title.trim(),
      endDate: form.endDate && form.startDate && form.endDate < form.startDate ? form.startDate : form.endDate || undefined,
      id: existing?.id ?? newId(),
      tripId: existing?.tripId ?? chosenTrip,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    bookings.put(record);
    if (existing) {
      offerUndo('Saved', () => bookings.put(existing));
      setEditing(false);
      return;
    }
    offerUndo(`“${record.title}” added`, () => bookings.remove(record.id));
    nav.back();
  };

  const remove = () => {
    if (!existing) return;
    bookings.remove(existing.id);
    offerUndo(`“${existing.title}” deleted`, () => bookings.put(existing));
    nav.back();
  };

  if (existing && !editing) return <BookingView nav={nav} booking={bookings.get(existing.id) ?? existing} tripName={trip?.name} onEdit={() => { setForm(bookings.get(existing.id) ?? existing); setEditing(true); }} onRemove={remove} />;

  const travel = TRAVEL.includes(form.kind);

  return (
    <div className="page poreia-page">
      <BackLink label={existing ? 'Done' : trip?.name ?? 'Trip'} onBack={existing ? () => setEditing(false) : nav.back} />
      <h1 className="title">{existing ? `Edit ${existing.title}` : 'New booking'}</h1>

      {showPaste ? (
        <section className="card">
          <label className="field">
            <span className="field__label">Paste the confirmation</span>
            <textarea className="input area" rows={8} value={pasted} placeholder="The email from the airline, hotel, Airbnb, cruise line or ticket site" onChange={(event) => setPasted(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" className="button-main" disabled={!pasted.trim()} onClick={read}>
              Read it
            </button>
            <button type="button" className="button-quiet" disabled={reading !== undefined} onClick={() => fileInput.current?.click()}>
              {reading !== undefined ? <Waiting>Reading{reading ? ` ${Math.round(reading * 100)}%` : '…'}</Waiting> : 'A file or screenshot'}
            </button>
            <button type="button" className="text-link" onClick={() => setShowPaste(false)}>
              Fill in by hand
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={BOOKING_FILES}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) readFile(file);
            }}
          />
          <p className="fine">A screenshot, PDF, calendar invite or saved email works too. Read on this device; nothing is sent.</p>
        </section>
      ) : (
        !existing && (
          <button type="button" className="text-link" onClick={() => setShowPaste(true)}>
            Paste a confirmation
          </button>
        )
      )}
      {readNote && <p className="muted" role="status">{readNote}</p>}

      {!existing && allTrips.length > 1 && (
        <label className="field">
          <span className="field__label">Trip</span>
          <select className="input" value={chosenTrip} onChange={(event) => setChosenTrip(event.target.value)}>
            {allTrips.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!showPaste && (
        <>
          <div className="chip-row poreia-scroll-chips" role="group" aria-label="Kind">
            {BOOKING_KINDS.map((each) => (
              <button key={each.id} type="button" className="chip" aria-pressed={form.kind === each.id} onClick={() => set({ kind: each.id })}>
                {each.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span className="field__label">Name</span>
            <input className="input" value={form.title} placeholder={form.kind === 'flight' ? 'TP 202' : form.kind === 'stay' ? 'Casa Azul' : 'Name'} onChange={(event) => set({ title: event.target.value })} />
          </label>
          <div className="input-row">
            <label className="field">
              <span className="field__label">With</span>
              <input className="input" value={form.provider ?? ''} placeholder={form.kind === 'stay' ? 'Airbnb, Booking.com' : 'Airline, company'} onChange={(event) => set({ provider: event.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="field__label">Confirmation</span>
              <input className="input" value={form.confirmation ?? ''} autoCapitalize="characters" onChange={(event) => set({ confirmation: event.target.value || undefined })} />
            </label>
          </div>
          {travel && (
            <div className="input-row">
              <label className="field">
                <span className="field__label">From</span>
                <input className="input" value={form.from ?? ''} onChange={(event) => set({ from: event.target.value || undefined })} />
              </label>
              <label className="field">
                <span className="field__label">To</span>
                <input className="input" value={form.to ?? ''} onChange={(event) => set({ to: event.target.value || undefined })} />
              </label>
            </div>
          )}
          <div className="input-row">
            <label className="field">
              <span className="field__label">{form.kind === 'stay' ? 'Check-in' : form.kind === 'car' ? 'Pick-up' : travel ? 'Departs' : 'Day'}</span>
              <input className="input" type="date" value={form.startDate ?? ''} onChange={(event) => set({ startDate: event.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="field__label">Time</span>
              <input className="input" type="time" value={form.startTime ?? ''} onChange={(event) => set({ startTime: event.target.value || undefined })} />
            </label>
          </div>
          <div className="input-row">
            <label className="field">
              <span className="field__label">{form.kind === 'stay' ? 'Check-out' : form.kind === 'car' ? 'Return' : travel ? 'Arrives' : 'Until'}</span>
              <input className="input" type="date" value={form.endDate ?? ''} min={form.startDate} onChange={(event) => set({ endDate: event.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="field__label">Time</span>
              <input className="input" type="time" value={form.endTime ?? ''} onChange={(event) => set({ endTime: event.target.value || undefined })} />
            </label>
          </div>
          {!travel && (
            <label className="field">
              <span className="field__label">Address</span>
              <input className="input" value={form.address ?? ''} onChange={(event) => set({ address: event.target.value || undefined })} />
            </label>
          )}
          <MoneyField label="Cost" cents={form.cost?.cents} currency={form.cost?.currency ?? currency} onChange={(cents, code) => set({ cost: cents ? { cents, currency: code || currency } : undefined })} />
          {form.cost && trip && peopleOf(trip).length > 1 && (
            <label className="field">
              <span className="field__label">Paid by</span>
              <select className="input" value={form.paidBy ?? ''} onChange={(event) => set({ paidBy: event.target.value || undefined })}>
                <option value="">Not said</option>
                {peopleOf(trip).map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span className="field__label">Link</span>
            <input className="input" type="url" inputMode="url" value={form.link ?? ''} placeholder="https://" onChange={(event) => set({ link: event.target.value || undefined })} />
          </label>
          <label className="field">
            <span className="field__label">Notes</span>
            <textarea className="input area" rows={3} value={form.notes ?? ''} onChange={(event) => set({ notes: event.target.value || undefined })} />
          </label>
          {form.link && (
            <a className="text-link" href={form.link} target="_blank" rel="noopener noreferrer">
              Open the booking
            </a>
          )}
          <button type="button" className="button-main" disabled={!form.title.trim()} onClick={save}>
            Save
          </button>
          {existing && (
            <button type="button" className="text-link remove-link" onClick={remove}>
              Delete booking
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** A booking as it is needed on the way: the confirmation to show or copy, when, where, and the way there. */
function BookingView({ nav, booking, tripName, onEdit, onRemove }: { nav: PoreiaNav; booking: Booking; tripName?: string; onEdit: () => void; onRemove: () => void }) {
  const apple = deviceKind() === 'iphone' || /Mac/.test(navigator.platform);
  const travel = TRAVEL.includes(booking.kind);
  const at = (date?: string, time?: string) => (date ? `${dayText(date)}${time ? `, ${timeText(time)}` : ''}` : undefined);
  const startLabel = booking.kind === 'stay' ? 'Check-in' : booking.kind === 'car' ? 'Pick-up' : travel ? 'Departs' : 'When';
  const endLabel = booking.kind === 'stay' ? 'Check-out' : booking.kind === 'car' ? 'Return' : travel ? 'Arrives' : 'Until';
  const goTo = booking.address ?? (travel ? booking.from : undefined);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(booking.confirmation!);
      say('Confirmation copied');
    } catch {
      say('Couldn’t copy. Press and hold the code to copy it.');
    }
  };
  const rows: [string, string | undefined][] = [
    [startLabel, at(booking.startDate, booking.startTime)],
    [endLabel, booking.endDate && (booking.endDate !== booking.startDate || booking.endTime) ? at(booking.endDate, booking.endTime) : undefined],
    ['Route', travel ? [booking.from, booking.to].filter(Boolean).join(' → ') || undefined : undefined],
    ['Address', booking.address],
    ['With', booking.provider],
    ['Cost', booking.cost ? moneyText(booking.cost) : undefined],
  ];
  return (
    <div className="page poreia-page">
      <BackLink label={tripName ?? 'Trip'} onBack={nav.back} />
      <div className="detail-head poreia-trip__head">
        <h1 className="title">{booking.title}</h1>
        <p className="muted">{[kindLabel(booking.kind), booking.provider].filter(Boolean).join(' · ')}</p>
      </div>

      {booking.confirmation && (
        <button type="button" className="poreia-code" onClick={copy} aria-label={`Confirmation ${booking.confirmation}. Copy`}>
          <span className="label">Confirmation</span>
          <span className="poreia-code__value">{booking.confirmation}</span>
          <span className="muted">Tap to copy</span>
        </button>
      )}

      <LoyaltyNumbers provider={booking.provider ?? booking.title} />

      {booking.kind === 'flight' && booking.startDate && booking.startDate >= today() && booking.startDate <= addDays(today(), 1) && <FlightStatusCard booking={booking} />}

      {(goTo || booking.link) && (
        <div className="button-row">
          {goTo && (
            <a className="button-main" href={directionsTo(goTo, undefined, undefined, apple)} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
          )}
          {booking.link && (
            <a className="button-quiet" href={booking.link} target="_blank" rel="noopener noreferrer">
              Open the booking
            </a>
          )}
        </div>
      )}

      <dl className="detail-list">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <span key={label} style={{ display: 'contents' }}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </span>
          ))}
      </dl>
      {booking.notes && <p className="poreia-notes">{booking.notes}</p>}

      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onEdit}>
          Edit
        </button>
      </div>
      <button type="button" className="text-link remove-link" onClick={onRemove}>
        Delete booking
      </button>
    </div>
  );
}

/** The person's loyalty numbers for this provider (from Documents), each a tap to copy. */
function LoyaltyNumbers({ provider }: { provider?: string }) {
  const mine = loyaltyFor(docs.use(), provider);
  if (!mine.length) return null;
  return (
    <section className="card">
      <h2 className="card__title">Your loyalty number</h2>
      <ul className="rows">
        {mine.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              className="row"
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(doc.number!)
                  .then(() => say('Number copied'))
                  .catch(() => say('Couldn’t copy. Press and hold the number to copy it.'))
              }
            >
              <span className="row__text">
                <span>{doc.name}</span>
                <span className="row__detail poreia-code__value">{doc.number}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
