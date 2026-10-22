import { monthBounds, occurrencesBetween, type Bill } from './bills';
import type { Recipe } from '../../soma/core/recipes';

/** A small set of household areas that can hold a monthly plan. */
export type BudgetCategory = 'housing' | 'utilities' | 'transport' | 'food' | 'health' | 'subscriptions' | 'debt' | 'savings' | 'personal' | 'other';

export const budgetCategories: { id: BudgetCategory; label: string }[] = [
  { id: 'housing', label: 'Home' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'transport', label: 'Transport' },
  { id: 'food', label: 'Food' },
  { id: 'health', label: 'Health' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'debt', label: 'Debt' },
  { id: 'savings', label: 'Savings' },
  { id: 'personal', label: 'Personal' },
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
  /** Flexible monthly costs that do not come from a bill or planned recipe. */
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
};

export type BudgetItem = {
  id: string;
  name: string;
  amountCents: number;
  category: BudgetCategory;
};

export type BudgetTotals = {
  plannedCents: number;
  billCents: number;
  mealCents: number;
  itemCents: number;
  byCategory: Record<BudgetCategory, number>;
  mealsWithoutEstimate: number;
  otherCurrencyCount: number;
};

export type SpendingTotals = {
  spentCents: number;
  byCategory: Record<BudgetCategory, number>;
  count: number;
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
  return { id: month, month, currency, totalCents: 0, categoryLimits: emptyLimits(), items: [], createdAt: now, updatedAt: now };
}

/** Money stays as text during editing; convert once when saving. Blank means no limit. */
export function moneyInputCents(value: string): number | undefined {
  const text = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(/[.,]$/, '');
  if (!text) return 0;
  // Thousands written either way: "3,500.00" and "3.500,00"; the last mark with one or two digits after it is the decimal.
  const decimal = /[.,]\d{1,2}$/.test(text) ? text[text.search(/[.,]\d{1,2}$/)] : undefined;
  const whole = decimal ? text.slice(0, text.lastIndexOf(decimal)) : text;
  const cents = decimal ? text.slice(text.lastIndexOf(decimal) + 1) : '';
  // Groups use the other mark: commas with a decimal point (or none), points with a decimal comma. "1.234" stays unread.
  const group = decimal === ',' ? '.' : ',';
  const grouped = new RegExp(`^\\d{1,3}(?:\\${group}\\d{3})+$`);
  if (!/^\d+$/.test(whole) && !grouped.test(whole)) return undefined;
  const amount = Math.round(Number(`${whole.split(group).join('')}.${cents || '0'}`) * 100);
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
  const items = Array.isArray(input.items)
    ? (input.items as unknown[])
        .filter((item): item is Partial<BudgetItem> => Boolean(item && typeof item === 'object'))
        .filter((item) => typeof item.id === 'string' && typeof item.name === 'string' && item.name.trim().length > 0)
        .map((item) => ({
          id: item.id!,
          name: item.name!.trim(),
          amountCents: safeAmount(item.amountCents),
          category: budgetCategory(item.category),
        }))
    : [];
  return {
    ...newBudget(input.month, typeof input.currency === 'string' && /^[A-Z]{3}$/.test(input.currency) ? input.currency : 'USD', ''),
    totalCents: safeAmount(input.totalCents),
    categoryLimits: limits,
    items,
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
  if (/\b(debt|loan|credit card|student loan|interest)\b/.test(value)) return 'debt';
  if (/\b(savings?|save|emergency fund|retirement|ira|401k|investment)\b/.test(value)) return 'savings';
  if (/\b(personal|clothing|haircut|beauty|hobbies|gifts?|entertainment)\b/.test(value)) return 'personal';
  return 'other';
}

/** Projected costs for a month. This deliberately uses bills and planned meals, not bank data. */
export function budgetTotals(
  bills: readonly Bill[],
  recipes: readonly Recipe[],
  month: string,
  currency?: string,
  items: readonly BudgetItem[] = [],
): BudgetTotals {
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
  let itemCents = 0;
  for (const item of items) {
    const amount = Math.max(0, item.amountCents);
    itemCents += amount;
    byCategory[item.category] += amount;
  }
  return { plannedCents: billCents + mealCents + itemCents, billCents, mealCents, itemCents, byCategory, mealsWithoutEstimate, otherCurrencyCount };
}

/** Actual money out for a month, kept separate from the plan so the two can be compared plainly. */
export function spendingTotals(lines: readonly { amountCents: number; area: BudgetCategory }[]): SpendingTotals {
  const byCategory = emptyLimits();
  let spentCents = 0;
  for (const line of lines) {
    const amount = Math.max(0, line.amountCents);
    spentCents += amount;
    const area = line.area && byCategory[line.area] !== undefined ? line.area : 'other';
    byCategory[area] += amount;
  }
  return { spentCents, byCategory, count: lines.length };
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
