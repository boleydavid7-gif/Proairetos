import { budgetCategory, budgetTotals, emptyLimits, moneyInputCents, newBudget, normalizeBudget, recipeBudgetComparison } from '../../oikonomia/core/budget';
import type { Bill } from '../../oikonomia/core/bills';
import type { Recipe } from '../../soma/core/recipes';

const bill = (change: Partial<Bill> = {}): Bill => ({
  id: 'rent',
  name: 'Rent',
  amountCents: 120000,
  currency: 'USD',
  dueDate: '2026-10-01',
  frequency: 'monthly',
  category: 'Home',
  autopay: true,
  reminderDays: 3,
  payments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...change,
});

const recipe = (change: Partial<Recipe> = {}): Recipe => ({
  id: 'soup',
  title: 'Soup',
  ingredients: [],
  steps: [],
  notes: '',
  tags: [],
  planned: ['2026-10-05'],
  estimatedCostCents: 850,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...change,
});

describe('Oikonomia monthly planning', () => {
  it('projects recurring bills and planned meals into areas', () => {
    const totals = budgetTotals([bill(), bill({ id: 'phone', name: 'Phone', amountCents: 5000, category: 'Utilities' })], [recipe()], '2026-10', 'USD');
    expect(totals.billCents).toBe(125000);
    expect(totals.mealCents).toBe(850);
    expect(totals.byCategory.housing).toBe(120000);
    expect(totals.byCategory.utilities).toBe(5000);
    expect(totals.byCategory.food).toBe(850);
    expect(totals.plannedCents).toBe(125850);
  });

  it('does not mix another currency into the plan', () => {
    expect(budgetTotals([bill({ currency: 'CAD' })], [], '2026-10', 'USD').plannedCents).toBe(0);
  });

  it('keeps categories and new monthly plans stable', () => {
    expect(budgetCategory('streaming subscription')).toBe('subscriptions');
    expect(budgetCategory('')).toBe('other');
    expect(newBudget('2026-10', 'USD').categoryLimits).toEqual(emptyLimits());
  });

  it('matches words without turning care or gasoline into the wrong area', () => {
    expect(budgetCategory('Care')).toBe('health');
    expect(budgetCategory('Gasoline')).toBe('transport');
  });

  it('keeps amounts editable until they are saved', () => {
    expect(moneyInputCents('1')).toBe(100);
    expect(moneyInputCents('1.2')).toBe(120);
    expect(moneyInputCents('1.234')).toBeUndefined();
    expect(normalizeBudget({ id: '2026-10', month: '2026-10', totalCents: 250000 })?.categoryLimits).toEqual(emptyLimits());
  });

  it('does not double count a meal already planned in the month', () => {
    const plan = { ...newBudget('2026-10', 'USD'), totalCents: 10000, categoryLimits: { ...emptyLimits(), food: 10000 } };
    const planned = recipe({ planned: ['2026-10-05', '2026-10-06'] });
    const totals = budgetTotals([], [planned], '2026-10', 'USD');
    expect(recipeBudgetComparison(planned, plan, totals)?.remainingCents).toBe(8300);
  });
});
