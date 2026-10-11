import { comingUp, type Person } from '../../philia/core/people';
import { addDays, formatMoney, occurrencesBetween, paidForOccurrence, parseDate, type Bill } from '../../oikonomia/core/bills';

/**
 * Quiet facts from the other apps for Today, worked out from their own records. Only what was recorded:
 * a bill's date, what was drunk, the book being read. Nothing is scored, compared or advised.
 */
export type BillSoon = { id: string; name: string; date: string; when: string };

const DAY = 86_400_000;

/** Bills with a date from today through the next few days that have no payment recorded for that date. */
export function billsSoon(bills: readonly Bill[], today: string, days = 3): BillSoon[] {
  const last = addDays(today, days);
  return bills
    .flatMap((bill) => occurrencesBetween(bill, today, last).filter((occurrence) => !paidForOccurrence(bill, occurrence.date)))
    .map(({ bill, date }) => {
      const gap = Math.round((parseDate(date).getTime() - parseDate(today).getTime()) / DAY);
      return { id: bill.id, name: bill.name, date, when: gap === 0 ? 'today' : gap === 1 ? 'tomorrow' : `in ${gap} days` };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export type BillOnDay = { id: string; name: string; amount: string; paid: boolean };

/** The bills with a date on one day, for the calendar. Read only; paid ones are marked, not hidden. */
export function billsOn(bills: readonly Bill[], date: string): BillOnDay[] {
  return bills
    .flatMap((bill) => occurrencesBetween(bill, date, date).map((occurrence) => ({ bill, occurrence })))
    .map(({ bill, occurrence }) => ({
      id: bill.id,
      name: bill.name,
      amount: formatMoney(bill.amountCents, bill.currency),
      paid: Boolean(paidForOccurrence(bill, occurrence.date)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The unit HYDROS shows amounts in (its own setting, read only). */
function hydrosUnit(): 'oz' | 'ml' | 'L' {
  try {
    const unit = (JSON.parse(localStorage.getItem('hydros:settings') ?? '{}') as { unit?: unknown }).unit;
    return unit === 'ml' || unit === 'L' ? unit : 'oz';
  } catch {
    return 'oz';
  }
}

function volume(ounces: number, unit: 'oz' | 'ml' | 'L'): string {
  if (unit === 'ml') return `${Math.round(ounces * 29.5735)} ml`;
  if (unit === 'L') return `${(ounces / 33.814).toFixed(1)} L`;
  return `${Math.round(ounces)} oz`;
}

/**
 * While a work block is on: what was logged in HYDROS since it began, and when the last drink was. Nothing
 * when no work block is on.
 */
export function waterDuring(
  drinks: readonly { amountOz?: number; loggedAt?: string }[],
  blocks: readonly { kind: string; start: Date; end: Date }[],
  now: Date,
  unit = hydrosUnit(),
): { line: string } | undefined {
  const block = blocks.find((each) => each.kind === 'COMMITTED' && each.start <= now && now < each.end);
  if (!block) return undefined;
  const since = drinks.filter((drink) => drink.loggedAt && new Date(drink.loggedAt) >= block.start && new Date(drink.loggedAt) <= now);
  if (since.length === 0) return { line: 'Water: nothing logged since work began' };
  const total = since.reduce((sum, drink) => sum + (Number(drink.amountOz) || 0), 0);
  const last = since.map((drink) => drink.loggedAt!).sort().pop()!;
  const time = new Date(last).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { line: `Water: ${volume(total, unit)} since work began · last ${time}` };
}

/** Birthdays and dates from Philia that fall on a day (read only; each opens the person in Philia). */
export function birthdaysOn(people: readonly Person[], date: string): { id: string; name: string; href: string }[] {
  return comingUp(people, date, 0).map((entry) => ({
    id: entry.key,
    name: entry.label === 'Birthday' ? `${entry.person.name}’s birthday` : `${entry.person.name}: ${entry.label}`,
    href: `/philia/?open=${encodeURIComponent(`person:${entry.person.id}`)}`,
  }));
}
