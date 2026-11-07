import type { LogEntry } from './log';

export type Shoe = {
  id: string;
  /** Runner-given label, e.g. "Pegasus 41". */
  name: string;
  /** Local date the runner began using this pair. */
  startedOn: string;
  /** Distance already on the pair before Askesis started tracking it. */
  startingMeters: number;
  /** Optional personal reminder threshold; not a prediction of when a shoe must be replaced. */
  targetMeters?: number;
  /** Retired pairs stay in history and keep their assigned workouts. */
  retiredOn?: string;
  /** At most one active pair is the default for new run logs. */
  isDefault?: boolean;
};

export function defaultShoe(shoes: readonly Shoe[]): Shoe | undefined {
  return shoes.find((shoe) => shoe.isDefault && !shoe.retiredOn);
}

export function shoeRunEntries(shoe: Shoe, entries: readonly LogEntry[]): LogEntry[] {
  return entries.filter((entry) => entry.activity === 'run' && entry.shoeId === shoe.id);
}

/** Starting mileage plus only the run distance explicitly assigned to this pair. */
export function shoeMileage(shoe: Shoe, entries: readonly LogEntry[]): number {
  return shoe.startingMeters + shoeRunEntries(shoe, entries).reduce((sum, entry) => sum + (entry.meters ?? 0), 0);
}

/** Undefined when the runner has not chosen a reminder threshold. */
export function shoeProgress(shoe: Shoe, entries: readonly LogEntry[]): number | undefined {
  if (!shoe.targetMeters || shoe.targetMeters <= 0) return undefined;
  return Math.min(1, shoeMileage(shoe, entries) / shoe.targetMeters);
}
