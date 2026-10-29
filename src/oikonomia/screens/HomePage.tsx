import { Placeholder } from '../../lamplight/Placeholder';
import { Total } from '../app/Total';
import type { Nav } from '../app/App';
import { ChevronIcon, RepeatIcon } from '../app/icons';
import { formatDate, formatMoney, needsAttention, relativeDue, monthBounds, occurrencesBetween, remainingSummary, standing, stillToCome, type Bill } from '../core/bills';
import SwipeRow from '../app/SwipeRow';
import { payBill } from '../app/payBill';
import { useBills, useBudget, useEnvelopes, useSettings, useSomaRecipes, useToday } from '../app/state';
import { budgetTotals, monthKey, spendingTotals } from '../core/budget';
import { envelopeMonthlyTotal } from '../core/envelopes';
import { useSpent } from '../data/spent';
import { Brand, Hero } from '../app/ui';
import PayCard from './PayCard';

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
  const all = bills ?? [];
  const recipes = useSomaRecipes();
  // The next bill is the nearest one that has not been paid for; paid bills wait until their turn comes around.
  const next = all
    .map((bill) => ({ bill, stand: standing(bill, today) }))
    .filter(({ stand }) => !stand.settled)
    .map(({ bill, stand }) => ({ bill, date: stand.date }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.bill.name.localeCompare(b.bill.name))[0];
  const month = new Date();
  const bounds = monthBounds(month);
  const currentMonth = monthKey(month);
  const budget = useBudget(currentMonth);
  const envelopes = useEnvelopes();
  const budgetSummary = budgetTotals(all, recipes, currentMonth, budget?.currency ?? settings.currency, budget?.items ?? []);
  const spentLines = useSpent(currentMonth);
  const spentSummary = spendingTotals(spentLines);
  const envelopeSummary = envelopeMonthlyTotal(envelopes, budget?.currency ?? settings.currency);
  const plannedSummary = budgetSummary.plannedCents + envelopeSummary;
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
          <>
            <section className="card oiko-empty first-run">
              <h2 className="card__title">No bills yet</h2>
              <div className="button-row">
                <button type="button" className="button-main" onClick={() => nav.swap({ name: 'capture' })}>
                  Add a bill
                </button>
                <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'expense' })}>
                  Record an expense
                </button>
              </div>
            </section>
            <button type="button" className="card oiko-budget-home" onClick={() => nav.go({ name: 'budget' })}>
              <span className="card__eyebrow">Monthly budget</span>
              {spentSummary.spentCents > 0 ? (
                <span className="oiko-budget-home__line"><strong>{formatMoney(spentSummary.spentCents, budget?.currency ?? settings.currency)}</strong><span>{budget?.totalCents ? `${formatMoney(Math.max(0, budget.totalCents - spentSummary.spentCents), budget.currency)} left` : 'spent so far'}</span></span>
              ) : plannedSummary || budget?.totalCents ? (
                <span className="oiko-budget-home__line"><strong>{formatMoney(plannedSummary, budget?.currency ?? settings.currency)}</strong><span>{budget?.totalCents ? `of ${formatMoney(budget.totalCents, budget.currency)}` : ''}</span></span>
              ) : (
                <span className="oiko-budget-home__line"><span>Set a monthly amount</span></span>
              )}
              <span className="muted"><ChevronIcon size={18} /></span>
            </button>
          </>
        ) : (
          <>
            {next && (
              <section className="card oiko-next-card" data-ll-lit={needsAttention(next.bill, next.date, today) ? 'fallback' : undefined}>
                <button type="button" className="oiko-next-card__bill" onClick={() => nav.go({ name: 'bill', id: next.bill.id })}>
                  <span className="oiko-bill-emblem"><RepeatIcon size={20} /></span>
                  <span className="oiko-next-card__words">
                    <strong>{next.bill.name}</strong>
                    <span>{next.date < today ? relativeDue(next.date, today) : `${relativeDue(next.date, today)} · ${formatDate(next.date)}`}</span>
                  </span>
                  <span className="oiko-next-card__amount">{formatMoney(next.bill.amountCents, next.bill.currency)}</span>
                  <ChevronIcon size={18} />
                </button>
              </section>
            )}

            <PayCard nav={nav} bills={all} today={today} currency={settings.currency} />

            <div className="button-row oiko-home-actions">
              <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'expense' })}>Record an expense</button>
              <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'spent' })}>View expenses</button>
            </div>

            <div className="oiko-section-head">
              <h2>This month</h2>
              <button type="button" className="text-link" onClick={() => nav.swap({ name: 'calendar' })}>View calendar</button>
            </div>
            {thisMonth.length > 0 && (
              <p className="oiko-total">
                <strong><Total summary={remainingSummary(thisMonth, today)} /></strong>
                <span>{remainingSummary(thisMonth, today).note}</span>
              </p>
            )}
            <section className="oiko-list" aria-label="Bills this month">
              {monthOpen.slice(0, 8).map((occurrence) => (
                <SwipeRow key={occurrence.bill.id + occurrence.date} label="Paid" onSwipe={() => void payBill(occurrence.bill, occurrence.date)}>
                  {billRow(occurrence.bill, occurrence.date, nav, today)}
                </SwipeRow>
              ))}
              {thisMonth.length === 0 && <p className="muted">Nothing is scheduled for this month.</p>}
              {thisMonth.length > 0 && monthOpen.length === 0 && <p className="muted">Nothing left to pay this month.</p>}
            </section>
            <button type="button" className="card oiko-budget-home" onClick={() => nav.go({ name: 'budget' })}>
              <span className="card__eyebrow">Monthly budget</span>
              {spentSummary.spentCents > 0 ? (
                <span className="oiko-budget-home__line"><strong>{formatMoney(spentSummary.spentCents, budget?.currency ?? settings.currency)}</strong><span>{budget?.totalCents ? `${formatMoney(Math.max(0, budget.totalCents - spentSummary.spentCents), budget.currency)} left` : 'spent so far'}</span></span>
              ) : (
                <span className="oiko-budget-home__line"><strong>{formatMoney(plannedSummary, budget?.currency ?? settings.currency)}</strong><span>{budget?.totalCents ? `of ${formatMoney(budget.totalCents, budget.currency)}` : 'Set a monthly amount'}</span></span>
              )}
              <span className="muted"><ChevronIcon size={18} /></span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
