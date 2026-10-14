import { addDays, atTime, toLocalDate } from '../../core/scheduling/dates';
import { sleepWeekFacts, type SleepRecord } from './rhythm';

export type ExperimentKind = 'wake-time' | 'caffeine' | 'morning-light';

export type SleepExperiment = { kind: ExperimentKind; startedOn: string; endsOn: string };

export const EXPERIMENTS: readonly { kind: ExperimentKind; label: string; detail: string; source: string }[] = [
  { kind: 'wake-time', label: 'A fixed wake time', detail: 'Keep one wake time for two weeks.', source: 'Phillips AJK et al. Sci Rep 2017;7:3216.' },
  { kind: 'caffeine', label: 'No caffeine after your cutoff', detail: 'Use the cutoff already in your Diaita plan.', source: 'Drake C et al. J Clin Sleep Med 2013;9(11):1195–1200.' },
  { kind: 'morning-light', label: 'Morning daylight', detail: 'Go outside on waking when your schedule allows.', source: 'Smith MR, Fogg LF, Eastman CI. Sleep 2009;32(11):1481–1489.' },
];

export type SleepGroup = { label: string; nights: number; averageMinutes: number };

export type ContextDates = { label: string; dates: readonly string[] };

function group(label: string, records: readonly SleepRecord[]): SleepGroup | undefined {
  if (!records.length) return undefined;
  const minutes = records.reduce((sum, record) => {
    const [bedHour, bedMinute] = record.bed.split(':').map(Number);
    const [upHour, upMinute] = record.up.split(':').map(Number);
    let value = upHour * 60 + upMinute - (bedHour * 60 + bedMinute);
    if (value <= 0) value += 24 * 60;
    return sum + value;
  }, 0);
  return { label, nights: records.length, averageMinutes: Math.round(minutes / records.length) };
}

/** Groups the person's own nights by a recorded event from another app. */
export function sideBySide(records: readonly SleepRecord[], markedDates: readonly string[], label: string): SleepGroup[] {
  const marked = new Set(markedDates);
  return [group(label, records.filter((record) => marked.has(record.date))), group('Other recorded nights', records.filter((record) => !marked.has(record.date)))].filter((each): each is SleepGroup => Boolean(each));
}

/** Caffeine entries after the cutoff before each recorded sleep, grouped by the day woken into. */
export function caffeineAfterCutoffDates(records: readonly SleepRecord[], drinks: readonly { loggedAt: string; caffeineMg?: number; kind?: string }[], cutoffHours: number): string[] {
  const caffeinated = drinks.filter((drink) => (drink.caffeineMg ?? 0) > 0 || drink.kind === 'coffee' || drink.kind === 'tea');
  return records.filter((record) => {
    const bedDate = Number(record.bed.slice(0, 2)) < 12 ? addDays(record.date, -1) : record.date;
    const cutoff = new Date(atTime(bedDate, record.bed).getTime() - cutoffHours * 3_600_000);
    return caffeinated.some((drink) => {
      const at = new Date(drink.loggedAt);
      return toLocalDate(at) === toLocalDate(cutoff) && at > cutoff;
    });
  }).map((record) => record.date);
}

export function experimentFacts(records: readonly SleepRecord[], experiment: SleepExperiment, today: string) {
  const beforeFrom = addDays(experiment.startedOn, -14);
  const beforeTo = addDays(experiment.startedOn, -1);
  const current = records.filter((record) => record.date >= experiment.startedOn && record.date <= experiment.endsOn);
  const before = records.filter((record) => record.date >= beforeFrom && record.date <= beforeTo);
  const currentWeek = sleepWeekFacts(current, 0);
  const beforeWeek = sleepWeekFacts(before, 0);
  return {
    current: currentWeek ? { nights: currentWeek.nights, averageMinutes: Math.round(currentWeek.totalMinutes / currentWeek.nights) } : undefined,
    before: beforeWeek ? { nights: beforeWeek.nights, averageMinutes: Math.round(beforeWeek.totalMinutes / beforeWeek.nights) } : undefined,
    complete: today >= experiment.endsOn,
  };
}

export function suggestionFor(records: readonly SleepRecord[], chosenHours: number, today: string) {
  const facts = sleepWeekFacts(records.filter((record) => record.date > addDays(today, -7)), chosenHours);
  if (facts && facts.bedSpreadMinutes > 90) {
    return {
      id: 'regularity',
      title: 'A steadier wake time is the usual first step',
      body: `Your recorded bedtimes varied by ${facts.bedSpreadMinutes} minutes this week.`,
      source: 'Phillips AJK et al. Sci Rep 2017;7:3216.',
    };
  }
  // A little more than three 30-day months keeps the prompt tied to three calendar months around DST and month ends.
  const recent = records.filter((record) => record.date >= addDays(today, -120));
  const poorMonths = new Set(recent.filter((record) => record.how === 'poorly').map((record) => record.date.slice(0, 7)));
  if (recent.some((record) => record.snoring || record.gasping)) {
    return {
      id: 'doctor-symptoms',
      title: 'Consider talking with a doctor about your sleep',
      body: 'You marked loud snoring or waking gasping in your log. A doctor can help you decide what to check.',
      source: 'Kapur VK et al. Clinical practice guideline for diagnostic testing for adult obstructive sleep apnea. J Clin Sleep Med 2017;13(3):479–504.',
    };
  }
  if (poorMonths.size >= 3) {
    return {
      id: 'doctor-duration',
      title: 'Consider talking with a doctor about your sleep',
      body: 'Poor sleep is marked across three months of your log. A doctor can help you decide what to check.',
      source: 'Qaseem A et al. Management of chronic insomnia disorder in adults. Ann Intern Med 2016;165(2):125–133.',
    };
  }
  return undefined;
}
