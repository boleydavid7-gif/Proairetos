import type { Nav } from '../app/App';
import { ChevronIcon, RepeatIcon } from '../app/icons';
import { formatDate, formatMoney, relativeDue, monthBounds, occurrencesBetween, remainingSummary, standing, stillToCome, type Bill } from '../core/bills';
import SwipeRow from '../app/SwipeRow';
import { usePayBill } from '../app/payBill';
import { financeLineFor } from '../core/lines';
import { useBills, useBudget, useSettings, useSomaRecipes, useToday } from '../app/state';
import { budgetTotals, monthKey } from '../core/budget';
import { Brand, greeting, Hero } from '../app/ui';

function billRow(bill: Bill, date: string, nav: Nav, today: string) {
  return (
    <button type="button" className="oiko-bill-row" onClick={() => nav.go({ name: 'bill', id: bill.id })}>
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
  const line = financeLineFor(today);
  const all = bills ?? [];
  const recipes = useSomaRecipes();
  const { pay, toast } = usePayBill();
  // The next bill is the nearest one that has not been paid for; paid bills wait until their turn comes round.
  const next = all
    .map((bill) => ({ bill, stand: standing(bill, today) }))
    .filter(({ stand }) => !stand.settled)
    .map(({ bill, stand }) => ({ bill, date: stand.date }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name))[0];
  const month = new Date();
  const bounds = monthBounds(month);
  const currentMonth = monthKey(month);
  const budget = useBudget(currentMonth);
  const budgetSummary = budgetTotals(all, recipes, currentMonth, budget?.currency ?? settings.currency, budget?.items ?? []);
  const thisMonth = all
    .flatMap((bill) => occurrencesBetween(bill, bounds.from, bounds.until))
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name));
  const monthOpen = stillToCome(thisMonth);

  return (
    <div className="home oiko-home">
      <Hero>
        <Brand light />
        <div className="home__words">
          <p className="home__greeting">{greeting()}</p>
          <h1 className="home__title">“{line.text}”</h1>
          <p className="home__sub">{line.source}</p>
        </div>
      </Hero>

      <div className="page page--under-hero">
        {!bills ? (
          <div className="skeleton-stack" role="status" aria-label="Gathering what you keep here"><div className="skeleton" /><div className="skeleton" /></div>
        ) : all.length === 0 ? (
          <>
            <section className="card oiko-empty">
              <h2 className="card__title">What needs tending?</h2>
              <p className="muted">Nothing here yet.</p>
              <button type="button" className="button-main" onClick={() => nav.swap({ name: 'capture' })}>
                Add a bill
              </button>
            </section>
            <button type="button" className="card oiko-budget-home" onClick={() => nav.go({ name: 'budget' })}>
              <span className="card__eyebrow">Monthly plan</span>
              <span className="oiko-budget-home__line"><strong>{formatMoney(budgetSummary.plannedCents, budget?.currency ?? settings.currency)}</strong><span>{budget?.totalCents ? `of ${formatMoney(budget.totalCents, budget.currency)}` : 'Set a monthly amount'}</span></span>
              <span className="muted"><ChevronIcon size={17} /></span>
            </button>
          </>
        ) : (
          <>
            {next && (
              <section className="card oiko-next-card">
                <button type="button" className="oiko-next-card__bill" onClick={() => nav.go({ name: 'bill', id: next.bill.id })}>
                  <span className="oiko-bill-emblem"><RepeatIcon size={20} /></span>
                  <span className="oiko-next-card__words">
                    <strong>{next.bill.name}</strong>
                    <span>{relativeDue(next.date, today)} · {formatDate(next.date)}</span>
                  </span>
                  <span className="oiko-next-card__amount">{formatMoney(next.bill.amountCents, next.bill.currency)}</span>
                  <ChevronIcon size={18} />
                </button>
              </section>
            )}

            <div className="oiko-section-head">
              <h2>This month</h2>
              <button type="button" className="text-link" onClick={() => nav.swap({ name: 'calendar' })}>View calendar</button>
            </div>
            {thisMonth.length > 0 && (
              <p className="oiko-total">
                <strong>{remainingSummary(thisMonth).main}</strong>
                <span>{remainingSummary(thisMonth).note}</span>
              </p>
            )}
            <section className="oiko-list" aria-label="Bills this month">
              {monthOpen.slice(0, 8).map((occurrence) => (
                <SwipeRow key={occurrence.bill.id + occurrence.date} label="Paid" onSwipe={() => void pay(occurrence.bill, occurrence.date)}>
                  {billRow(occurrence.bill, occurrence.date, nav, today)}
                </SwipeRow>
              ))}
              {thisMonth.length === 0 && <p className="muted">Nothing is scheduled for this month.</p>}
              {thisMonth.length > 0 && monthOpen.length === 0 && <p className="muted">Everything this month is paid.</p>}
            </section>
            <button type="button" className="card oiko-budget-home" onClick={() => nav.go({ name: 'budget' })}>
              <span className="card__eyebrow">Monthly plan</span>
              <span className="oiko-budget-home__line"><strong>{formatMoney(budgetSummary.plannedCents, budget?.currency ?? settings.currency)}</strong><span>{budget?.totalCents ? `of ${formatMoney(budget.totalCents, budget.currency)}` : 'Set a monthly amount'}</span></span>
              <span className="muted"><ChevronIcon size={17} /></span>
            </button>
          </>
        )}
      </div>
      {toast}
    </div>
  );
}
