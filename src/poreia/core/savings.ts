export type SavingsCadence = 'weekly' | 'biweekly' | 'monthly';

export type TripSavingsPlan = {
  id: string;
  tripId: string;
  targetCents: number;
  currency: string;
  startDate: string;
  targetDate?: string;
  cadence: SavingsCadence;
  contributionCents: number;
  /** Used only while Oikonomia is not added; Oikonomia keeps the balance once linked. */
  savedCents: number;
  envelopeId?: string;
  createdAt: string;
  updatedAt: string;
};

const DAY = 86_400_000;

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

/** Number of contribution periods remaining, always at least one when a date is supplied. */
export function savingsPeriods(startDate: string, targetDate: string | undefined, cadence: SavingsCadence): number {
  if (!targetDate) return 1;
  const days = Math.max(0, Math.round((parseDate(targetDate).getTime() - parseDate(startDate).getTime()) / DAY));
  if (cadence === 'weekly') return Math.max(1, Math.ceil(days / 7));
  if (cadence === 'biweekly') return Math.max(1, Math.ceil(days / 14));
  return Math.max(1, Math.ceil(days / 30.4375));
}

export function savingsContribution(targetCents: number, savedCents: number, startDate: string, targetDate: string | undefined, cadence: SavingsCadence): number {
  return Math.max(0, Math.ceil(Math.max(0, targetCents - savedCents) / savingsPeriods(startDate, targetDate, cadence)));
}

/** Oikonomia's budget is monthly, so convert other cadences without losing cents. */
export function monthlyContribution(contributionCents: number, cadence: SavingsCadence): number {
  if (cadence === 'weekly') return Math.round(contributionCents * 52 / 12);
  if (cadence === 'biweekly') return Math.round(contributionCents * 26 / 12);
  return contributionCents;
}
