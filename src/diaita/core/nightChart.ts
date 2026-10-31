import { sleptMinutes, type SleepRecord } from './rhythm';

/**
 * Nights drawn from going to bed to getting up, as Apple Health's and Oura's sleep charts draw them, so how regular the
 * nights are shows at a glance. Every night is placed on one clock axis that starts at a whole hour chosen so that no
 * night crosses its edge: noon for most people, the evening for someone who sleeps by day after nights.
 */
export type NightSpan = { from: number; to: number };
export type NightAxis = { startHour: number; from: number; to: number };

const minutesOf = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Where a night sits on an axis starting at `startHour`, in minutes from the axis's start. */
export function placeNight(record: Pick<SleepRecord, 'bed' | 'up'>, startHour: number): NightSpan {
  const from = (minutesOf(record.bed) - startHour * 60 + 1440) % 1440;
  return { from, to: from + sleptMinutes(record) };
}

/** The axis that holds every night (and the planned night, when given) without one crossing its edge, as short as it can be. */
export function nightAxis(records: readonly Pick<SleepRecord, 'bed' | 'up'>[]): NightAxis | undefined {
  if (records.length === 0) return undefined;
  let best: (NightAxis & { length: number }) | undefined;
  // Noon first, then the hours around it, so an ordinary night keeps the familiar evening-to-morning axis.
  const order = Array.from({ length: 24 }, (_, step) => (12 + (step % 2 ? -1 : 1) * Math.ceil(step / 2) + 24) % 24);
  for (const startHour of order) {
    const spans = records.map((record) => placeNight(record, startHour));
    if (spans.some((span) => span.to > 1440)) continue;
    const from = Math.floor(Math.min(...spans.map((span) => span.from)) / 60) * 60;
    const to = Math.min(1440, Math.ceil(Math.max(...spans.map((span) => span.to)) / 60) * 60);
    if (!best || to - from < best.length) best = { startHour, from, to, length: to - from };
  }
  if (!best) return undefined;
  return { startHour: best.startHour, from: best.from, to: best.to };
}

/** The clock time of a point on the axis, as "HH:MM". */
export function clockAt(axis: Pick<NightAxis, 'startHour'>, minutes: number): string {
  const total = (axis.startHour * 60 + Math.round(minutes)) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** A whole hour on the axis as a short label ("10 PM", "22"), in the phone's own clock. */
export function hourLabel(axis: Pick<NightAxis, 'startHour'>, minutes: number): string {
  const [hours, mins] = clockAt(axis, minutes).split(':').map(Number);
  return new Date(2000, 0, 1, hours, mins).toLocaleTimeString(undefined, { hour: 'numeric', ...(mins ? { minute: '2-digit' } : {}) });
}
