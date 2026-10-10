import { useEffect, useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { ArrowLeftIcon, ArrowRightIcon, WalletIcon } from '../app/icons';
import { offerUndo } from '../app/undo';
import { newId, useBills, useBudget, useSettings, useSomaRecipes } from '../app/state';
import { formatMoney, nextMonth } from '../core/bills';
import { budgetCategories, budgetTotals, emptyLimits, formatMonthKey, monthDate, monthKey, moneyInputCents, newBudget, type BudgetCategory, type BudgetPlan } from '../core/budget';
import { putBudget } from '../data/store';
import { PageTop } from '../app/ui';

const amountText = (value: number) => (value ? (value / 100).toFixed(2) : '');
const areaCategories = budgetCategories.filter(({ id }) => id !== 'food' && id !== 'utilities');

export default function BudgetPage({ nav }: { nav: Nav }) {
  const settings = useSettings();
  const bills = useBills() ?? [];
  const recipes = useSomaRecipes();
  const [month, setMonth] = useState(() => monthKey());
  const saved = useBudget(month);
  const [draft, setDraft] = useState<BudgetPlan>();
  const [totalText, setTotalText] = useState('');
  const [categoryText, setCategoryText] = useState<Record<string, string>>({});
  const [itemName, setItemName] = useState('');
  const [itemAmountText, setItemAmountText] = useState('');
  const [itemCategory, setItemCategory] = useState<BudgetCategory>('other');
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
  const limit = plan.totalCents;
  const remaining = limit - totals.plannedCents;
  const monthDateValue = monthDate(month);

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
        <button type="button" className="back-link" onClick={nav.back}><ArrowLeftIcon size={19} /> Back</button>
        <span className="oiko-budget__mark"><WalletIcon size={20} /></span>
      </PageTop>

      <div className="oiko-budget__heading">
        <div>
          <p className="label">Plan your month</p>
          <h1 className="title">{formatMonthKey(month)}</h1>
        </div>
        <div className="oiko-budget__switch">
          <button type="button" className="round-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ArrowLeftIcon size={18} /></button>
          <button type="button" className="round-button" aria-label="Next month" onClick={() => changeMonth(1)}><ArrowRightIcon size={18} /></button>
        </div>
      </div>

      <section className="card oiko-budget-summary">
        <strong className="oiko-budget-summary__amount">{formatMoney(totals.plannedCents, planCurrency)}</strong>
        {limit > 0 && <p className="muted">{formatMoney(Math.abs(remaining), planCurrency)} {remaining >= 0 ? 'left in the plan' : 'more than the plan'}</p>}
        <div className="oiko-budget-summary__bar" aria-hidden="true"><span style={{ width: `${limit ? Math.min(100, (totals.plannedCents / limit) * 100) : 0}%` }} /></div>
      </section>

      <section className="oiko-budget-breakdown oiko-budget-main-lines" aria-label="Main budget">
        <div className="oiko-section-head"><h2>Budget</h2></div>
        <div className="oiko-budget-breakdown__row"><span>Bills</span><strong>{formatMoney(totals.billCents, planCurrency)}</strong></div>
        <div className="oiko-budget-breakdown__row"><span>Food</span><strong>{formatMoney(totals.mealCents, planCurrency)}</strong></div>
        <div className="oiko-budget-breakdown__row"><span>Budget items</span><strong>{formatMoney(totals.itemCents, planCurrency)}</strong></div>
      </section>

      <section className="oiko-budget-section">
        <div className="oiko-section-head"><h2>Your plan</h2></div>
        <label className="field"><span className="field__label">Monthly amount</span><input className="input" type="text" inputMode="decimal" value={totalText} onChange={(event) => { setDirty(true); setTotalText(event.target.value); }} onBlur={() => void keep()} placeholder="0.00" /></label>
      </section>

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
        <div className="oiko-section-head"><h2>By area</h2><span className="muted">Planned / limit</span></div>
        <div className="oiko-budget-areas">
          {areaCategories.map(({ id, label }) => (
            <label className="oiko-budget-area" key={id}>
              <span><strong>{label}</strong><small>{formatMoney(totals.byCategory[id], planCurrency)} planned</small></span>
              <input className="input" type="text" inputMode="decimal" aria-label={`${label} monthly limit`} value={categoryText[id] ?? ''} onChange={(event) => { setDirty(true); setCategoryText({ ...categoryText, [id]: event.target.value }); }} onBlur={() => void keep()} placeholder="Limit" />
            </label>
          ))}
        </div>
      </section>

      {message && <p className="oiko-error" role="alert">{message}</p>}
    </div>
  );
}
