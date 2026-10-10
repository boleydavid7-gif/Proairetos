import { parseCsv } from '../../core/import/readers';
import type { BudgetCategory } from './budget';

/**
 * Money that went out, from a bank or card statement (CSV), kept by month and area. Only what was spent is
 * kept: money in, balances and account numbers are left out. Each line is the person's to move to another
 * area; the app's first guess comes from words in the description and the person's own earlier moves.
 */
export type Spent = { id: string; date: string; description: string; amountCents: number; area: BudgetCategory };

const HEADS = {
  date: ['date', 'transaction date', 'posted date', 'posting date', 'booking date', 'value date', 'trans. date'],
  description: ['description', 'payee', 'merchant', 'name', 'details', 'memo', 'narrative', 'transaction description', 'reference'],
  amount: ['amount', 'transaction amount', 'value'],
  out: ['debit', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'out'],
  in: ['credit', 'deposit', 'deposits', 'money in', 'paid in', 'in'],
};

const find = (header: string[], names: string[]) => header.findIndex((cell) => names.includes(cell));

/** Reads an amount as cents: "1,234.56", "(12.00)", "-12.00", "12,50" (comma decimals). */
export function cents(text: string): number | undefined {
  let value = text.trim().replace(/[^\d.,()-]/g, '');
  if (!value) return undefined;
  const negative = /^\(.*\)$/.test(value) || value.startsWith('-') || value.endsWith('-');
  value = value.replace(/[()-]/g, '');
  if (/,\d{2}$/.test(value) && !/\.\d{2}$/.test(value)) value = value.replace(/\./g, '').replace(',', '.');
  else value = value.replace(/,/g, '');
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.round(number * 100) * (negative ? -1 : 1);
}

/** Dates as statements write them; day-first or month-first is decided from the whole column. */
function dateReader(samples: string[]): (text: string) => string | undefined {
  const slashed = samples.map((text) => text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)).filter(Boolean) as RegExpMatchArray[];
  const dayFirst = slashed.some((match) => Number(match[1]) > 12) || (!slashed.some((match) => Number(match[2]) > 12) && !(globalThis.navigator?.language ?? 'en-US').startsWith('en-US'));
  return (text) => {
    const trimmed = text.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const match = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!match) {
      const parsed = Date.parse(trimmed);
      if (Number.isNaN(parsed)) return undefined;
      const date = new Date(parsed);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    const [day, month] = dayFirst ? [match[1], match[2]] : [match[2], match[1]];
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    if (Number(month) > 12 || Number(day) > 31) return undefined;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };
}

/** The money that went out in a statement; undefined when the file does not look like one. */
export function readStatement(text: string): Omit<Spent, 'id' | 'area'>[] | undefined {
  const rows = parseCsv(text.replace(/^﻿/, '')).filter((row) => row.some((cell) => cell.trim()));
  // Some banks put a few lines of account details above the table: start at the first row with a date heading.
  const start = rows.findIndex((row) => row.some((cell) => HEADS.date.includes(cell.trim().toLowerCase())));
  if (start < 0) return undefined;
  const header = rows[start].map((cell) => cell.trim().toLowerCase());
  const [date, description, amount, out, into] = [find(header, HEADS.date), find(header, HEADS.description), find(header, HEADS.amount), find(header, HEADS.out), find(header, HEADS.in)];
  if (date < 0 || (amount < 0 && out < 0)) return undefined;
  const body = rows.slice(start + 1);
  const readDate = dateReader(body.map((row) => row[date] ?? ''));
  // With one amount column, money out is whichever sign most lines have (most lines on a statement are spending).
  const signs = amount >= 0 ? body.map((row) => Math.sign(cents(row[amount] ?? '') ?? 0)) : [];
  const outIsNegative = signs.filter((sign) => sign < 0).length >= signs.filter((sign) => sign > 0).length;
  const spent: Omit<Spent, 'id' | 'area'>[] = [];
  for (const row of body) {
    const day = readDate(row[date] ?? '');
    if (!day) continue;
    let value: number | undefined;
    if (out >= 0 && (row[out] ?? '').trim()) value = Math.abs(cents(row[out]) ?? 0);
    else if (out >= 0 && into >= 0 && (row[into] ?? '').trim()) value = undefined;
    else if (amount >= 0) {
      const raw = cents(row[amount] ?? '');
      value = raw === undefined || raw === 0 ? undefined : outIsNegative ? (raw < 0 ? -raw : undefined) : raw > 0 ? raw : undefined;
    }
    if (!value) continue;
    const words = (description >= 0 ? row[description] : row.find((cell, index) => index !== date && index !== amount && /[a-z]/i.test(cell))) ?? '';
    spent.push({ date: day, description: words.replace(/\s+/g, ' ').trim().slice(0, 120) || 'Spent', amountCents: value });
  }
  return spent;
}

