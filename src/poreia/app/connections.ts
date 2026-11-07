import { settings as phytonSettings } from '../../phyton/app/state';
import { allMedicines } from '../../therapeia/app/state';
import { dosesBetween, isCurrent, withWho } from '../../therapeia/core/medicines';
import { saveSpent, spentIn } from '../../oikonomia/data/spent';
import { loadSettings as oikonomiaSettings } from '../../oikonomia/data/store';
import type { BudgetCategory } from '../../oikonomia/core/budget';
import type { Spend, SpendCategory, Trip } from '../core/model';

/*
 * Poreia with the other apps, each only when it is added and only when the person asks: Phyton's away dates for the
 * trip, Therapeia's medicines with the doses the days take, and the trip's spending in Oikonomia's Spent. Loaded only
 * when a trip page asks, so Poreia's own first load carries none of their code.
 */

// ---------- Phyton ----------

export function plantsAway(trip: Trip): 'same' | 'other' | 'none' {
  const away = phytonSettings.load().away;
  if (!away) return 'none';
  return away.from === trip.start && away.to === (trip.end ?? trip.start) ? 'same' : 'other';
}

/** Sets Phyton's away dates to the trip's; gives back an undo. */
export function setPlantsAway(trip: Trip): () => void {
  const before = phytonSettings.load();
  phytonSettings.save({ ...before, away: { from: trip.start!, to: trip.end ?? trip.start! } });
  return () => phytonSettings.save(before);
}

// ---------- Therapeia ----------

/** Each medicine taken at set times on the trip's days, with how many doses they come to (as-needed ones by name). */
export function medicinesFor(trip: Trip): { name: string; doses?: number }[] {
  if (!trip.start) return [];
  const until = trip.end ?? trip.start;
  const current = allMedicines().filter((medicine) => isCurrent(medicine, trip.start!) || isCurrent(medicine, until));
  const doses = dosesBetween(current, trip.start, until);
  return current.map((medicine) => {
    const count = doses.filter((dose) => dose.medicine.id === medicine.id).length;
    return { name: withWho(medicine, [medicine.name, medicine.dose].filter(Boolean).join(' ')), doses: count || undefined };
  });
}

// ---------- Oikonomia ----------

const AREA: Record<SpendCategory, BudgetCategory> = { travel: 'transport', stay: 'personal', food: 'food', doing: 'personal', shopping: 'personal', other: 'other' };

export const oikonomiaCurrency = () => oikonomiaSettings().currency;

/** How many of the trip's spends Oikonomia's Spent does not have yet. */
export function notInOikonomia(spends: readonly Spend[]): Spend[] {
  const kept = new Set(spends.map((spend) => spend.date.slice(0, 7)).flatMap((month) => spentIn(month).map((line) => line.id)));
  return spends.filter((spend) => !kept.has(`poreia-${spend.id}`));
}

/** Adds the trip's spends to Oikonomia's Spent for their months, in its currency; gives back an undo. */
export async function sendToOikonomia(trip: Trip, spends: readonly Spend[]): Promise<{ sent: number; undo: () => void }> {
  const currency = oikonomiaCurrency();
  const months = new Map<string, ReturnType<typeof spentIn>>();
  let sent = 0;
  for (const spend of notInOikonomia(spends)) {
    if (spend.amount.currency !== currency) continue;
    const month = spend.date.slice(0, 7);
    if (!months.has(month)) months.set(month, spentIn(month));
    const lines = months.get(month)!;
    lines.push({ id: `poreia-${spend.id}`, date: spend.date, description: `${spend.what} · ${trip.name}`, amountCents: spend.amount.cents, area: AREA[spend.category] });
    sent += 1;
  }
  const before = new Map([...months.keys()].map((month) => [month, spentIn(month)]));
  for (const [month, lines] of months) saveSpent(month, lines);
  return { sent, undo: () => before.forEach((lines, month) => saveSpent(month, lines)) };
}
