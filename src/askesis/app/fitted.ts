import { fittedWeek, useFittedWeek } from '../../app/family/trainingWeek';
import type { PlanState } from '../data/store';

/** Run days placed around work and strength training, when the runner chose "Around my week". */
export function useRunsPlaced(today: string, planState: PlanState | undefined, logged: number): Readonly<Record<string, string>> | undefined {
  const fit = useFittedWeek(today, [planState, logged]);
  return placedFor(planState, fit?.runs);
}

/** The same, read once from what this device last worked out. */
export function runsPlaced(state: Pick<PlanState, 'fit'> | undefined, date: string): Readonly<Record<string, string>> | undefined {
  return placedFor(state, fittedWeek(date)?.runs);
}

/** With "Around my week" every placed day counts; on set days only once a session in the week was moved. */
function placedFor(state: Pick<PlanState, 'fit'> | undefined, runs: Readonly<Record<string, string>> | undefined) {
  if (state?.fit) return runs;
  return runs && Object.keys(runs).length ? runs : undefined;
}
