import { dayLight, type DayLight } from '../lamplight/daylight';

/** Where the person is in their waking day, as worked out by `app/dayLight.ts` (Proairetos only); none until then. */
let position: number | undefined;

export function setDayPosition(next: number | undefined): boolean {
  if (next === position || (next !== undefined && position !== undefined && Math.abs(next - position) < 0.005)) return false;
  position = next;
  return true;
}

/** The lamp for now, or none when the day is not known yet. */
export function currentDayLight(): DayLight | undefined {
  return position === undefined ? undefined : dayLight(position);
}