const AREA_WORDS: [BudgetCategory, RegExp][] = [
  ['housing', /\b(rent|mortgage|landlord|letting|property|hoa|council tax|home insurance|furniture|ikea|home depot|lowe'?s|b&q)\b/i],
  ['utilities', /\b(electric|electricity|power|energy|water|sewer|gas bill|utility|utilities|internet|broadband|comcast|xfinity|verizon|at&t|t-mobile|vodafone|bt group|phone bill|mobile)\b/i],
  ['transport', /\b(uber|lyft|taxi|cab|fuel|petrol|gasoline|shell|bp|exxon|chevron|esso|parking|toll|transit|metro|subway|train|rail|bus|airline|airways|car wash|auto|tfl)\b/i],
  ['subscriptions', /\b(netflix|spotify|hulu|disney|apple\.com|itunes|icloud|google storage|youtube|prime video|amazon prime|patreon|subscription|membership|adobe|microsoft 365|dropbox|audible)\b/i],
  ['health', /\b(pharmacy|chemist|cvs|walgreens|boots|clinic|doctor|dental|dentist|hospital|optician|medical|health|physio|therapy)\b/i],
  ['food', /\b(grocery|groceries|supermarket|market|whole foods|trader joe|safeway|kroger|aldi|lidl|tesco|sainsbury|walmart|costco|restaurant|cafe|café|coffee|starbucks|bakery|pizza|burger|doordash|uber eats|deliveroo|grubhub|just eat|takeaway|kitchen|diner|bar & grill)\b/i],
];

/** A merchant's words without numbers and card noise, so the same shop is recognised next time. */
export const merchantKey = (description: string) =>
  description.toLowerCase().replace(/\b(pos|card|purchase|debit|visa|mastercard|contactless|payment|ref|ach|dd|so)\b/g, '').replace(/[^a-z& ]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');

/** A first guess at the area: the person's own earlier move for this shop, else words in the description. */
export function guessArea(description: string, choices: Record<string, BudgetCategory> = {}): BudgetCategory {
  const remembered = choices[merchantKey(description)];
  if (remembered) return remembered;
  return AREA_WORDS.find(([, words]) => words.test(description))?.[0] ?? 'other';
}

/** New lines only: the same day, amount and description already kept is left out. */
export function newLines<T extends Pick<Spent, 'date' | 'amountCents' | 'description'>>(kept: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set(kept.map((line) => `${line.date}|${line.amountCents}|${line.description.toLowerCase()}`));
  return incoming.filter((line) => {
    const key = `${line.date}|${line.amountCents}|${line.description.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Totals by area, largest first, areas with nothing left out. */
export function byArea(lines: readonly Spent[]): { area: BudgetCategory; cents: number; count: number }[] {
  const totals = new Map<BudgetCategory, { cents: number; count: number }>();
  for (const line of lines) {
    const total = totals.get(line.area) ?? { cents: 0, count: 0 };
    totals.set(line.area, { cents: total.cents + line.amountCents, count: total.count + 1 });
  }
  return [...totals.entries()].map(([area, total]) => ({ area, ...total })).sort((a, b) => b.cents - a.cents);
}
