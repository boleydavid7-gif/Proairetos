import { Placeholder } from '../../lamplight/Placeholder';
import { Total } from '../app/Total';
import type { Nav } from '../app/App';
import { ChevronIcon } from '../app/icons';
import { formatDate, formatMoney, needsAttention, relativeDue, monthBounds, occurrencesBetween, remainingSummary, stillToCome, type Bill } from '../core/bills';
import SwipeRow from '../app/SwipeRow';
import { payBill } from '../app/payBill';
import { useBills, useSettings, useToday } from '../app/state';
import { Brand, Hero } from '../app/ui';
import PayCard from './PayCard';
import BudgetCard from './BudgetCard';

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
  const bills = useBills();
  const settings = useSettings();
  const today = useToday();
  const all = bills ?? [];
  const bounds = monthBounds(new Date());
  const thisMonth = all
    .flatMap((bill) => occurrencesBetween(bill, bounds.from, bounds.until))
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name));
  const monthOpen = stillToCome(thisMonth, today);

  return (
    <div className="home oiko-home">
      <Hero>
        <Brand light />
        <div className="home__words">
          <h1 className="home__title">This month</h1>
        </div>
      </Hero>

      <div className="page page--under-hero">
        {!bills ? (
          <Placeholder label="Gathering what you keep here" count={2} />
        ) : all.length === 0 ? (
          <section className="card oiko-empty first-run">
            <h2 className="card__title">No bills yet</h2>
            <div className="button-row">
              <button type="button" className="button-main" onClick={() => nav.go({ name: 'capture' })}>
                Add a bill
              </button>
              <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'expense' })}>
                Record an expense
              </button>
            </div>
          </section>
        ) : (
          <>
            {thisMonth.length > 0 && (
              <p className="oiko-total">
                <strong><Total summary={remainingSummary(thisMonth, today)} /></strong>
                <span>{remainingSummary(thisMonth, today).note}</span>
              </p>
            )}
            <section className="oiko-list" aria-label="Bills this month">
              {monthOpen.slice(0, 8).map((occurrence, index) => (
                <SwipeRow key={occurrence.bill.id + occurrence.date} label="Paid" onSwipe={() => void payBill(occurrence.bill, occurrence.date)}>
                  {billRow(occurrence.bill, occurrence.date, nav, today, index === 0 && needsAttention(occurrence.bill, occurrence.date, today))}
                </SwipeRow>
              ))}
              {thisMonth.length === 0 && <p className="muted">Nothing is scheduled for this month.</p>}
              {thisMonth.length > 0 && monthOpen.length === 0 && <p className="muted">Nothing left to pay this month.</p>}
            </section>

            <PayCard nav={nav} bills={all} today={today} currency={settings.currency} />
            <BudgetCard nav={nav} />

            <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'expense' })}>Record an expense</button>
          </>
        )}
      </div>
    </div>
  );
}
