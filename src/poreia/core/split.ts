import type { Money } from './model';

/*
 * Who paid what on a shared trip, as plain facts: each payment with a payer is shared evenly among the people it was
 * for (everyone on the trip unless chosen), and the fewest payments that would even it out. Payments without a payer,
 * or in a currency with no rate yet, are left out and said so.
 */

export type Paid = { amount: Money; paidBy?: string; for?: string[] };
export type Balance = { person: string; paid: number; share: number; net: number };
export type Transfer = { from: string; to: string; cents: number };

export function balances(payments: readonly Paid[], people: readonly string[], currency: string, rates: Record<string, number> = {}): { balances: Balance[]; leftOut: number } {
  const all = new Map(people.map((person) => [person, { person, paid: 0, share: 0, net: 0 }]));
  let leftOut = 0;
  for (const payment of payments) {
    const rate = payment.amount.currency === currency ? 1 : rates[payment.amount.currency];
    const among = (payment.for?.length ? payment.for : people).filter((person) => all.has(person));
    if (!payment.paidBy || !all.has(payment.paidBy) || !rate || !among.length) {
      leftOut += 1;
      continue;
    }
    const cents = Math.round(payment.amount.cents * rate);
    all.get(payment.paidBy)!.paid += cents;
    // Shared to the cent: the first people take any remainder, so the shares add up to the payment.
    const each = Math.floor(cents / among.length);
    among.forEach((person, index) => {
      all.get(person)!.share += each + (index < cents - each * among.length ? 1 : 0);
    });
  }
  const list = [...all.values()].map((balance) => ({ ...balance, net: balance.paid - balance.share }));
  return { balances: list, leftOut };
}

/** The fewest payments that even things out: the one owed most is paid first by the one who owes most. */
export function settleUp(list: readonly Balance[]): Transfer[] {
  const owed = list.filter((each) => each.net > 0).map((each) => ({ person: each.person, cents: each.net })).sort((a, b) => b.cents - a.cents);
  const owing = list.filter((each) => each.net < 0).map((each) => ({ person: each.person, cents: -each.net })).sort((a, b) => b.cents - a.cents);
  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < owing.length && j < owed.length) {
    const cents = Math.min(owing[i].cents, owed[j].cents);
    if (cents > 0) transfers.push({ from: owing[i].person, to: owed[j].person, cents });
    owing[i].cents -= cents;
    owed[j].cents -= cents;
    if (owing[i].cents === 0) i += 1;
    if (owed[j].cents === 0) j += 1;
  }
  return transfers;
}
