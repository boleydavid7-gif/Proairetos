import { monthBounds, occurrencesBetween, type Bill } from './bills';
import type { Recipe } from '../../soma/core/recipes';

/** A small set of household areas that can hold a monthly plan. */
export type BudgetCategory = 'housing' | 'utilities' | 'transport' | 'food' | 'health' | 'subscriptions' | 'other';

export const budgetCategories: { id: BudgetCategory; label: string }[] = [
  { id: 'housing', label: 'Home' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'transport', label: 'Transport' },
  { id: 'food', label: 'Food' },
  { id: 'health', label: 'Health' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'other', label: 'Other' },
];

export type BudgetPlan = {
  /** The month itself is the stable id, e.g. 2026-10. */
  id: string;
  month: string;
  currency: string;
  /** An optional ceiling for the whole month. */
  totalCents: number;
  /** Optional ceilings by area. */
  categoryLimits: Record<BudgetCategory, number>;
  createdAt: string;
  updatedAt: string;
};

export type BudgetTotals = {
  plannedCents: number;
  billCents: number;
  mealCents: number;
  byCategory: Record<BudgetCategory, number>;
  mealsWithoutEstimate: number;
  otherCurrencyCount: number;
};

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthDate(month: string): Date {
  const [year, index] = month.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (index || 1) - 1, 1, 12);
}

export function emptyLimits(): Record<BudgetCategory, number> {
  return Object.fromEntries(budgetCategories.map(({ id }) => [id, 0])) as Record<BudgetCategory, number>;
}

export function newBudget(month: string, currency: string, now = new Date().toISOString()): BudgetPlan {
  return { id: month, month, currency, totalCents: 0, categoryLimits: emptyLimits(), createdAt: now, updatedAt: now };
}

/** Money stays as text during editing; convert once when saving. Blank means no limit. */
export function moneyInputCents(value: string): number | undefined {
  if (!value.trim()) return 0;
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(value.trim())) return undefined;
  const amount = Math.round(Number(value.replace(',', '.')) * 100);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
}

/** Older or partially restored plans can omit areas; fill only missing amounts. */
export function normalizeBudget(value: unknown): BudgetPlan | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Partial<BudgetPlan>;
  if (typeof input.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) || input.id !== input.month) return undefined;
  const safeAmount = (amount: unknown) => typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
  const limits = emptyLimits();
  for (const { id } of budgetCategories) limits[id] = safeAmount(input.categoryLimits?.[id]);
  return {
    ...newBudget(input.month, typeof input.currency === 'string' && /^[A-Z]{3}$/.test(input.currency) ? input.currency : 'USD', ''),
    totalCents: safeAmount(input.totalCents),
    categoryLimits: limits,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : '',
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : '',
  };
}

/** Turns the free text bill category into one of the few planning areas. */
export function budgetCategory(category: string | undefined): BudgetCategory {
  const value = (category ?? '').trim().toLowerCase();
  if (/\b(rent|mortgage|home|house|housing|property)\b/.test(value)) return 'housing';
  if (/\b(electric|electricity|water|gas|utility|utilities|internet|phone|power)\b/.test(value)) return 'utilities';
  if (/\b(car|auto|transport|fuel|gasoline|train|bus|transit|parking)\b/.test(value)) return 'transport';
  if (/\b(food|groceries|grocery|meals?|restaurants?|dining)\b/.test(value)) return 'food';
  if (/\b(health|medical|doctor|care|pharmacy|dental)\b/.test(value)) return 'health';
  if (/\b(subscriptions?|streaming|memberships?|software)\b/.test(value)) return 'subscriptions';
  return 'other';
}

/** Projected costs for a month. This deliberately uses bills and planned meals, not bank data. */
export function budgetTotals(bills: readonly Bill[], recipes: readonly Recipe[], month: string, currency?: string): BudgetTotals {
  const bounds = monthBounds(monthDate(month));
  const byCategory = emptyLimits();
  let billCents = 0;
  let otherCurrencyCount = 0;
  for (const bill of bills) {
    const occurrences = occurrencesBetween(bill, bounds.from, bounds.until).length;
    if (currency && bill.currency !== currency) {
      otherCurrencyCount += occurrences;
      continue;
    }
    const amount = occurrences * Math.max(0, bill.amountCents);
    byCategory[budgetCategory(bill.category)] += amount;
    billCents += amount;
  }
  let mealCents = 0;
  let mealsWithoutEstimate = 0;
  for (const recipe of recipes) {
    const days = new Set((recipe.planned ?? []).filter((day) => day >= bounds.from && day <= bounds.until));
    if (recipe.estimatedCostCents === undefined) {
      mealsWithoutEstimate += days.size;
      continue;
    }
    if (currency && recipe.estimatedCostCurrency && recipe.estimatedCostCurrency !== currency) {
      otherCurrencyCount += days.size;
      continue;
    }
    mealCents += days.size * Math.max(0, recipe.estimatedCostCents);
  }
  byCategory.food += mealCents;
  return { plannedCents: billCents + mealCents, billCents, mealCents, byCategory, mealsWithoutEstimate, otherCurrencyCount };
}

/** Preview one meal without counting an already planned occurrence twice. */
export function recipeBudgetComparison(recipe: Recipe, plan: BudgetPlan, totals: BudgetTotals, factor = 1) {
  const costCents = Math.round((recipe.estimatedCostCents ?? 0) * factor);
  if (recipe.estimatedCostCents === undefined || (recipe.estimatedCostCurrency && recipe.estimatedCostCurrency !== plan.currency)) return undefined;
  const foodLimit = plan.categoryLimits.food;
  const limitCents = foodLimit || plan.totalCents;
  if (!limitCents) return undefined;
  const alreadyPlanned = recipe.planned?.some((day) => day.startsWith(plan.month + '-')) ?? false;
  const beforeCents = foodLimit ? totals.byCategory.food : totals.plannedCents;
  const projectedCents = beforeCents + costCents - (alreadyPlanned ? recipe.estimatedCostCents : 0);
  return { costCents, limitCents, remainingCents: limitCents - projectedCents, alreadyPlanned, label: foodLimit ? 'Food budget' : 'Monthly budget' };
}

export function formatMonthKey(month: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(monthDate(month));
}
