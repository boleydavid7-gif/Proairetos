import { useState } from 'react';
import type { Nav } from '../app/App';
import { PageTop } from '../app/ui';
import { offerUndo } from '../app/undo';
import { useSettings, useToday } from '../app/state';
import { formatDate, formatMoney } from '../core/bills';
import { RHYTHMS, payDates, type Pay, type PayRhythm } from '../core/pay';
import { cents } from '../core/statements';
import { addMonths } from '../core/bills';
import { savePays, usePays } from '../data/pay';

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
const rhythmLabel = (rhythm: PayRhythm) => RHYTHMS.find((each) => each.id === rhythm)?.label ?? rhythm;

function PayForm({ start, onDone, onCancel }: { start: Pay; onDone: (pay: Pay) => void; onCancel: () => void }) {
  const [name, setName] = useState(start.name);
  const [amount, setAmount] = useState(start.amountCents !== undefined ? (start.amountCents / 100).toFixed(2) : '');
  const [rhythm, setRhythm] = useState<PayRhythm>(start.rhythm);
  const [date, setDate] = useState(start.date);
  const [secondDay, setSecondDay] = useState(String(start.secondDay ?? 15));
  return (
    <form
      className="card oiko-form"
      onSubmit={(event) => {
        event.preventDefault();
        const second = Math.min(31, Math.max(1, Number(secondDay) || 15));
        onDone({ ...start, name: name.trim() || 'Pay', amountCents: cents(amount), rhythm, date, secondDay: rhythm === 'twice-monthly' ? second : undefined });
      }}
    >
      <label className="field"><span className="field__label">Name</span><input className="input" value={name} placeholder="Pay" onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span className="field__label">Usually about (optional)</span><input className="input" inputMode="decimal" value={amount} placeholder="0.00" onChange={(event) => setAmount(event.target.value)} /></label>
      <label className="field">
        <span className="field__label">How often</span>
        <select className="input" value={rhythm} onChange={(event) => setRhythm(event.target.value as PayRhythm)}>
          {RHYTHMS.map((each) => <option key={each.id} value={each.id}>{each.label}</option>)}
        </select>
      </label>
      <label className="field"><span className="field__label">{rhythm === 'twice-monthly' ? 'One pay date' : 'A pay date'}</span><input className="input" type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} /></label>
      {rhythm === 'twice-monthly' && (
        <label className="field"><span className="field__label">The other day of the month</span><input className="input" inputMode="numeric" value={secondDay} onChange={(event) => setSecondDay(event.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
      )}
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button-main">Save</button>
      </div>
    </form>
  );
}

/** More > Pay: when pay comes in. Home shows the bills before the next one. */
export default function PayPage({ nav }: { nav: Nav }) {
  const pays = usePays();
  const settings = useSettings();
  const today = useToday();
  const [editing, setEditing] = useState<Pay>();

  const save = (pay: Pay) => {
    savePays(pays.some((each) => each.id === pay.id) ? pays.map((each) => (each.id === pay.id ? pay : each)) : [...pays, pay]);
    setEditing(undefined);
  };

  return (
    <div className="page oiko-page">
      <PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button></PageTop>
      <h1 className="title">Pay</h1>
      {editing ? (
        <PayForm start={editing} onDone={save} onCancel={() => setEditing(undefined)} />
      ) : (
        <>
          {pays.length === 0 && <p className="muted">Add when you are paid, and Home shows the bills due before each pay date.</p>}
          <section className="oiko-list" aria-label="Pay">
            {pays.map((pay) => {
              const next = payDates(pay, today, addMonths(today, 2))[0];
              return (
                <div key={pay.id} className="oiko-pay-row">
                  <button type="button" className="oiko-bill-row" onClick={() => setEditing(pay)}>
                    <span className="oiko-bill-row__main">
                      <span className="oiko-bill-row__name">{pay.name}</span>
                      <span className="oiko-bill-row__detail">{rhythmLabel(pay.rhythm)}{next ? ` · next ${formatDate(next)}` : ''}</span>
                    </span>
                    {pay.amountCents !== undefined && <span className="oiko-bill-row__amount">{formatMoney(pay.amountCents, pay.currency)}</span>}
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      const before = pays;
                      savePays(pays.filter((each) => each.id !== pay.id));
                      offerUndo(`${pay.name} removed`, () => savePays(before));
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </section>
          <button type="button" className="button-main" onClick={() => setEditing({ id: newId(), name: 'Pay', currency: settings.currency, rhythm: 'every-2-weeks', date: today })}>
            Add pay
          </button>
        </>
      )}
    </div>
  );
}
