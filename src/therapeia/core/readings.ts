import { addDays, toLocalDate } from '../../core/scheduling/dates';

/*
 * Readings the person takes (blood pressure, blood sugar, weight...), kept as they were written, with plain facts
 * beside them: the latest, and the lowest, highest and average of the last 30 days. No ranges, targets or verdicts;
 * what a reading means is for the person and whoever looks after their health.
 */

export type ReadingKind = 'blood-pressure' | 'blood-sugar' | 'weight' | 'temperature' | 'heart-rate' | 'oxygen' | 'other';

export type Reading = {
  id: string;
  kind: ReadingKind;
  /** For 'other': its name ("Peak flow"). */
  label?: string;
  value: number;
  /** The second number of a blood pressure (diastolic). */
  value2?: number;
  unit: string;
  at: string;
  note?: string;
};

export const KINDS: { id: ReadingKind; name: string; units: string[] }[] = [
  { id: 'blood-pressure', name: 'Blood pressure', units: ['mmHg'] },
  { id: 'blood-sugar', name: 'Blood sugar', units: ['mmol/L', 'mg/dL'] },
  { id: 'weight', name: 'Weight', units: ['kg', 'lb'] },
  { id: 'temperature', name: 'Temperature', units: ['°C', '°F'] },
  { id: 'heart-rate', name: 'Heart rate', units: ['bpm'] },
  { id: 'oxygen', name: 'Oxygen', units: ['%'] },
  { id: 'other', name: 'Other', units: [''] },
];

export const kindName = (reading: Pick<Reading, 'kind' | 'label'>) => (reading.kind === 'other' ? reading.label || 'Other' : KINDS.find((each) => each.id === reading.kind)?.name ?? reading.kind);

/** Readings of the same thing go together: an 'other' reading by its own name. */
export const seriesKey = (reading: Pick<Reading, 'kind' | 'label'>) => (reading.kind === 'other' ? `other:${(reading.label ?? '').trim().toLowerCase()}` : reading.kind);

const round = (value: number) => Math.round(value * 10) / 10;

export function valueText(reading: Pick<Reading, 'value' | 'value2' | 'unit'>): string {
  const number = reading.value2 !== undefined ? `${round(reading.value)}/${round(reading.value2)}` : `${round(reading.value)}`;
  return reading.unit ? `${number} ${reading.unit}` : number;
}

export type Series = { key: string; name: string; latest: Reading; readings: Reading[] };

/** Every series, the one read most lately first, each newest first. */
export function series(readings: readonly Reading[]): Series[] {
  const groups = new Map<string, Reading[]>();
  for (const reading of readings) groups.set(seriesKey(reading), [...(groups.get(seriesKey(reading)) ?? []), reading]);
  return [...groups]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at));
      return { key, name: kindName(sorted[0]), latest: sorted[0], readings: sorted };
    })
    .sort((a, b) => b.latest.at.localeCompare(a.latest.at));
}

export type Facts = { count: number; lowest: string; highest: string; average: string };

/** The last 30 days of one series, in one unit, as facts. */
export function facts(list: readonly Reading[], today: string, days = 30): Facts | undefined {
  const from = addDays(today, -(days - 1));
  const unit = list[0]?.unit;
  const recent = list.filter((reading) => reading.unit === unit && toLocalDate(new Date(reading.at)) >= from);
  if (recent.length < 2) return undefined;
  const pick = (reading: Reading) => reading.value;
  const sorted = [...recent].sort((a, b) => pick(a) - pick(b));
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const average = {
    value: mean(recent.map((reading) => reading.value)),
    value2: recent.every((reading) => reading.value2 !== undefined) ? mean(recent.map((reading) => reading.value2!)) : undefined,
    unit: unit ?? '',
  };
  return { count: recent.length, lowest: valueText(sorted[0]), highest: valueText(sorted[sorted.length - 1]), average: valueText({ ...average, value: Math.round(average.value), value2: average.value2 === undefined ? undefined : Math.round(average.value2) }) };
}

/** The latest of each, as lines for the shared list. */
export function latestLines(readings: readonly Reading[]): string[] {
  return series(readings).map((each) => `${each.name}: ${valueText(each.latest)} (${new Date(each.latest.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})`);
}
