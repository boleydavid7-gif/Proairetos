import type { Nav } from '../app/App';
import { ChevronIcon } from '../app/icons';
import { formatMoney } from '../core/bills';
import { budgetTotals, monthKey, spendingTotals } from '../core/budget';
import { envelopeMonthlyTotal } from '../core/envelopes';
import { useBills, useBudget, useEnvelopes, useSettings, useSomaRecipes } from '../app/state';
import { useSpent } from '../data/spent';

/** This month's plan and what was spent. It shows only once there is a plan or something spent; nothing here asks for either. */
export default function BudgetCard({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const bills = useBills() ?? [];
  const recipes = useSomaRecipes();
  const month = monthKey(new Date());
  const budget = useBudget(month);
  const envelopes = useEnvelopes();
  const currency = budget?.currency ?? settings.currency;
  const planned = budgetTotals(bills, recipes, month, currency, budget?.items ?? []).plannedCents + envelopeMonthlyTotal(envelopes, currency);
  const spent = spendingTotals(useSpent(month)).spentCents;
  if (!spent && !budget?.totalCents) return null;
  return (
    <button type="button" className="card oiko-budget-home" onClick={() => nav.go({ name: 'budget' })}>
      <span className="card__eyebrow">Monthly plan</span>
      {spent > 0 ? (
        <span className="oiko-budget-home__line">
          <strong>{formatMoney(spent, currency)}</strong>
          <span>{budget?.totalCents ? `${formatMoney(Math.max(0, budget.totalCents - spent), currency)} left` : 'spent so far'}</span>
        </span>
      ) : (
        <span className="oiko-budget-home__line">
          <strong>{formatMoney(planned, currency)}</strong>
          <span>{budget?.totalCents ? `of ${formatMoney(budget.totalCents, currency)}` : ''}</span>
        </span>
      )}
      <span className="muted"><ChevronIcon size={18} /></span>
    </button>
  );
}
