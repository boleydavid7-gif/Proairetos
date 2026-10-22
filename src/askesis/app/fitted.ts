import { fittedWeek, useFittedWeek } from '../../app/family/trainingWeek';
import type { PlanState } from '../data/store';

/** Run days placed around work and strength training, when the runner chose "Around my week". */
export function useRunsPlaced(today: string, planState: PlanState | undefined, logged: number): Readonly<Record<string, string>> | undefined {
  const fit = useFittedWeek(today, [planState, logged]);
  return planState?.fit ? fit?.runs : undefined;
}

/** The same, read once from what this device last worked out. */
export function runsPlaced(state: Pick<PlanState, 'fit'> | undefined, date: string): Readonly<Record<string, string>> | undefined {
  return state?.fit ? fittedWeek(date)?.runs : undefined;
}
