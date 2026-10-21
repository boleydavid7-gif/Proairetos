import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { BackLink } from '../../askesis/app/ui';
import type { PoreiaNav } from '../app/App';
import { bookings, newId, nowStamp, settings, trips } from '../app/state';
import { MoneyField } from '../app/ui';
import { readConfirmation } from '../core/confirmations';
import { BOOKING_KINDS, type Booking, type BookingKind } from '../core/model';

const TRAVEL: BookingKind[] = ['flight', 'train', 'bus', 'cruise'];

/** A booking: pasted from its confirmation (read on the device, shown here to check) or written by hand. */
export default function BookingForm({ nav, tripId, id, kind: firstKind, paste }: { nav: PoreiaNav; tripId: string; id?: string; kind?: BookingKind; paste?: boolean }) {
  const trip = trips.get(tripId);
  const existing = id ? bookings.get(id) : undefined;
  const currency = settings.load().currency;
  const [form, setForm] = useState<Omit<Booking, 'id' | 'tripId' | 'createdAt' | 'updatedAt'>>(() => existing ?? { kind: firstKind ?? 'stay', title: '', startDate: trip?.start });
  const [pasted, setPasted] = useState('');
  const [readNote, setReadNote] = useState('');
  const [showPaste, setShowPaste] = useState(Boolean(paste) && !existing);
  const set = (patch: Partial<Booking>) => setForm((current) => ({ ...current, ...patch }));

  const read = () => {
    const found = readConfirmation(pasted);
    if (!found) {
      setReadNote('Nothing to read there. Paste the whole confirmation email, or fill in the details below.');
      return;
    }
    setForm((current) => ({ ...current, ...Object.fromEntries(Object.entries(found).filter(([, value]) => value !== undefined && value !== '')) }));
    const got = [found.confirmation && 'confirmation', found.startDate && 'dates', found.cost && 'cost', found.from && found.to && 'route'].filter(Boolean);
    setReadNote(got.length ? `Read: ${got.join(', ')}. Check them below.` : 'Read what it could. Check the details below.');
    setShowPaste(false);
  };

  const save = () => {
    if (!form.title.trim()) return;
    const now = nowStamp();
    const record: Booking = {
      ...form,
      title: form.title.trim(),
      endDate: form.endDate && form.startDate && form.endDate < form.startDate ? form.startDate : form.endDate || undefined,
      id: existing?.id ?? newId(),
      tripId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    bookings.put(record);
    if (!existing) offerUndo(`“${record.title}” added`, () => bookings.remove(record.id));
    nav.back();
  };

  const travel = TRAVEL.includes(form.kind);

  return (
    <div className="page poreia-page">
      <BackLink label={trip?.name ?? 'Trip'} onBack={nav.back} />
      <h1 className="title">{existing ? existing.title : 'New booking'}</h1>

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
            <button type="button" className="button-quiet" onClick={() => setShowPaste(false)}>
              Fill in by hand
            </button>
          </div>
          <p className="fine">Read on this device; nothing is sent.</p>
        </section>
      ) : (
        !existing && (
          <button type="button" className="text-link" onClick={() => setShowPaste(true)}>
            Paste a confirmation
          </button>
        )
      )}
      {readNote && <p className="muted" role="status">{readNote}</p>}

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
              <span className="field__label">With (optional)</span>
              <input className="input" value={form.provider ?? ''} placeholder={form.kind === 'stay' ? 'Airbnb, Booking.com' : 'Airline, company'} onChange={(event) => set({ provider: event.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="field__label">Confirmation (optional)</span>
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
              <span className="field__label">Time (optional)</span>
              <input className="input" type="time" value={form.startTime ?? ''} onChange={(event) => set({ startTime: event.target.value || undefined })} />
            </label>
          </div>
          <div className="input-row">
            <label className="field">
              <span className="field__label">{form.kind === 'stay' ? 'Check-out' : form.kind === 'car' ? 'Return' : travel ? 'Arrives' : 'Until (optional)'}</span>
              <input className="input" type="date" value={form.endDate ?? ''} min={form.startDate} onChange={(event) => set({ endDate: event.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="field__label">Time (optional)</span>
              <input className="input" type="time" value={form.endTime ?? ''} onChange={(event) => set({ endTime: event.target.value || undefined })} />
            </label>
          </div>
          {!travel && (
            <label className="field">
              <span className="field__label">Address (optional)</span>
              <input className="input" value={form.address ?? ''} onChange={(event) => set({ address: event.target.value || undefined })} />
            </label>
          )}
          <MoneyField label="Cost (optional)" cents={form.cost?.cents} currency={form.cost?.currency ?? currency} onChange={(cents, code) => set({ cost: cents ? { cents, currency: code || currency } : undefined })} />
          <label className="field">
            <span className="field__label">Link (optional)</span>
            <input className="input" type="url" inputMode="url" value={form.link ?? ''} placeholder="https://" onChange={(event) => set({ link: event.target.value || undefined })} />
          </label>
          <label className="field">
            <span className="field__label">Notes (optional)</span>
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
            <button
              type="button"
              className="text-link remove-link"
              onClick={() => {
                bookings.remove(existing.id);
                offerUndo(`“${existing.title}” deleted`, () => bookings.put(existing));
                nav.back();
              }}
            >
              Delete booking
            </button>
          )}
        </>
      )}
    </div>
  );
}
