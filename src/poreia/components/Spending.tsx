import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import SwipeItem from '../../app/family/SwipeItem';
import { myName, newId, nowStamp, settings, spends, today } from '../app/state';
import { dayText, MoneyField } from '../app/ui';
import { moneyText, SPEND_CATEGORIES, type Spend, type SpendCategory, type Trip } from '../core/model';
import { peopleOf } from './Together';

/** Spending as rows, newest first; pull left to delete, with undo. `tripName` adds the trip to each line. */
export function SpendList({ list, together, tripName }: { list: readonly Spend[]; together?: boolean; tripName?: (id: string) => string | undefined }) {
  return (
    <ul className="rows">
      {list.map((spend) => (
        <SwipeItem
          key={spend.id}
          className="poreia-spend"
          label="Delete"
          tone="remove"
          onSwipe={() => {
            spends.remove(spend.id);
            offerUndo(`“${spend.what}” deleted`, () => spends.put(spend));
          }}
        >
          <span className="row__text">
            <span>{spend.what}</span>
            <span className="row__detail">{[dayText(spend.date), tripName?.(spend.tripId), SPEND_CATEGORIES.find((each) => each.id === spend.category)?.label, together && spend.paidBy].filter(Boolean).join(' · ')}</span>
          </span>
          <span className="poreia-spend__amount">{moneyText(spend.amount)}</span>
        </SwipeItem>
      ))}
    </ul>
  );
}

/** Add spending to one trip, or to one of `choices` (the trip under way or next first). */
export function SpendForm({ trip, choices }: { trip?: Trip; choices?: readonly Trip[] }) {
  const prefs = settings.use();
  const [pickedId, setPickedId] = useState(trip?.id ?? choices?.[0]?.id ?? '');
  const chosen = trip ?? choices?.find((each) => each.id === pickedId) ?? choices?.[0];
  const currency = chosen?.budget?.currency ?? prefs.currency;
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState<{ cents?: number; currency?: string }>({});
  const [category, setCategory] = useState<SpendCategory>('food');
  const [date, setDate] = useState(today());
  const people = chosen ? peopleOf(chosen) : [];
  const together = people.length > 1;
  const [payer, setPayer] = useState(myName());
  const paidBy = people.includes(payer) ? payer : people[0];
  if (!chosen) return null;
  const code = amount.currency ?? currency;

  return (
    <section className="card">
      <h2 className="card__title">Add spending</h2>
      {!trip && choices && choices.length > 1 && (
        <label className="field">
          <span className="field__label">Trip</span>
          <select className="input" value={chosen.id} onChange={(event) => setPickedId(event.target.value)}>
            {choices.map((each) => (
              <option key={each.id} value={each.id}>
                {each.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span className="field__label">What</span>
        <input className="input" value={what} onChange={(event) => setWhat(event.target.value)} />
      </label>
      <MoneyField key={chosen.id} label="Amount" cents={amount.cents} currency={code} onChange={(cents, next) => setAmount({ cents, currency: next })} />
      <div className="input-row">
        <label className="field">
          <span className="field__label">Kind</span>
          <select className="input" value={category} onChange={(event) => setCategory(event.target.value as SpendCategory)}>
            {SPEND_CATEGORIES.map((each) => (
              <option key={each.id} value={each.id}>
                {each.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Day</span>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      {together && (
        <label className="field">
          <span className="field__label">Paid by</span>
          <select className="input" value={paidBy} onChange={(event) => setPayer(event.target.value)}>
            {people.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        className="button-main"
        disabled={!what.trim() || !amount.cents || code.length !== 3}
        onClick={() => {
          const spend: Spend = { id: newId(), tripId: chosen.id, date: date || today(), what: what.trim(), amount: { cents: amount.cents!, currency: code }, category, createdAt: nowStamp(), ...(together ? { paidBy } : {}) };
          spends.put(spend);
          offerUndo(`“${spend.what}” added`, () => spends.remove(spend.id));
          setWhat('');
          setAmount({ currency: code });
        }}
      >
        Save
      </button>
    </section>
  );
}
