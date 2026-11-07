import type { CompassStatement } from '../compass/types';
import type { Decision } from '../decisions/types';
import { toLocalDate } from '../scheduling/dates';
import type { ChosenValue } from '../values/types';
import type { Reflection } from './types';

/**
 * Looking back, from what the person wrote. Plain memory: the words of an earlier day, and a year's
 * entries gathered in their own order. Nothing is scored, compared or explained.
 */
export type EarlierDay = { reflection: Reflection; yearsAgo: number };

const writtenOn = (reflection: Reflection) => toLocalDate(new Date(reflection.createdAt));

/** What was written on this day (same month and day) in earlier years, the nearest year first. */
export function onThisDay(reflections: readonly Reflection[], today: string, limit = 3): EarlierDay[] {
  const [year, month, day] = today.split('-').map(Number);
  return reflections
    .filter((reflection) => reflection.kind !== 'INTENTION' && reflection.body.trim().length > 0)
    .map((reflection) => ({ reflection, written: writtenOn(reflection).split('-').map(Number) }))
    .filter(({ written }) => written[1] === month && written[2] === day && written[0] < year)
    .map(({ reflection, written }) => ({ reflection, yearsAgo: year - written[0] }))
    .sort((a, b) => a.yearsAgo - b.yearsAgo || b.reflection.createdAt.localeCompare(a.reflection.createdAt))
    .slice(0, limit);
}

export type YearInWords = {
  year: number;
  /** Lines the person wrote under "I'm grateful for". */
  grateful: { day: string; text: string }[];
  /** Lines the person wrote under "Three good things". */
  goodThings: { day: string; text: string }[];
  /** Journal and other reflections, their own words. */
  reflections: { day: string; text: string }[];
  decisions: { day: string; question: string; choice: string }[];
  goalsReached: { day: string; text: string }[];
  valuesChosen: string[];
};

const inYear = (iso: string, year: number) => new Date(iso).getFullYear() === year;

/** Everything the person wrote or chose in one calendar year, oldest first. */
export function yearInWords(
  data: { reflections: readonly Reflection[]; decisions: readonly Decision[]; statements: readonly CompassStatement[]; values: readonly ChosenValue[] },
  year: number,
): YearInWords {
  const line = (reflection: Reflection) => ({ day: writtenOn(reflection), text: reflection.body.trim() });
  const mine = data.reflections
    .filter((reflection) => inYear(reflection.createdAt, year) && reflection.body.trim() && reflection.kind !== 'INTENTION')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    year,
    grateful: mine.filter((r) => r.promptKey === 'gratitude').map(line),
    goodThings: mine.filter((r) => r.promptKey === 'three-good-things').map(line),
    reflections: mine.filter((r) => r.promptKey !== 'gratitude' && r.promptKey !== 'three-good-things').map(line),
    decisions: data.decisions
      .filter((decision) => inYear(decision.decidedAt, year))
      .sort((a, b) => a.decidedAt.localeCompare(b.decidedAt))
      .map((decision) => ({ day: toLocalDate(new Date(decision.decidedAt)), question: decision.question, choice: decision.choice })),
    goalsReached: data.statements
      .filter((statement) => statement.type === 'GOAL' && statement.reachedAt && inYear(statement.reachedAt, year))
      .sort((a, b) => (a.reachedAt ?? '').localeCompare(b.reachedAt ?? ''))
      .map((statement) => ({ day: toLocalDate(new Date(statement.reachedAt as string)), text: statement.body })),
    valuesChosen: data.values.filter((value) => inYear(value.chosenAt, year)).map((value) => value.name),
  };
}

/** The years that have something written, newest first. */
export function yearsWithWords(reflections: readonly Reflection[]): number[] {
  return [...new Set(reflections.filter((r) => r.body.trim()).map((r) => new Date(r.createdAt).getFullYear()))].sort((a, b) => b - a);
}

export const yearIsEmpty = (year: YearInWords) =>
  !year.grateful.length && !year.goodThings.length && !year.reflections.length && !year.decisions.length && !year.goalsReached.length && !year.valuesChosen.length;
