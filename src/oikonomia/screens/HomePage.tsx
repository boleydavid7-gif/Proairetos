import { Placeholder } from '../../lamplight/Placeholder';
import { Total } from '../app/Total';
import type { Nav } from '../app/App';
import { ChevronIcon } from '../app/icons';
import { dueWithin, formatDate, formatMoney, needsAttention, relativeDue, remainingSummary, type Bill } from '../core/bills';
import SwipeRow from '../app/SwipeRow';
import { useAppPermissions } from '../../app/household/household';
import { payBill } from '../app/payBill';
import { useBills, useSettings, useToday } from '../app/state';
import { Brand, Hero } from '../app/ui';
import PayCard from './PayCard';

function billRow(bill: Bill, date: string, nav: Nav, today: string, lit = false) {
  return (
    <button type="button" className="oiko-bill-row" data-ll-lit={lit ? 'fallback' : undefined} onClick={() => nav.go({ name: 'bill', id: bill.id })}>
      <span className="oiko-bill-row__mark" aria-hidden="true" />
      <span className="oiko-bill-row__main">
        <span className="oiko-bill-row__name">{bill.name}</span>
        <span className="oiko-bill-row__detail">{relativeDue(date, today)}</span>
      </span>
      <span className="oiko-bill-row__date">{formatDate(date)}</span>
      <span className="oiko-bill-row__amount">{formatMoney(bill.amountCents, bill.currency)}</span>
      <ChevronIcon size={18} />
    </button>
  );
}

export default function HomePage({ nav }: { nav: Nav }) {
  const can = useAppPermissions('oikonomia');
  const bills = useBills();
  const settings = useSettings();
  const today = useToday();
  const all = bills ?? [];
  // Every bill due in the next seven days and not yet paid; the amount above them is the sum of these bills alone.
  const due = dueWithin(all, today, 7);

  return (
    <div className="home oiko-home">
      <Hero>
        <Brand light />
        <div className="home__words">
          <h1 className="home__title">Today</h1>
        </div>
      </Hero>

      <div className="page page--under-hero">
        {!bills ? (
          <Placeholder label="Gathering what you keep here" count={2} />
        ) : all.length === 0 ? (
          <section className="card oiko-empty first-run">
            <h2 className="card__title">No bills yet</h2>
          </section>
        ) : (
          <>
            {due.length > 0 && (
              <p className="oiko-total">
                <strong><Total summary={remainingSummary(due, today)} /></strong>
                <span>{remainingSummary(due, today).note}</span>
              </p>
            )}
            <section className="oiko-list" aria-label="Due this week">
              {due.map((occurrence, index) => (
                <SwipeRow key={occurrence.bill.id + occurrence.date} label="Paid" off={!can.write} onSwipe={() => void payBill(occurrence.bill, occurrence.date)}>
                  {billRow(occurrence.bill, occurrence.date, nav, today, index === 0 && needsAttention(occurrence.bill, occurrence.date, today))}
                </SwipeRow>
              ))}
              {due.length === 0 && <p className="muted">Nothing due this week.</p>}
            </section>

            <PayCard nav={nav} bills={all} today={today} currency={settings.currency} />

          </>
        )}
      </div>
    </div>
  );
}
