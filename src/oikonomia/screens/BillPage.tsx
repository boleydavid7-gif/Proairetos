import { tap } from '../../app/feel';
import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, BellIcon, CalendarIcon, CheckIcon, RepeatIcon, WalletIcon } from '../app/icons';
import { formatDate, formatMoney, occurrenceOnOrAfter, relativeDue, type Bill } from '../core/bills';
import { useBills, useToday, newId } from '../app/state';
import { putBill } from '../data/store';
import { formatFrequency, PageTop } from '../app/ui';

export default function BillPage({ nav, id }: { nav: Nav; id: string }) {
  const bills = useBills();
  const today = useToday();
  const found = bills?.find((item) => item.id === id);
  const [message, setMessage] = useState('');

  const next = useMemo(() => (found ? occurrenceOnOrAfter(found, today) : undefined), [found, today]);

  if (!bills) return <div className="page oiko-page"><div className="skeleton-stack" role="status" aria-label="Gathering this bill"><div className="skeleton" /><div className="skeleton" /></div></div>;
  if (!found) return <div className="page oiko-page"><PageTop><button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Back</button></PageTop><h1 className="title">That bill is not here.</h1></div>;
  const bill = found;

  async function markPaid() {
    tap();
    const date = next?.date ?? today;
    const existing = bill.payments.find((payment) => payment.date === date);
    const payment = { id: existing?.id ?? newId(), date, amountCents: bill.amountCents, note: existing?.note };
    const nextBill: Bill = { ...bill, payments: [...bill.payments.filter((item) => item.date !== date), payment], updatedAt: new Date().toISOString() };
    await putBill(nextBill);
    setMessage('Marked paid for ' + formatDate(date) + '.');
  }

  return (
    <div className="page oiko-page oiko-detail">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Bills</button>
      </PageTop>

      <div className="oiko-detail__heading">
        <span className="oiko-detail__emblem"><WalletIcon size={26} /></span>
        <div><p className="label">{bill.category || 'Household'}</p><h1 className="title">{bill.name}</h1></div>
        <strong className="oiko-detail__amount">{formatMoney(bill.amountCents, bill.currency)}</strong>
      </div>

      <section className="oiko-detail-card">
        <div className="oiko-detail-line"><CalendarIcon size={20} /><span><strong>{next ? 'Due ' + formatDate(next.date, 'long') : 'No future date'}</strong><small>{next ? relativeDue(next.date, today) : 'This one is complete'}</small></span></div>
        <div className="oiko-detail-line"><RepeatIcon size={20} /><span><strong>{formatFrequency(bill.frequency)}</strong><small>Next date follows this schedule.</small></span></div>
        <div className="oiko-detail-line"><BellIcon size={20} /><span><strong>{bill.reminderDays === 0 ? 'On the due date' : bill.reminderDays + ' days before'}</strong><small>Reminder preference</small></span></div>
      </section>

      <section className="oiko-calendar-confirm oiko-calendar-confirm--large"><CheckIcon size={22} /><span><strong>Added to calendar</strong><small>Recurring dates appear in Calendar.</small></span></section>

      <button type="button" className="button-main" onClick={() => void markPaid()}><CheckIcon size={19} /> Mark paid</button>
      <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'edit', id: bill.id })}>Change details</button>
      {message && <p className="oiko-success" role="status">{message}</p>}

      <section className="oiko-history">
        <div className="oiko-section-head"><h2>Payment history</h2><span className="muted">{bill.payments.length} {bill.payments.length === 1 ? 'entry' : 'entries'}</span></div>
        {bill.payments.length === 0 ? <p className="muted">Nothing marked paid yet.</p> : [...bill.payments].sort((a, b) => b.date.localeCompare(a.date)).map((payment) => (
          <div className="oiko-history-row" key={payment.id}><span>{formatDate(payment.date, 'long')}</span><strong>{formatMoney(payment.amountCents, bill.currency)}</strong></div>
        ))}
      </section>

      {bill.notes && <section className="card"><span className="card__eyebrow">Note</span><p>{bill.notes}</p></section>}
    </div>
  );
}
