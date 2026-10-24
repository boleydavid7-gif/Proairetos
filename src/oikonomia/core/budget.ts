import { monthBounds, occurrencesBetween, type Bill } from './bills';
import type { Recipe } from '../../soma/core/recipes';
import { readAmount } from '../../core/money/readAmount';
import { addDays, daysBetween, parseLocalDate } from '../../core/scheduling/dates';

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

export type FoodWeekSummary = {
  from: string;
  until: string;
  actualCents: number;
  actualCount: number;
  plannedCents: number;
  mealsWithoutEstimate: number;
  /** A seven-day projection from the food spent so far this week. */
  paceCents: number;
  /** Average food spending in completed weeks with at least one food expense. */
  typicalCents?: number;
  typicalWeeks: number;
};

/** The start of the plan week containing a local calendar date. */
export function foodWeekStart(date: string, weekStart = 1): string {
  const weekday = parseLocalDate(date).getDay();
  return addDays(date, -((weekday - weekStart + 7) % 7));
}

export function foodWeekBounds(date: string, weekStart = 1): { from: string; until: string } {
  const from = foodWeekStart(date, weekStart);
  return { from, until: addDays(from, 6) };
}

/**
 * Compares paid food expenses with this week's planned recipe estimates.
 * Planned costs remain separate from actual spending; they are an estimate, not a second charge.
 */
export function foodWeekSummary(
  spent: readonly { date: string; amountCents: number; area: BudgetCategory }[],
  recipes: readonly Recipe[],
  date: string,
  weekStart = 1,
  currency?: string,
): FoodWeekSummary {
  const { from, until } = foodWeekBounds(date, weekStart);
  const actualLines = spent.filter((line) => line.area === 'food' && line.date >= from && line.date <= until);
  const actualCents = actualLines.reduce((sum, line) => sum + Math.max(0, line.amountCents), 0);
  let plannedCents = 0;
  let mealsWithoutEstimate = 0;
  for (const recipe of recipes) {
    const days = (recipe.planned ?? []).filter((day) => day >= from && day <= until);
    if (!days.length) continue;
    if (recipe.estimatedCostCents === undefined || (currency && recipe.estimatedCostCurrency && recipe.estimatedCostCurrency !== currency)) {
      mealsWithoutEstimate += days.length;
      continue;
    }
    plannedCents += days.length * Math.max(0, recipe.estimatedCostCents);
  }
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const elapsed = todayString < from ? 0 : todayString > until ? 7 : Math.max(1, daysBetween(from, todayString) + 1);
  const paceCents = elapsed ? Math.ceil((actualCents * 7) / elapsed) : 0;
  const previous = new Map<string, number>();
  for (const line of spent) {
    if (line.area !== 'food' || line.date >= from) continue;
    const key = foodWeekStart(line.date, weekStart);
    previous.set(key, (previous.get(key) ?? 0) + Math.max(0, line.amountCents));
  }
  const previousWeeks = [...previous.entries()].filter(([key]) => key < from).map(([, cents]) => cents).filter((cents) => cents > 0);
  const typicalCents = previousWeeks.length ? Math.round(previousWeeks.reduce((sum, cents) => sum + cents, 0) / previousWeeks.length) : undefined;
  return { from, until, actualCents, actualCount: actualLines.length, plannedCents, mealsWithoutEstimate, paceCents, typicalCents, typicalWeeks: previousWeeks.length };
}

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
  const amount = readAmount(value);
  return amount === null ? 0 : amount;
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
