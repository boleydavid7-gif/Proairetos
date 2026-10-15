import { useState } from 'react';
import type { Nav } from '../app/App';
import { ChevronIcon } from '../app/icons';
import { formatDate, formatMoney, type Bill } from '../core/bills';
import { payView } from '../core/pay';
import { cents } from '../core/statements';
import { saveBalance, useBalance, usePays } from '../data/pay';

const inDays = (days: number) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`);

/** Home: the next pay date, the bills before it, and what is left after them if the person says what is there now. */
export default function PayCard({ nav, bills, today, currency }: { nav: Nav; bills: readonly Bill[]; today: string; currency: string }) {
  const pays = usePays();
  const balance = useBalance();
  const [typing, setTyping] = useState(false);
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const view = payView(pays, bills, today, currency, balance);

  if (!view) {
    return (
      <button type="button" className="card oiko-budget-home" onClick={() => nav.go({ name: 'pay' })}>
        <span className="card__eyebrow">Pay</span>
        <span className="oiko-budget-home__line"><span>Add when you’re paid</span></span>
        <span className="muted"><ChevronIcon size={17} /></span>
      </button>
    );
  }

  return (
    <section className="card oiko-pay" aria-label="Until pay">
      <button type="button" className="oiko-pay__head" onClick={() => nav.go({ name: 'pay' })}>
        <span className="card__eyebrow">Next pay</span>
        <span className="oiko-pay__date">
          <strong>{formatDate(view.next)}</strong>
          <span>{inDays(view.days)}</span>
        </span>
      </button>
      <button type="button" className="oiko-pay__line" aria-expanded={open} disabled={!view.before.length} onClick={() => setOpen(!open)}>
        <span>{view.before.length ? `Bills before then · ${view.before.length}` : 'No bills before then'}</span>
        {view.before.length > 0 && <strong>{formatMoney(view.beforeCents, currency)}</strong>}
      </button>
      {open && (
        <ul className="oiko-pay__bills">
          {view.before.map((occurrence) => (
            <li key={occurrence.bill.id + occurrence.date}>
              <button type="button" onClick={() => nav.go({ name: 'bill', id: occurrence.bill.id })}>
                <span>{occurrence.bill.name}</span>
                <span className="muted">{formatDate(occurrence.date)}</span>
                <span>{formatMoney(occurrence.bill.amountCents, occurrence.bill.currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {view.leftCents !== undefined ? (
        <button type="button" className="oiko-pay__line oiko-pay__left" onClick={() => setTyping(true)}>
          <span>Left after them</span>
          <strong>{formatMoney(view.leftCents, currency)}</strong>
        </button>
      ) : !typing ? (
        <button type="button" className="text-link oiko-pay__ask" onClick={() => setTyping(true)}>
          What’s in the account now?
        </button>
      ) : null}
      {typing && (
        <form
          className="oiko-pay__form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = cents(amount);
            if (value !== undefined) saveBalance({ cents: value, currency, on: today });
            setTyping(false);
            setAmount('');
          }}
        >
          <input className="input" inputMode="decimal" autoFocus aria-label="In the account now" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <button type="submit" className="button-main">Done</button>
        </form>
      )}
      {view.following && (
        <p className="oiko-pay__after muted">
          Then to {formatDate(view.following.date)}: bills {formatMoney(view.following.billsCents, currency)}
          {view.following.incomeCents !== undefined ? ` · pay about ${formatMoney(view.following.incomeCents, currency)}` : ''}
        </p>
      )}
    </section>
  );
}
