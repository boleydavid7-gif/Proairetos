import type { Thing } from './things';

/*
 * The list an insurer asks for after a fire or a burglary: what was in each room, with make, model, serial, when it
 * was bought and what it cost. Prices are kept as the person wrote them; here they are read as numbers to add up,
 * one total per currency mark, and anything without a price is said plainly.
 */

export type Money = { amount: number; mark: string };

const MARKS = ['US$', 'CA$', 'A$', 'NZ$', 'R$', '$', '£', '€', '¥', '₹', '₩', 'CHF', 'kr', 'zł', 'R'];

/** "$649", "£1,200.50", "1.200,50 €", "649" → an amount and its mark ('' when none was written). */
export function readPrice(price?: string): Money | undefined {
  if (!price?.trim()) return undefined;
  const text = price.trim();
  const mark = MARKS.find((each) => text.toUpperCase().includes(each.toUpperCase())) ?? '';
  const digits = text.replace(/[^\d.,]/g, '');
  if (!/\d/.test(digits)) return undefined;
  let number = digits;
  const lastComma = number.lastIndexOf(',');
  const lastDot = number.lastIndexOf('.');
  if (lastComma > lastDot) {
    // A comma last: decimals when two digits follow it ("12,50"), else thousands ("1,200").
    number = /,\d{1,2}$/.test(number) ? number.replace(/\./g, '').replace(',', '.') : number.replace(/,/g, '');
  } else if (lastDot > lastComma && lastComma >= 0) {
    number = number.replace(/,/g, '');
  } else if (lastDot >= 0 && /\.\d{3}$/.test(number) && number.split('.').length > 1 && !/\.\d{1,2}$/.test(number)) {
    // "1.200" with no comma: thousands.
    number = number.replace(/\./g, '');
  }
  const amount = Number(number);
  return Number.isFinite(amount) ? { amount, mark } : undefined;
}

/** Totals by currency mark, largest first; the count of things without a price beside them. */
export function totalOf(things: readonly Thing[]): { totals: Money[]; unpriced: number } {
  const sums = new Map<string, number>();
  let unpriced = 0;
  for (const thing of things) {
    const money = readPrice(thing.price);
    if (!money) unpriced += 1;
    else sums.set(money.mark, (sums.get(money.mark) ?? 0) + money.amount);
  }
  const totals = [...sums].map(([mark, amount]) => ({ mark, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount);
  return { totals, unpriced };
}

export function moneyText(money: Money): string {
  const amount = money.amount.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(money.amount) ? 0 : 2, maximumFractionDigits: 2 });
  if (!money.mark) return amount;
  return /^[A-Za-z]/.test(money.mark) ? `${amount} ${money.mark}` : `${money.mark}${amount}`;
}

export const NO_ROOM = 'No room set';

/** Things grouped by room (their place), rooms by name with the unplaced last; things by name. */
export function byRoom(things: readonly Thing[]): [string, Thing[]][] {
  const rooms = new Map<string, Thing[]>();
  for (const thing of things) {
    const room = thing.place?.trim() || NO_ROOM;
    const key = [...rooms.keys()].find((each) => each.toLowerCase() === room.toLowerCase()) ?? room;
    rooms.set(key, [...(rooms.get(key) ?? []), thing]);
  }
  return [...rooms]
    .map(([room, list]): [string, Thing[]] => [room, list.sort((a, b) => a.name.localeCompare(b.name))])
    .sort(([a], [b]) => (a === NO_ROOM ? 1 : b === NO_ROOM ? -1 : a.localeCompare(b)));
}

const cell = (value: unknown) => {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

/** The whole list as CSV for an insurer or a spreadsheet: room, thing, details, price as written and as a number. */
export function thingsCsv(things: readonly Thing[]): string {
  const header = ['Room', 'Thing', 'Category', 'Make', 'Model', 'Serial', 'Bought', 'Price', 'Amount', 'Store', 'Warranty or renewal', 'Note'];
  const rows = byRoom(things).flatMap(([room, list]) =>
    list.map((thing) =>
      [room === NO_ROOM ? '' : room, thing.name, thing.category, thing.make, thing.model, thing.serial, thing.boughtOn, thing.price, readPrice(thing.price)?.amount, thing.store, thing.warrantyUntil, thing.note]
        .map(cell)
        .join(','),
    ),
  );
  return [header.map(cell).join(','), ...rows].join('\r\n') + '\r\n';
}
