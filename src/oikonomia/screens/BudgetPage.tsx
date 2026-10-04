import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, ChevronIcon, WalletIcon } from '../app/icons';
import { useBills, useBudget, useSettings, useSomaRecipes } from '../app/state';
import { formatMoney, nextMonth } from '../core/bills';
import { budgetCategories, budgetTotals, emptyLimits, formatMonthKey, monthDate, monthKey, moneyInputCents, newBudget, type BudgetPlan } from '../core/budget';
import { putBudget } from '../data/store';
import { PageTop } from '../app/ui';

const amountText = (value: number) => (value ? (value / 100).toFixed(2) : '');

export default function BudgetPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const bills = useBills() ?? [];
  const recipes = useSomaRecipes();
  const [month, setMonth] = useState(() => monthKey());
  const saved = useBudget(month);
  const [draft, setDraft] = useState<BudgetPlan>();
  const [totalText, setTotalText] = useState('');
  const [categoryText, setCategoryText] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(false);
    setMessage('');
  }, [month]);

  useEffect(() => {
    if (saved === null || saved.month !== month || dirty) return;
    setDraft(saved ?? newBudget(month, settings.currency));
    const next = saved ?? newBudget(month, settings.currency);
    setTotalText(amountText(next.totalCents));
    setCategoryText(Object.fromEntries(budgetCategories.map(({ id }) => [id, amountText(next.categoryLimits?.[id] ?? 0)])));
  }, [month, saved, settings.currency, dirty]);

  const rawPlan = draft ?? saved ?? newBudget(month, settings.currency);
  const plan: BudgetPlan = {
    ...rawPlan,
    totalCents: Number.isFinite(rawPlan.totalCents) && rawPlan.totalCents >= 0 ? rawPlan.totalCents : 0,
    categoryLimits: { ...emptyLimits(), ...(rawPlan.categoryLimits ?? {}) },
  };
  const planCurrency = plan.currency || settings.currency;
  const totals = useMemo(() => budgetTotals(bills, recipes, month, planCurrency), [bills, recipes, month, planCurrency]);
  const limit = plan.totalCents;
  const remaining = limit - totals.plannedCents;
  const monthDateValue = monthDate(month);

  const changeMonth = (amount: number) => setMonth(monthKey(nextMonth(monthDateValue, amount)));
  async function save() {
    const totalCents = moneyInputCents(totalText);
    if (totalCents === undefined) {
      setMessage('Use an amount with up to two decimal places.');
      return;
    }
    const categoryLimits = { ...plan.categoryLimits };
    for (const { id } of budgetCategories) {
      const value = moneyInputCents(categoryText[id] ?? '');
      if (value === undefined) {
        setMessage('Use amounts with up to two decimal places.');
        return;
      }
      categoryLimits[id] = value;
    }
    await putBudget({ ...plan, totalCents, categoryLimits, month, id: month, currency: planCurrency, updatedAt: new Date().toISOString() });
    setMessage('Monthly plan saved.');
  }

  return (
    <div className="page oiko-page oiko-budget">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Back</button>
        <span className="oiko-budget__mark"><WalletIcon size={20} /></span>
      </PageTop>

      <div className="oiko-budget__heading">
        <div>
          <p className="label">Plan your month</p>
          <h1 className="title">{formatMonthKey(month)}</h1>
        </div>
        <div className="oiko-budget__switch">
          <button type="button" className="round-button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
          <button type="button" className="round-button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronIcon size={18} /></button>
        </div>
      </div>

      <section className="card oiko-budget-summary">
        <span className="card__eyebrow">Planned so far</span>
        <strong className="oiko-budget-summary__amount">{formatMoney(totals.plannedCents, planCurrency)}</strong>
        <p className="muted">{limit > 0 ? `${formatMoney(Math.abs(remaining), planCurrency)} ${remaining >= 0 ? 'left in your plan' : 'over your plan'}.` : 'Set a monthly amount below to give this month a shape.'}</p>
        <div className="oiko-budget-summary__bar" aria-hidden="true"><span style={{ width: `${limit ? Math.min(100, (totals.plannedCents / limit) * 100) : 0}%` }} /></div>
      </section>

      <section className="oiko-budget-section">
        <div className="oiko-section-head"><h2>Your plan</h2><span className="muted">Optional</span></div>
        <label className="field"><span className="field__label">Monthly amount</span><input className="input" type="text" inputMode="decimal" value={totalText} onChange={(event) => { setDirty(true); setTotalText(event.target.value); }} placeholder="0.00" /></label>
        <p className="hint">Bills are projected from their schedules. Meals come from recipes you plan in SOMA.</p>
      </section>

      <section className="oiko-budget-section">
        <div className="oiko-section-head"><h2>By area</h2><span className="muted">Planned / limit</span></div>
        <div className="oiko-budget-areas">
          {budgetCategories.map(({ id, label }) => (
            <label className="oiko-budget-area" key={id}>
              <span><strong>{label}</strong><small>{formatMoney(totals.byCategory[id], planCurrency)} planned</small></span>
              <input className="input" type="text" inputMode="decimal" aria-label={`${label} monthly limit`} value={categoryText[id] ?? ''} onChange={(event) => { setDirty(true); setCategoryText({ ...categoryText, [id]: event.target.value }); }} placeholder="Limit" />
            </label>
          ))}
        </div>
      </section>

      <section className="oiko-budget-breakdown">
        <div className="oiko-section-head"><h2>What is included</h2></div>
        <div className="oiko-budget-breakdown__row"><span>Bills</span><strong>{formatMoney(totals.billCents, planCurrency)}</strong></div>
        <div className="oiko-budget-breakdown__row"><span>Planned meals</span><strong>{formatMoney(totals.mealCents, planCurrency)}</strong></div>
        {totals.mealCents === 0 && <p className="hint">Add an estimated cost to a recipe in SOMA, then plan it for this month.</p>}
        {totals.mealsWithoutEstimate > 0 && <p className="hint">{totals.mealsWithoutEstimate} planned {totals.mealsWithoutEstimate === 1 ? 'meal has' : 'meals have'} no estimate yet.</p>}
        {totals.otherCurrencyCount > 0 && <p className="hint">Some scheduled amounts use another currency and are left out.</p>}
      </section>

      <button type="button" className="button-main" onClick={() => void save()}>Save monthly plan</button>
      {message && <p className="oiko-success" role="status">{message}</p>}
    </div>
  );
}
