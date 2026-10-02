/** Units, durations and pace: plain arithmetic on what the person typed. */
export type Unit = 'mi' | 'km';

export const METERS: Record<Unit, number> = { mi: 1609.344, km: 1000 };

/** "26:14", "1:02:03", "26" (minutes) or "26.5" into seconds; undefined when it cannot be read. */
export function parseDuration(text: string): number | undefined {
  const clean = text.trim();
  if (!clean) return undefined;
  if (/^\d+([.,]\d+)?$/.test(clean)) {
    const minutes = Number(clean.replace(',', '.'));
    return minutes > 0 ? Math.round(minutes * 60) : undefined;
  }
  if (!/^\d+(:\d{1,2}){1,2}$/.test(clean)) return undefined;
  const parts = clean.split(':').map(Number);
  if (parts.slice(1).some((part) => part >= 60)) return undefined;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 ? seconds : undefined;
}

export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** "2 h 18 min", "48 min", for totals. */
export function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function parseDistance(text: string, unit: Unit): number | undefined {
  const value = Number(text.trim().replace(',', '.'));
  if (!text.trim() || !Number.isFinite(value) || value <= 0 || value > 500) return undefined;
  return value * METERS[unit];
}

export function inUnit(meters: number, unit: Unit): number {
  return meters / METERS[unit];
}

export function formatDistance(meters: number, unit: Unit): string {
  const value = inUnit(meters, unit);
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

/** Seconds per mile or kilometre. */
export function paceOf(seconds: number, meters: number, unit: Unit): number | undefined {
  if (!(seconds > 0) || !(meters > 0)) return undefined;
  return seconds / inUnit(meters, unit);
}

export function formatPace(secondsPerUnit: number, unit: Unit): string {
  const whole = Math.round(secondsPerUnit);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')} /${unit}`;
}

/** Time for a distance at a pace. */
export function timeFor(secondsPerUnit: number, meters: number, unit: Unit): number {
  return secondsPerUnit * inUnit(meters, unit);
}

/** Common race distances, for the pace calculator. */
export const raceDistances: { name: string; meters: number }[] = [
  { name: '5K', meters: 5000 },
  { name: '10K', meters: 10000 },
  { name: 'Half marathon', meters: 21097.5 },
  { name: 'Marathon', meters: 42195 },
];
