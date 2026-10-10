import { useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, BellIcon, CalendarIcon, CheckIcon, RepeatIcon, WalletIcon } from '../app/icons';
import { formatDate, formatMoney, paidForOccurrence, paymentHistory, relativeDue, standing, usualAmount } from '../core/bills';
import { moneyInputCents } from '../core/budget';
import { downloadBillCalendar } from '../core/calendar';
import { payBill } from '../app/payBill';
import { offerUndo } from '../app/undo';
import { useBills, useToday } from '../app/state';
import { deleteBill, putBill } from '../data/store';
import { formatFrequency, PageTop } from '../app/ui';

const amountText = (cents: number) => (cents / 100).toFixed(2);

export default function BillPage({ nav, id }: { nav: Nav; id: string }) {
  const bills = useBills();
  const today = useToday();
  const found = bills?.find((item) => item.id === id);
  const [paidText, setPaidText] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (found) setPaidText(amountText(found.amountCents));
  }, [found?.amountCents]);

  if (!bills) return <div className="page oiko-page"><div className="skeleton-stack" role="status" aria-label="Gathering this bill"><div className="skeleton" /><div className="skeleton" /></div></div>;
  if (!found) return <div className="page oiko-page"><PageTop><button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Back</button></PageTop><h1 className="title">That bill is not here.</h1></div>;
  const bill = found;
  const stand = standing(bill, today);
  const open = !stand.settled;
  const usual = usualAmount(bill);
  const history = paymentHistory(bill, today);

  async function markPaid() {
    const cents = moneyInputCents(paidText);
    if (cents === undefined) {
      setProblem('Use an amount with up to two decimal places.');
      return;
    }
    setProblem('');
    await payBill(bill, stand.date, cents || bill.amountCents);
  }

  async function stop() {
    const before = bill;
    await putBill({ ...bill, endedOn: today, updatedAt: new Date().toISOString() });
    offerUndo(`No more dates for ${bill.name}`, () => putBill(before));
  }

  async function startAgain() {
    const { endedOn: _ended, ...rest } = bill;
    await putBill({ ...rest, updatedAt: new Date().toISOString() });
  }

  async function remove() {
    const before = bill;
    await deleteBill(bill.id);
    nav.back();
    offerUndo(`${bill.name} removed`, () => putBill(before));
  }

  const dateLine = stand.complete
    ? bill.endedOn
      ? { title: 'No more dates', small: 'Stopped ' + formatDate(bill.endedOn, 'long') }
      : { title: 'No future date', small: 'This one is complete' }
    : open
      ? { title: 'Due ' + formatDate(stand.date, 'long'), small: relativeDue(stand.date, today) }
      : { title: 'Paid for ' + formatDate(stand.date, 'long'), small: stand.returnsOn ? 'Back in the list ' + formatDate(stand.returnsOn) : '' };

  return (
    <div className="page oiko-page oiko-detail">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Bills</button>
      </PageTop>

      <div className="oiko-detail__heading">
        <span className="oiko-detail__emblem"><WalletIcon size={26} /></span>
        <div>{bill.category && <p className="label">{bill.category}</p>}<h1 className="title">{bill.name}</h1></div>
        <strong className="oiko-detail__amount">{formatMoney(bill.amountCents, bill.currency)}</strong>
      </div>

      <section className="oiko-detail-card">
        <div className="oiko-detail-line"><CalendarIcon size={20} /><span><strong>{dateLine.title}</strong>{dateLine.small && <small>{dateLine.small}</small>}</span></div>
        <div className="oiko-detail-line"><RepeatIcon size={20} /><span><strong>{formatFrequency(bill.frequency)}{bill.autopay ? ' · autopay' : ''}</strong>{bill.autopay && <small>Counted as paid on each date</small>}{usual !== undefined && <small>Usually about {formatMoney(usual, bill.currency)}</small>}</span></div>
        <div className="oiko-detail-line"><BellIcon size={20} /><span><strong>{bill.reminderDays === 0 ? 'Reminder on the day' : `Reminder ${bill.reminderDays} ${bill.reminderDays === 1 ? 'day' : 'days'} before`}</strong><small>Sent by Proairetos, if its notifications are on</small></span></div>
      </section>

      {open && !bill.autopay && !paidForOccurrence(bill, stand.date, today) && (
        <div className="oiko-pay">
          <label className="field"><span className="field__label">Amount paid</span><input className="input" type="text" inputMode="decimal" value={paidText} onChange={(event) => setPaidText(event.target.value)} /></label>
          <button type="button" className="button-main" onClick={() => void markPaid()}><CheckIcon size={19} /> Mark paid</button>
        </div>
      )}
      {problem && <p className="oiko-error" role="alert">{problem}</p>}
      <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'edit', id: bill.id })}>Change details</button>
      {!stand.complete && <button type="button" className="button-quiet" onClick={() => downloadBillCalendar([bill], bill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}><CalendarIcon size={18} /> Add to your calendar</button>}

      <section className="oiko-history">
        <div className="oiko-section-head"><h2>Payment history</h2></div>
        {history.length === 0 ? <p className="muted">Nothing marked paid yet.</p> : history.map((payment) => (
          <div className="oiko-history-row" key={payment.id}><span>{formatDate(payment.date, 'long')}{payment.auto && <small> · automatically</small>}</span><strong>{formatMoney(payment.amountCents, bill.currency)}</strong></div>
        ))}
      </section>

      {bill.notes && <section className="card"><span className="card__eyebrow">Note</span><p className="oiko-note">{bill.notes}</p></section>}

      <div className="oiko-detail__end">
        {bill.endedOn ? (
          <button type="button" className="text-link" onClick={() => void startAgain()}>Bring its dates back</button>
        ) : (
          bill.frequency !== 'once' && <button type="button" className="text-link" onClick={() => void stop()}>No more dates (cancelled)</button>
        )}
        <button type="button" className="text-link" onClick={() => void remove()}>Remove this bill</button>
      </div>
    </div>
  );
}
