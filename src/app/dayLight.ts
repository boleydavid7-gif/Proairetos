import { addDays, toLocalDate } from '../core/scheduling/dates';
import { dayPosition, positionFromSleeps } from '../lamplight/daylight';
import { loadQuietHours } from '../data/storage/preferences';
import { isAdded } from './family/added';
import { otherCalendars } from './calendars/otherCalendars';
import { scheduleService } from './services';
import { setDayPosition } from './dayLightState';

/*
 * Day light in Proairetos: where the person is in their own waking day, so the lamp can follow it. The day runs from
 * the end of their last sleep to the start of the next, planned around their schedule as Diaita plans it (its settings
 * when Diaita is added, else a bedtime and length taken from quiet hours), so a night shift moves the morning. Worked out
 * on start, every five minutes, on coming back into view and when the schedule changes; the page is lit again only
 * when the position moves.
 */

const HOUR = 3_600_000;

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

async function positionNow(now: Date): Promise<number | undefined> {
  const quiet = loadQuietHours();
  const fallback = quiet.on ? dayPosition(now, quiet.end, quiet.start) : dayPosition(now, '07:00', '23:00');
  try {
    const { mainSleeps, defaultRhythm } = await import('../diaita/core/rhythm');
    let rhythm = { ...defaultRhythm };
    if (quiet.on) {
      let length = minutes(quiet.end) - minutes(quiet.start);
      if (length <= 0) length += 24 * 60;
      rhythm = { ...rhythm, bedtime: quiet.start, sleepHours: length / 60 };
    }
    if (isAdded('diaita')) {
      const { settings } = await import('../diaita/app/state');
      const diaita = settings.load();
      if (diaita.started) rhythm = { ...rhythm, ...diaita };
    }
    const from = new Date(now.getTime() - 48 * HOUR);
    const until = new Date(now.getTime() + 48 * HOUR);
    const blocks = [...(await scheduleService.occurrencesBetween(from, until)), ...otherCalendars.blocksBetween(from, until)].map((block) => ({
      start: block.start,
      end: block.end,
      kind: block.kind,
      label: block.label || block.patternName,
    }));
    const today = toLocalDate(now);
    return positionFromSleeps(now, mainSleeps(addDays(today, -1), addDays(today, 1), blocks, rhythm)) ?? fallback;
  } catch {
    return fallback;
  }
}

let started = false;

/** Starts following the day; `relight` lays the page's colors again (applyAppearance). */
export function startDayLight(relight: () => void): void {
  if (started) return;
  started = true;
  const run = () => {
    void positionNow(new Date()).then((next) => {
      if (setDayPosition(next)) relight();
    });
  };
  run();
  window.setInterval(run, 5 * 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });
  scheduleService.subscribe(run);
}
