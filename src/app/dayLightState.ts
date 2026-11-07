import { dayLight, type DayLight } from '../lamplight/daylight';

/*
 * Where the person is in their waking day, as worked out by `app/dayLight.ts`. Kept on the device for a few minutes
 * (`proairetosDayLight`, outside `proairetos.` so it is never synced or backed up), so an app opened a moment later
 * paints with the right light at once instead of changing after it starts.
 */
const KEY = 'proairetosDayLight';
const FRESH_MS = 15 * 60_000;

let position: number | undefined;

function cached(): number | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { p: number; at: number } | null;
    return saved && Date.now() - saved.at < FRESH_MS && saved.p >= 0 && saved.p <= 1 ? saved.p : undefined;
  } catch {
    return undefined;
  }
}

export function setDayPosition(next: number | undefined): boolean {
  if (next !== undefined) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ p: next, at: Date.now() }));
    } catch {
      // Storage refused (a private window): the light still follows the day while the page is open.
    }
  }
  if (next === position || (next !== undefined && position !== undefined && Math.abs(next - position) < 0.005)) return false;
  position = next;
  return true;
}

/** The lamp for now, or none when the day is not known yet. */
export function currentDayLight(): DayLight | undefined {
  if (position === undefined) position = cached();
  return position === undefined ? undefined : dayLight(position);
}
