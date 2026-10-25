import { RollingNumber } from '../../lamplight/RollingNumber';
import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, ArrowRightIcon, WalletIcon } from '../app/icons';
import { offerUndo } from '../app/undo';
import { newId, useBills, useBudget, useEnvelopes, useSettings, useSomaRecipes } from '../app/state';
import { formatDate, formatMoney, nextMonth } from '../core/bills';
import { budgetCategories, budgetTotals, emptyLimits, foodWeekSummary, formatMonthKey, monthDate, monthKey, moneyInputCents, newBudget, spendingTotals, type BudgetCategory, type BudgetPlan } from '../core/budget';
import { incomeForMonth } from '../core/pay';
import { envelopeMonthlyTotal } from '../core/envelopes';
import { usePays } from '../data/pay';
import { monthsWithSpent, spentIn, useSpent } from '../data/spent';
import { loadSettings, putBudget, saveSettings } from '../data/store';
import { PageTop } from '../app/ui';
import IconButton from '../../components/ui/IconButton';
import { toLocalDate } from '../../core/scheduling/dates';

const amountText = (value: number) => (value ? (value / 100).toFixed(2) : '');
const areaCategories = budgetCategories;

export default function BudgetPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const bills = useBills() ?? [];
  const recipes = useSomaRecipes();
  const pays = usePays();
  const envelopes = useEnvelopes();
  const [month, setMonth] = useState(() => monthKey());
  const spentLines = useSpent(month);
  const saved = useBudget(month);
  const [draft, setDraft] = useState<BudgetPlan>();
  const [totalText, setTotalText] = useState('');
  const [categoryText, setCategoryText] = useState<Record<string, string>>({});
  const [itemName, setItemName] = useState('');
  const [itemAmountText, setItemAmountText] = useState('');
  const [itemCategory, setItemCategory] = useState<BudgetCategory>('other');
  const [weeklyFoodText, setWeeklyFoodText] = useState('');
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
    setCategoryText(Object.fromEntries(areaCategories.map(({ id }) => [id, amountText(next.categoryLimits?.[id] ?? 0)])));
    setItemName('');
    setItemAmountText('');
    setItemCategory('other');
    setWeeklyFoodText(settings.weeklyFoodBudgetCents ? amountText(settings.weeklyFoodBudgetCents) : '');
  }, [month, saved, settings.currency, dirty]);

  const rawPlan = draft ?? saved ?? newBudget(month, settings.currency);
  const plan: BudgetPlan = {
    ...rawPlan,
    totalCents: Number.isFinite(rawPlan.totalCents) && rawPlan.totalCents >= 0 ? rawPlan.totalCents : 0,
    categoryLimits: { ...emptyLimits(), ...(rawPlan.categoryLimits ?? {}) },
    items: rawPlan.items ?? [],
  };
  const planCurrency = plan.currency || settings.currency;
  const totals = useMemo(() => budgetTotals(bills, recipes, month, planCurrency, plan.items), [bills, recipes, month, planCurrency, plan.items]);
  const spent = useMemo(() => spendingTotals(spentLines), [spentLines]);
  const income = useMemo(() => incomeForMonth(pays, month, planCurrency), [pays, month, planCurrency]);
  const envelopeCents = useMemo(() => envelopeMonthlyTotal(envelopes, planCurrency), [envelopes, planCurrency]);
  const plannedTotal = totals.plannedCents + envelopeCents;
  const limit = plan.totalCents || income.expectedCents;
  const plannedRemaining = limit - plannedTotal;
  const actualRemaining = limit - spent.spentCents;
  const monthDateValue = monthDate(month);
  const allSpent = useMemo(() => {
    const months = new Set(monthsWithSpent());
    months.add(month);
    return [...months].flatMap((key) => spentIn(key));
  }, [spentLines]);
  const foodWeek = useMemo(() => foodWeekSummary(allSpent, recipes, toLocalDate(new Date()), settings.planWeekStart, planCurrency), [allSpent, recipes, settings.planWeekStart, planCurrency]);
  const weeklyFoodLimit = settings.weeklyFoodBudgetCents ?? 0;
  const weekSpentRemaining = weeklyFoodLimit - foodWeek.actualCents;
  const weekPaceOver = weeklyFoodLimit > 0 && foodWeek.paceCents > weeklyFoodLimit;

  const changeMonth = (amount: number) => setMonth(monthKey(nextMonth(monthDateValue, amount)));
  const changeItems = (items: BudgetPlan['items']) => {
    const next = { ...plan, items };
    setDraft(next);
    void keep(next);
  };

  function addItem() {
    const name = itemName.trim();
    const amountCents = moneyInputCents(itemAmountText);
    if (!name) {
      setMessage('Name the budget item first.');
      return;
    }
    if (amountCents === undefined || amountCents === 0) {
      setMessage('Use an amount with up to two decimal places.');
      return;
    }
    changeItems([...plan.items, { id: newId(), name, amountCents, category: itemCategory }]);
    setItemName('');
    setItemAmountText('');
    setMessage('');
  }

  function removeItem(id: string) {
    const before = plan.items;
    const gone = before.find((item) => item.id === id);
    changeItems(before.filter((item) => item.id !== id));
    offerUndo(`${gone?.name ?? 'Item'} removed`, () => changeItems(before));
  }

  /** Saved as it changes: the amounts when a box is left, items when added or removed. */
  async function keep(base: BudgetPlan = plan) {
    const totalCents = moneyInputCents(totalText);
    if (totalCents === undefined) {
      setMessage('Use an amount with up to two decimal places.');
      return;
    }
    const categoryLimits = { ...plan.categoryLimits };
    for (const { id } of areaCategories) {
      const value = moneyInputCents(categoryText[id] ?? '');
      if (value === undefined) {
        setMessage('Use amounts with up to two decimal places.');
        return;
      }
      categoryLimits[id] = value;
    }
    setMessage('');
    setDirty(false);
    await putBudget({ ...base, totalCents, categoryLimits, month, id: month, currency: planCurrency, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="page oiko-page oiko-budget">
      <PageTop>
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={20} /> Back</button>
        <span className="oiko-budget__mark"><WalletIcon size={20} /></span>
      </PageTop>

      <div className="oiko-budget__heading">
        <div>
          <p className="label">Plan your month</p>
          <h1 className="title">{formatMonthKey(month)}</h1>
        </div>
        <div className="oiko-budget__switch">
          <IconButton size="md" className="round-button" label="Previous month" onClick={() => changeMonth(-1)}><ArrowLeftIcon size={18} /></IconButton>
          <IconButton size="md" className="round-button" label="Next month" onClick={() => changeMonth(1)}><ArrowRightIcon size={18} /></IconButton>
        </div>
      </div>

      <section className="card oiko-budget-summary">
        <span className="oiko-budget-summary__eyebrow">Planned this month</span>
        <strong className="oiko-budget-summary__amount"><RollingNumber key={planCurrency} value={plannedTotal} format={(cents) => formatMoney(Math.round(cents), planCurrency)} /></strong>
        {limit > 0 ? <p className="muted">{formatMoney(Math.abs(plannedRemaining), planCurrency)} {plannedRemaining >= 0 ? 'left after planned costs' : 'over the usual amount'}</p> : <p className="muted">Set a monthly amount or add usual pay to see what remains.</p>}
        <div className="oiko-budget-summary__bar ll-signature" aria-label={`${formatMoney(plannedTotal, planCurrency)} planned of ${limit ? formatMoney(limit, planCurrency) : 'no amount set'}`} role="meter" aria-valuemin={0} aria-valuemax={limit || undefined} aria-valuenow={Math.min(plannedTotal, limit || plannedTotal)}><span className="ll-grow ll-lit ll-lit--end ll-travel" style={{ width: `${limit ? Math.min(100, (plannedTotal / limit) * 100) : 0}%` }} /></div>
        <div className="oiko-budget-summary__facts">
          <span><small>Spent</small><strong>{formatMoney(spent.spentCents, planCurrency)}</strong></span>
          <span><small>Usual income</small><strong>{income.expectedCents ? formatMoney(income.expectedCents, planCurrency) : 'Not set'}</strong></span>
          <span><small>Available after spending</small><strong className={actualRemaining < 0 ? 'is-over' : ''}>{limit ? formatMoney(actualRemaining, planCurrency) : '—'}</strong></span>
        </div>
        {income.unknownPayDates > 0 && <p className="hint">{income.unknownPayDates} pay {income.unknownPayDates === 1 ? 'date has' : 'dates have'} no amount yet. Add one in More → Pay.</p>}
      </section>

      <section className="oiko-budget-section">
        <div className="oiko-section-head"><h2>Limits</h2></div>
        <label className="field"><span className="field__label">Monthly limit</span><input className="input" type="text" inputMode="decimal" value={totalText} onChange={(event) => { setDirty(true); setTotalText(event.target.value); }} onBlur={() => void keep()} placeholder="Optional" /></label>
        <label className="field"><span className="field__label">Weekly food limit</span><input className="input" type="text" inputMode="decimal" value={weeklyFoodText} onChange={(event) => setWeeklyFoodText(event.target.value)} onBlur={() => {
          const value = weeklyFoodText.trim() ? moneyInputCents(weeklyFoodText) : 0;
          saveSettings({ ...loadSettings(), weeklyFoodBudgetCents: value ? value : undefined });
        }} placeholder="Optional" /></label>
      </section>

      {weeklyFoodLimit > 0 && (
        <section className="card oiko-food-week" aria-label="Weekly food budget">
          <div className="oiko-section-head"><h2>This week’s food</h2><span className="muted">{formatDate(foodWeek.from)} – {formatDate(foodWeek.until)}</span></div>
          <div className="oiko-food-week__amount"><strong>{formatMoney(foodWeek.actualCents, planCurrency)}</strong><span>of {formatMoney(weeklyFoodLimit, planCurrency)} spent</span></div>
          <div className="oiko-budget-summary__bar" role="meter" aria-valuemin={0} aria-valuemax={weeklyFoodLimit} aria-valuenow={Math.min(foodWeek.actualCents, weeklyFoodLimit)}><span className={weekSpentRemaining < 0 ? 'is-over' : ''} style={{ width: `${Math.min(100, (foodWeek.actualCents / weeklyFoodLimit) * 100)}%` }} /></div>
          {foodWeek.actualCents > weeklyFoodLimit ? <p className="oiko-food-week__status is-over">Over by {formatMoney(foodWeek.actualCents - weeklyFoodLimit, planCurrency)}.</p> : weekPaceOver ? <p className="oiko-food-week__status is-over">At this pace, you may finish about {formatMoney(foodWeek.paceCents, planCurrency)} over the week.</p> : <p className="oiko-food-week__status">{formatMoney(Math.max(0, weekSpentRemaining), planCurrency)} left for this week.</p>}
          {foodWeek.typicalCents !== undefined && <p className="muted">Typical week: {formatMoney(foodWeek.typicalCents, planCurrency)} based on {foodWeek.typicalWeeks} previous {foodWeek.typicalWeeks === 1 ? 'week' : 'weeks'} of food expenses.</p>}
          {foodWeek.plannedCents > 0 && <p className="muted">Planned recipes: about {formatMoney(foodWeek.plannedCents, planCurrency)}{foodWeek.mealsWithoutEstimate ? ` · ${foodWeek.mealsWithoutEstimate} meal${foodWeek.mealsWithoutEstimate === 1 ? '' : 's'} have no estimate` : ''}.</p>}
          {!foodWeek.actualCount && !foodWeek.plannedCents && <p className="muted">Add food expenses or cost your planned recipes to make this estimate more useful.</p>}
        </section>
      )}

      <section className="oiko-budget-section">
        <div className="oiko-section-head"><h2>Budget items</h2></div>
        {plan.items.length > 0 && (
          <div className="oiko-budget-items">
            {plan.items.map((item) => (
              <div className="oiko-budget-item" key={item.id}>
                <span><strong>{item.name}</strong><small>{budgetCategories.find(({ id }) => id === item.category)?.label ?? 'Other'}</small></span>
                <strong>{formatMoney(item.amountCents, planCurrency)}</strong>
                <button type="button" className="text-link" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="oiko-budget-item-form">
          <label className="field"><span className="field__label">Name</span><input className="input" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Childcare" /></label>
          <label className="field"><span className="field__label">Amount</span><input className="input" type="text" inputMode="decimal" value={itemAmountText} onChange={(event) => setItemAmountText(event.target.value)} placeholder="0.00" /></label>
          <label className="field"><span className="field__label">Area</span><select className="input" value={itemCategory} onChange={(event) => setItemCategory(event.target.value as BudgetCategory)}>{budgetCategories.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
          <button type="button" className="button-quiet" onClick={addItem}>Add item</button>
        </div>
      </section>

      <section className="oiko-budget-section">
        <div className="oiko-section-head"><h2>By area</h2><span className="muted">Spent · planned · limit</span></div>
        <div className="oiko-budget-areas">
          {areaCategories.map(({ id, label }) => (
            <label className="oiko-budget-area" key={id}>
              <span><strong>{label}</strong><small>{formatMoney(spent.byCategory[id], planCurrency)} spent · {formatMoney(totals.byCategory[id] + (id === 'savings' ? envelopeCents : 0), planCurrency)} planned</small><span className="oiko-budget-area__track" aria-hidden="true"><span style={{ width: `${plan.categoryLimits[id] ? Math.min(100, (spent.byCategory[id] / plan.categoryLimits[id]) * 100) : 0}%` }} /></span></span>
              <input className="input" type="text" inputMode="decimal" aria-label={`${label} monthly limit`} value={categoryText[id] ?? ''} onChange={(event) => { setDirty(true); setCategoryText({ ...categoryText, [id]: event.target.value }); }} onBlur={() => void keep()} placeholder="Limit" />
            </label>
          ))}
        </div>
      </section>

      {message && <p className="oiko-error" role="alert">{message}</p>}
    </div>
  );
}
