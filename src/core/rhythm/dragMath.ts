/**
 * The arithmetic of moving and resizing an entry in the week: a pull of so many pixels becomes a
 * whole number of 15-minute steps, a move keeps the length, and a resize never leaves less than one step.
 */
export const STEP_MINUTES = 15;

/** Pixels pulled, as minutes, snapped to the step. */
export function snapMinutes(pixels: number, hourPx: number, step = STEP_MINUTES): number {
  return Math.round(((pixels / hourPx) * 60) / step) * step;
}

/** A start moved by some minutes, and optionally onto another local day (keeping the time of day it lands on). */
export function shiftedStart(startIso: string, minutes: number, onDay?: string): string {
  const moved = new Date(new Date(startIso).getTime() + minutes * 60_000);
  if (onDay) {
    const [year, month, day] = onDay.split('-').map(Number);
    moved.setFullYear(year, month - 1, day);
  }
  return moved.toISOString();
}

/** An end moved by some minutes: never earlier than one step after the start. `endIso` absent uses the planned length. */
export function resizedEnd(startIso: string, endIso: string | undefined, plannedMinutes: number | undefined, minutes: number, step = STEP_MINUTES): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + (plannedMinutes ?? 30) * 60_000;
  return new Date(Math.max(start + step * 60_000, end + minutes * 60_000)).toISOString();
}

/** The same item's current length in minutes, for showing while resizing. */
export function lengthMinutes(startIso: string, endIso: string | undefined, plannedMinutes: number | undefined): number {
  const start = new Date(startIso).getTime();
  return Math.round(((endIso ? new Date(endIso).getTime() : start + (plannedMinutes ?? 30) * 60_000) - start) / 60_000);
}
