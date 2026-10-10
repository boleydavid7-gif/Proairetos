import { daysBetween, mondayOnOrBefore } from '../../core/scheduling/dates';
import { flatten, set, step, totalMinutes, type Part, type Workout, type WorkoutKind } from './workouts';

/**
 * Training plans, built from what endurance research agrees on:
 *
 * - Most time easy. Well-trained endurance athletes spend roughly 80% of
 *   their training at low intensity and the rest hard (Seiler, 2010;
 *   Stöggl and Sperlich, 2014). Every week here keeps hard minutes at or
 *   under a fifth of the total.
 * - Gradual increases. Weekly time grows by under 10% from one building
 *   week to the next; large jumps in weekly running have been linked with
 *   more injuries in new runners (Nielsen et al., 2014).
 * - Single runs grow slowly. No run more than about 10% past the longest of
 *   the past four weeks (Frandsen et al., 2025); the long run stays within
 *   about 40% of the week (45% on three days) and two and a half hours.
 * - Two harder sessions a week at most, a long run with steady or race
 *   effort counting as one.
 * - Easier weeks. Every fourth week drops by about a fifth so the body
 *   absorbs the work (the common practice of loading and unloading).
 * - Threshold and interval sessions follow the classic forms: cruise
 *   intervals and tempo runs (Daniels), and 4 x 4 minutes hard with
 *   3 minutes easy (Helgerud et al., 2007).
 * - A taper. Before a race, volume falls by roughly 40-60% over about two
 *   weeks while a little intensity stays (Bosquet et al., 2007).
 *
 * Paths prescribe time and effort, never pace: that works without a GPS,
 * on any terrain, and for anyone.
 */
/**
 * One continuous path, toward an aim the person sets. Weeks are numbered
 * from the very first walk-run; someone already running joins further
 * along. The path only goes as far as the aim needs: an aim of 45 easy
 * minutes never meets marathon long runs or hard intervals.
 */
export type Aim =
  | { kind: 'time'; minutes: number }
  | { kind: 'distance'; meters: number }
  | { kind: 'steady' };

export type PathChoice = {
  aim: Aim;
  days: number;
  /** Slower growth: about 5% a week instead of about 7.5%, and the walk-run weeks with the bigger steps taken twice. */
  gentler?: boolean;
  /** Two weeks of walking before the first walk-run, for anyone who walks less than ten minutes at a time now. */
  walkFirst?: boolean;
  /** A race or event on this date: the path counts back to it. */
  raceDate?: string;
  /** Needed with a date: the week joined and today's date. */
  joinWeek?: number;
  today?: string;
};

export type Stage = 'Start' | 'Base' | 'Build' | 'Hold' | 'Shape' | 'Taper' | 'Your aim' | 'Keep going';

export type PlanWeek = {
  n: number;
  /** In the walk-run start: which of its ten steps this week is (0 for the walking weeks before it). */
  startIndex?: number;
  stage: Stage;
  theme: string;
  easier: boolean;
  workouts: Workout[];
};

export type Plan = {
  id: string;
  aim: Aim;
  days: number;
  weeks: PlanWeek[];
  /** Steady aims go round a four-week rhythm from this week on. */
  cycleFrom?: number;
  /** With a date: how the path fits it. */
  fit?: 'fits' | 'shortened' | 'held';
};

export const aimDistances: { name: string; meters: number; words: string }[] = [
  { name: '1 mile', meters: 1609.344, words: 'Run a mile' },
  { name: '5K', meters: 5000, words: 'Run a 5K' },
  { name: '5 miles', meters: 8046.72, words: 'Run 5 miles' },
  { name: '10K', meters: 10000, words: 'Run a 10K' },
  { name: '15K', meters: 15000, words: 'Run a 15K' },
  { name: '10 miles', meters: 16093.44, words: 'Run 10 miles' },
  { name: 'Half marathon', meters: 21097.5, words: 'Run a half marathon' },
  { name: 'Marathon', meters: 42195, words: 'Run a marathon' },
];

/** "Run 45 minutes without stopping", "Run a 10K", "Run 8 km", "Keep running, steadily". */
export function aimWords(aim: Aim, unit: 'mi' | 'km' = 'km'): string {
  if (aim.kind === 'steady') return 'Keep running, steadily';
  if (aim.kind === 'time') return `Run ${aim.minutes} minutes without stopping`;
  const known = aimDistances.find((each) => Math.abs(each.meters - aim.meters) < 5);
  if (known) return known.words;
  const value = unit === 'mi' ? aim.meters / 1609.344 : aim.meters / 1000;
  return `Run ${Number(value.toFixed(1))} ${unit}`;
}

/** Weekdays (0 = Monday) a plan uses until the person picks their own. */
export function defaultWeekdays(days: number): number[] {
  return (
    {
      3: [1, 3, 5],
      4: [0, 2, 4, 6],
      5: [0, 1, 3, 4, 6],
      6: [0, 1, 2, 3, 4, 6],
    } as Record<number, number[]>
  )[days] ?? [1, 3, 5];
}

// ---------- What each kind of session is for ----------

export const kindNotes: Record<WorkoutKind, { why: string; tips: string[] }> = {
  'walk-run': {
    why: 'Alternating running and walking lets your heart, muscles and tendons adapt together. The running grows a little each week until 30 minutes arrives without strain.',
    tips: [
      'Run slowly enough to talk. Slower than you think is fine.',
      'The walks are part of the plan.',
      'You can repeat any week.',
    ],
  },
  easy: {
    why: 'Easy running builds the base everything else rests on: a stronger heart, more capillaries and mitochondria in the muscles, with little strain. Most of your running looks like this.',
    tips: [
      'Keep a pace where you can hold a conversation.',
      'Slow down on hills to keep the effort the same.',
      'Walking for a minute is fine.',
    ],
  },
  strides: {
    why: 'Strides are short, quick, relaxed bursts. They practise good form and leg speed without the tiredness of a hard session.',
    tips: [
      'About 20 seconds each, building smoothly to quick, then easing off.',
      'Fast, never a sprint. Stay tall and relaxed.',
      'Walk or jog easy until you’ve recovered.',
    ],
  },
  long: {
    why: 'The long run is time on your feet: it builds endurance, teaches your body to use fat as fuel, and makes longer distances familiar.',
    tips: [
      'Start slower than feels necessary.',
      'Over about 90 minutes, take 30 to 60 g of carbohydrate an hour, and drink to thirst.',
      'Finishing feeling you could go on a little is right.',
    ],
  },
  tempo: {
    why: 'Running near your threshold, the effort you could hold for about an hour in a race, raises the pace you can sustain before tiring.',
    tips: [
      'Comfortably hard: a few words at a time.',
      'Even effort from first to last; the last one feels harder at the same effort.',
      'If you cannot speak at all, ease off a little.',
    ],
  },
  intervals: {
    why: 'Repeated hard efforts with easy recoveries let you spend more time near your maximum oxygen uptake (VO2 max) than one long hard run could. Four-minute efforts with three minutes easy are among the best-studied ways to raise it.',
    tips: [
      'Hard, and controlled: the last repeat about as strong as the first.',
      'Recoveries are easy jogging or walking.',
      'Warm up fully; these are the hardest minutes of the week.',
    ],
  },
  hills: {
    why: 'Short uphill efforts build strength and power with less pounding than fast running on the flat.',
    tips: [
      'Choose a moderate hill you can run up for 45 seconds.',
      'Drive with your arms, short quick steps, tall posture.',
      'Walk or jog back down slowly as the recovery.',
    ],
  },
  'race-pace': {
    why: 'Practising race effort inside a long run teaches pacing, and lets you rehearse fuelling, on tired legs.',
    tips: [
      'Race effort here is steady, not hard: it has to last.',
      'Try the drinks and gels you will use on the day.',
      'Ease the race-effort blocks back to easy if they start to feel hard.',
    ],
  },
  walk: {
    why: 'A brisk walk adds easy aerobic time without the impact of running, which helps the body adapt between runs.',
    tips: ['Brisk enough to warm up, easy enough to chat.', 'Any route, any shoes.'],
  },
  race: {
    why: 'The day you trained for.',
    tips: [
      'Start slower than feels right. The second half is where a race is decided.',
      'Nothing new on the day: the same shoes, breakfast and drinks you trained with.',
      'Warm up with a few strides.',
    ],
  },
};

type Draft = { kind: WorkoutKind; title: string; summary: string; parts: Part[] };

function finish(planId: string, week: number, index: number, draft: Draft): Workout {
  const notes = kindNotes[draft.kind];
  const parts = draft.kind === 'race' ? draft.parts : roundSession(draft.parts);
  return { id: `${planId}.w${week}.${index}`, ...draft, parts, why: notes.why, tips: notes.tips };
}

/**
 * Sessions add up to a round number of minutes (30, 35, 45): the last
 * stretch, usually the cool-down, gives or takes the odd minutes. It never
 * shrinks below three minutes; otherwise it grows to the next round number.
 */
export function roundSession(parts: Part[]): Part[] {
  const total = Math.round(totalMinutes(parts) * 60) / 60;
  const down = Math.floor(total / 5 + 1e-9) * 5;
  const up = Math.ceil(total / 5 - 1e-9) * 5;
  if (Math.abs(total - up) < 1e-6) return parts;
  const last = parts[parts.length - 1];
  const out = [...parts];
  if (!('repeat' in last)) {
    const shrunk = last.minutes - (total - down);
    out[out.length - 1] = { ...last, minutes: total - down <= 2 && shrunk >= 3 ? shrunk : last.minutes + (up - total) };
  } else {
    out.push(step('easy', up - total, 'Easy to finish'));
  }
  return out;
}

const round5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

// ---------- Beginner: walk-run to 30 minutes ----------

const walkRun = (run: number, walk: number, repeat: number): Part[] => [set(repeat, step('easy', run), step('walk', walk))];
const continuous = (run: number): Part[] => [step('easy', run)];

/**
 * [theme, three sessions], one per week. The three are close cousins: the
 * same amount of running, shaped a little differently, the third reaching a
 * touch further. Repeating a week is always fine.
 */
const beginnerWeeks: [string, Part[], Part[], Part[]][] = [
  ['Get comfortable moving', walkRun(1, 1.5, 8), walkRun(1, 1, 8), walkRun(1.5, 1.5, 6)],
  ['Build consistency', walkRun(1.5, 2, 6), walkRun(1.5, 1.5, 6), walkRun(2, 2, 5)],
  ['A little more running', walkRun(2, 2, 5), walkRun(2.5, 2, 4), walkRun(3, 2, 4)],
  ['A lighter week', walkRun(2, 2, 5), walkRun(2.5, 2, 4), walkRun(2, 1.5, 5)],
  ['Longer runs between walks', walkRun(3, 1.5, 4), walkRun(4, 2, 3), walkRun(5, 2.5, 3)],
  ['Five minutes and more', walkRun(5, 2, 3), walkRun(7, 2, 2), walkRun(8, 2, 2)],
  ['Ten minutes at a time', walkRun(8, 2, 2), walkRun(10, 2, 2), walkRun(12, 2, 2)],
  ['Your first long run', continuous(15), continuous(18), continuous(20)],
  ['Steady and easy', continuous(20), continuous(22), continuous(25)],
  ['30 minutes, your way', continuous(25), continuous(28), continuous(30)],
];

/** 1.5 -> "1½", 2 -> "2". */
const minutesWord = (minutes: number) => (Number.isInteger(minutes) ? String(minutes) : `${Math.floor(minutes) || ''}½`);

function describeWalkRun(parts: Part[]): string {
  const first = parts[0];
  if ('repeat' in first) {
    const [run, walk] = first.steps;
    return `${first.repeat} x run ${minutesWord(run.minutes)} min, walk ${minutesWord(walk.minutes)} min`;
  }
  return `Run ${first.minutes} minutes without stopping`;
}

/** Walk-run steps taken twice on a gentler path: the ones with the bigger jumps. */
const gentlerTwice = new Set([3, 5, 6, 7, 8]);

/** The walking weeks before the walk-run, when they are wanted: [theme, minutes of the three walks]. */
const walkingWeeks: [string, number[]][] = [
  ['Walking first', [10, 15, 15]],
  ['Walking a little further', [15, 20, 25]],
];

/**
 * The start of every path: walk-run to 30 minutes, in ten steps. Extra days
 * are brisk walks. Walking weeks can come first, and a gentler path takes the
 * bigger steps twice.
 */
function startWeeks(id: string, days: number, gentler = false, walkFirst = false): PlanWeek[] {
  const walk = (minutes: number): Draft => ({
    kind: 'walk',
    title: 'Brisk walk',
    summary: 'Easy aerobic time, no running',
    parts: [step('walk', minutes)],
  });
  const plan: { theme: string; startIndex: number; sessions: Draft[]; easier: boolean }[] = [];
  if (walkFirst)
    for (const [theme, minutes] of walkingWeeks) plan.push({ theme, startIndex: 0, easier: false, sessions: minutes.map(walk) });
  beginnerWeeks.forEach(([theme, a, b, c], index) => {
    const session = (parts: Part[]): Draft => ({
      kind: 'walk-run',
      title: parts.length === 1 && !('repeat' in parts[0]) ? 'Easy run' : 'Walk-run',
      summary: describeWalkRun(parts),
      parts: [step('walk', 5, 'Warm up'), ...parts, step('walk', 5, 'Cool down')],
    });
    const runs = [session(a), session(b), session(c)];
    const startIndex = index + 1;
    plan.push({ theme, startIndex, easier: startIndex === 4, sessions: runs });
    if (gentler && gentlerTwice.has(startIndex)) plan.push({ theme: `${theme}, once more`, startIndex, easier: false, sessions: runs });
  });
  return plan.map(({ theme, startIndex, easier, sessions }, index) => {
    const n = index + 1;
    const fill = (minutes: number) => walk(minutes);
    const drafts: Draft[] =
      startIndex === 0
        ? days >= 5
          ? [...sessions, fill(20), fill(15)].slice(0, Math.min(days, 5))
          : days === 4
            ? [sessions[0], sessions[1], fill(15), sessions[2]]
            : sessions
        : days >= 6
          ? [sessions[0], fill(30), sessions[1], fill(25), sessions[2], fill(35)]
          : days === 5
            ? [sessions[0], fill(30), sessions[1], fill(25), sessions[2]]
            : days === 4
              ? [sessions[0], sessions[1], fill(30), sessions[2]]
              : sessions;
    return { n, stage: 'Start' as Stage, startIndex, theme, easier, workouts: drafts.map((draft, i) => finish(id, n, i, draft)) };
  });
}

// ---------- Sessions for the longer plans ----------

const warm = (minutes: number) => step('easy', minutes, 'Warm up');
const cool = (minutes: number) => step('easy', minutes, 'Cool down');

function easyRun(minutes: number, kind: 'easy' | 'recovery' = 'easy'): Draft {
  const m = round5(minutes);
  return {
    kind: 'easy',
    title: kind === 'recovery' ? 'Recovery run' : 'Easy run',
    summary: kind === 'recovery' ? 'Very easy, short' : 'Conversational pace',
    parts: [step(kind, m)],
  };
}

function stridesRun(minutes: number, repeat = 6): Draft {
  const m = round5(minutes);
  return {
    kind: 'strides',
    title: 'Easy run with strides',
    summary: `${repeat} strides near the end`,
    parts: [step('easy', Math.max(10, m - repeat * 1.5)), set(repeat, step('stride', 1 / 3), step('walk', 1 + 1 / 6))],
  };
}

function hills(repeat: number, w: number): Draft {
  return {
    kind: 'hills',
    title: 'Hill repeats',
    summary: `${repeat} x 45 s uphill, easy back down`,
    parts: [warm(w), set(repeat, step('hard', 0.75, 'Uphill'), step('walk', 1.5, 'Easy back down')), cool(10)],
  };
}

/** "3x8": three 8-minute threshold efforts with 2 minutes easy; "25": one continuous block. */
function tempo(spec: string, w: number): Draft {
  const [count, length] = spec.includes('x') ? spec.split('x').map(Number) : [1, Number(spec)];
  const rest = length >= 15 ? 3 : 2;
  const block = count === 1 ? [step('tempo', length)] : [set(count, step('tempo', length), step('easy', rest))];
  return {
    kind: 'tempo',
    title: count === 1 ? 'Tempo run' : 'Threshold intervals',
    summary: count === 1 ? `${length} min comfortably hard` : `${count} x ${length} min comfortably hard`,
    parts: [warm(w), ...block, cool(10)],
  };
}

/** "5x3": five 3-minute hard efforts; recovery about as long as the effort, 3 min for 4-minute repeats. */
function intervals(spec: string, w: number): Draft {
  const [count, length] = spec.split('x').map(Number);
  const rest = length >= 4 ? 3 : 2;
  return {
    kind: 'intervals',
    title: 'Intervals',
    summary: `${count} x ${length} min hard, ${rest} min easy`,
    parts: [warm(w), set(count, step('hard', length), step('easy', rest)), cool(10)],
  };
}

function longRun(minutes: number, steadyFinish = 0, note?: string): Draft {
  const m = round5(minutes);
  return {
    kind: 'long',
    title: 'Long run',
    summary: steadyFinish ? `Easy, the last ${steadyFinish} min steady` : 'Easy, all the way',
    parts: steadyFinish ? [step('easy', m - steadyFinish), step('steady', steadyFinish, note)] : [step('easy', m)],
  };
}

function racePaceLong(minutes: number, repeat: number, length: number): Draft {
  const m = round5(minutes);
  const blocks = repeat * (length + 5);
  return {
    kind: 'race-pace',
    title: 'Long run with race effort',
    summary: `${repeat} x ${length} min at marathon effort`,
    parts: [
      step('easy', Math.max(20, m - blocks)),
      set(repeat, step('steady', length, 'Marathon effort'), step('easy', 5)),
    ],
  };
}

function aimDay(aim: Aim, warmUp: number): Draft {
  return {
    kind: 'race',
    title: aimWords(aim).replace(/^Run a /, 'Your ').replace(/^Run /, 'Your '),
    summary: 'A race, an event, or a run of your own: the day you trained for',
    parts: [warm(warmUp)],
  };
}

/** Fits the week's sessions to its time: a long run, the harder sessions, and easy running between. */
type LongPlan = { minutes: number; cap: number; make: (minutes: number) => Draft; race?: boolean };

/** Steps of five minutes around the middle, so plain easy runs in a week are never the same length. */
function offsets(count: number): number[] {
  return [[0], [5, -5], [5, 0, -5], [10, 5, -5, -10], [10, 5, 0, -5, -10]][Math.max(0, Math.min(5, count) - 1)];
}

function arrangeWeek(
  days: number,
  target: number,
  longPlan: LongPlan,
  quality: Draft[],
  extra: { strides: boolean; easyMin: number; easyMax: number; recovery: boolean },
): Draft[] {
  const easyCount = days - 1 - quality.length;
  const qualityMinutes = quality.reduce((sum, draft) => sum + totalMinutes(draft.parts), 0);
  const special = (extra.recovery && easyCount >= 3 ? 1 : 0) + (extra.strides && easyCount >= 1 ? 1 : 0);
  const plain = Math.max(0, easyCount - special);
  const spread = offsets(plain);

  // The long run stays the longest: at least ten minutes past the longest easy run.
  let longMinutes = longPlan.minutes;
  let each = (target - longMinutes - qualityMinutes) / Math.max(1, easyCount);
  if (!longPlan.race) {
    const need = round5(Math.min(extra.easyMax, Math.max(extra.easyMin, each))) + Math.max(0, ...spread) + 10;
    if (need > longMinutes) {
      // Never past about 40% of the week: the easy runs give way instead.
      longMinutes = Math.max(longMinutes, Math.min(longPlan.cap, need, Math.floor((target * longShare(days) + 2.5) / 5) * 5));
      each = (target - longMinutes - qualityMinutes) / Math.max(1, easyCount);
    }
  }
  let long = longPlan.make(longMinutes);
  const longest = longPlan.race ? extra.easyMax : Math.min(extra.easyMax, totalMinutes(long.parts) - 10);
  let middle = round5(Math.min(extra.easyMax, Math.max(extra.easyMin, each)));
  middle = Math.min(middle, longest - Math.max(0, ...spread));
  middle = Math.max(middle, extra.easyMin - Math.min(0, ...spread));

  let plainIndex = 0;
  const easies: Draft[] = Array.from({ length: easyCount }, (_, i) => {
    if (extra.recovery && i === easyCount - 1 && easyCount >= 3) return easyRun(Math.max(extra.easyMin, middle * 0.7), 'recovery');
    if (extra.strides && i === easyCount - (extra.recovery && easyCount >= 3 ? 2 : 1)) return stridesRun(middle);
    return easyRun(middle + spread[plainIndex++]);
  });
  // Nudge plain easy runs by five minutes so the week's total follows its target, keeping them distinct and in bounds.
  const sum = () => totalMinutes(long.parts) + qualityMinutes + easies.reduce((t, d) => t + totalMinutes(d.parts), 0);
  for (let guard = 0; guard < 8; guard += 1) {
    const diff = target - sum();
    if (Math.abs(diff) <= 2.5) break;
    const delta = diff > 0 ? 5 : -5;
    const lengths = easies.map((d) => (d.title === 'Easy run' ? totalMinutes(d.parts) : -1));
    const order = lengths.map((_, i) => i).sort((a, b) => (delta > 0 ? lengths[a] - lengths[b] : lengths[b] - lengths[a]));
    const pick = order.find((i) => {
      const next = lengths[i] + delta;
      return lengths[i] > 0 && next >= extra.easyMin && next <= longest && !lengths.includes(next);
    });
    if (pick === undefined) break;
    easies[pick] = easyRun(lengths[pick] + delta);
  }
  // The long run within its share of the week as laid out (the other days may not have reached the target).
  for (let guard = 0; guard < 4 && !longPlan.race; guard += 1) {
    const most = Math.floor((sum() * longShare(days) + 2.5) / 5) * 5;
    if (totalMinutes(long.parts) <= most) break;
    long = longPlan.make(most);
  }
  // Harder days apart, the long run last.
  const [q1, q2] = quality;
  const [e1, e2, e3, e4] = easies;
  const order: (Draft | undefined)[] =
    days === 3
      ? [q1 ?? e2, e1, long]
      : days === 4
        ? [e1, q1 ?? e3, q2 ?? e2, long]
        : days === 5
          ? [e1, q1 ?? e4, e2, q2 ?? e3, long]
          : [e1, q1 ?? easies[4], e2, q2 ?? e4, e3, long];
  return order.filter((draft): draft is Draft => Boolean(draft));
}

// ---------- The path after week 10 ----------

const thresholdSteps = ['3x6', '3x8', '3x10', '2x12', '4x8', '2x15', '3x12', '25', '4x10', '30', '2x20', '35'];
const intervalSteps = ['5x3', '4x4', '6x3', '5x4', '6x3', '5x4'];
const marathonBlocks: [number, number][] = [
  [2, 15],
  [2, 20],
  [3, 15],
  [2, 25],
  [3, 20],
  [2, 30],
];

function steadyRun(minutes: number): Draft {
  return {
    kind: 'easy',
    title: 'Steady run',
    summary: `${minutes} min steady in the middle`,
    parts: [warm(10), step('steady', minutes), cool(10)],
  };
}

/**
 * The long run's share of a week, at most: about 40%, so the other days keep
 * real running. On three days an even split is already a third each, so 45%.
 */
function longShare(days: number): number {
  return days <= 3 ? 0.45 : 0.4;
}
/** No single run longer than this: past about two and a half hours, the risk grows faster than the gain (Daniels). */
const LONGEST_RUN = 150;

/**
 * The longest a run may be, given the longest of the past four weeks: about
 * 10% more (five minutes at least, as sessions are in fives). Single runs
 * much longer than the longest of the past month carry more injury risk
 * (Frandsen et al., Br J Sports Med 2025).
 */
export function nextLongest(longestRecent: number): number {
  return Math.min(LONGEST_RUN, Math.max(longestRecent + 5, Math.floor((longestRecent * 1.1) / 5) * 5));
}

/**
 * The long run and weekly time an aim calls for. Distances follow common
 * practice: about 45 minutes long and two hours a week for a 5K, up to two
 * and a half hours long for a marathon; anything in between sits between
 * them. A long run stays under about 40% of a week, and within what the
 * chosen days can hold beside it.
 */
function needs(aim: Aim, days: number, startMinutes: number, easyMax: number): { long: number; weekly: number } {
  const roomy = (wanted: number, weekly: number) => {
    // L <= 40% of (L + the other days at their longest).
    const fits = Math.floor(((longShare(days) / (1 - longShare(days))) * (days - 1) * easyMax) / 5) * 5;
    const long = Math.min(wanted, fits, LONGEST_RUN);
    return { long, weekly: Math.max(Math.min(weekly, days * 65), long / longShare(days), startMinutes) };
  };
  if (aim.kind === 'steady') return roomy(50, days * 40);
  if (aim.kind === 'time') return roomy(aim.minutes, aim.minutes / 0.33);
  const anchors: [number, number, number][] = [
    [5000, 45, 130],
    [10000, 75, 170],
    [21097.5, 120, 240],
    [42195, 150, 330],
  ];
  const m = Math.min(Math.max(aim.meters, 5000), 42195);
  let i = 0;
  while (i < anchors.length - 2 && m > anchors[i + 1][0]) i += 1;
  const [m0, l0, w0] = anchors[i];
  const [m1, l1, w1] = anchors[i + 1];
  const t = (Math.log(m) - Math.log(m0)) / (Math.log(m1) - Math.log(m0));
  return roomy(round5(l0 + (l1 - l0) * t), w0 + (w1 - w0) * t);
}

type Growth = { limit?: number; hold?: number };

function pathId(choice: PathChoice, growth: Growth): string {
  const aim = choice.aim;
  const what = aim.kind === 'time' ? `t${aim.minutes}` : aim.kind === 'distance' ? `d${Math.round(aim.meters)}` : 'steady';
  const fit = growth.limit !== undefined ? `-l${growth.limit}` : growth.hold ? `-h${growth.hold}` : '';
  return `path-${what}-${choice.days}${choice.gentler ? '-g' : ''}${choice.walkFirst ? '-w' : ''}${fit}`;
}

/** The longest session of a week (of the kinds given), in minutes. */
function longestOf(week: PlanWeek, kinds: WorkoutKind[]): number {
  return Math.max(0, ...week.workouts.filter((w) => kinds.includes(w.kind)).map((w) => totalMinutes(w.parts)));
}

/** A harder session made to fit a length: fewer repeats (four at least, two for long blocks), then a shorter warm-up, in whole minutes. */
function within(draft: Draft, maxMinutes: number): Draft {
  let parts = [...draft.parts];
  const at = parts.findIndex((part) => 'repeat' in part);
  while (at >= 0 && totalMinutes(parts) > maxMinutes) {
    const group = parts[at] as { repeat: number; steps: Part[] };
    const blockMinutes = totalMinutes(group.steps);
    if (group.repeat <= (blockMinutes >= 8 ? 2 : 4)) break;
    parts[at] = { ...group, repeat: group.repeat - 1 } as Part;
  }
  const first = parts[0];
  if (totalMinutes(parts) > maxMinutes && !('repeat' in first) && first.minutes > 10)
    parts = [{ ...first, minutes: Math.max(10, first.minutes - Math.ceil(totalMinutes(parts) - maxMinutes)) }, ...parts.slice(1)];
  const group = parts.find((part) => 'repeat' in part) as { repeat: number } | undefined;
  return { ...draft, parts, summary: group ? draft.summary.replace(/^\d+ x/, `${group.repeat} x`) : draft.summary };
}

/** The longest stretch of running without a walk, in minutes. */
function longestRun(week: PlanWeek): number {
  return Math.max(0, ...week.workouts.flatMap((workout) => flatten(workout.parts).filter((s) => s.effort === 'easy').map((s) => s.minutes)));
}

function generate(choice: PathChoice, growth: Growth = {}): Plan & { growthWeeks: number } {
  const days = Math.min(6, Math.max(3, Math.round(choice.days)));
  const aim = choice.aim;
  const id = pathId({ ...choice, days }, growth);
  const weeks: PlanWeek[] = startWeeks(id, days, choice.gentler, choice.walkFirst);
  const firstLong = weeks.findIndex((week) => week.startIndex === 8);

  // Aims up to 30 minutes are met within the walk-run start.
  if (aim.kind === 'time' && aim.minutes <= 30) {
    const end = Math.max(firstLong, weeks.findIndex((week) => longestRun(week) >= aim.minutes));
    const kept = weeks.slice(0, end + 1);
    kept[end] = { ...kept[end], stage: 'Your aim', theme: aimWords(aim) };
    return { id, aim, days, weeks: kept, growthWeeks: 0 };
  }

  const distance = aim.kind === 'distance';
  const longAim = aim.kind === 'distance' && aim.meters >= 15000;
  const marathon = aim.kind === 'distance' && aim.meters >= 35000;
  const warmUp = longAim ? 15 : 10;
  // The first weeks after the start grow from the running done there (the walks around each walk-run are left out).
  const lastStart = weeks[weeks.length - 1];
  const startMinutes =
    weekMinutes(lastStart) -
    lastStart.workouts
      .filter((w) => w.kind === 'walk-run')
      .reduce((t, w) => t + flatten(w.parts).filter((s) => s.effort === 'walk').reduce((a, s) => a + s.minutes, 0), 0);
  const easyMax = longAim || (aim.kind === 'time' && aim.minutes >= 60) ? 75 : 55;
  const need = needs(aim, days, startMinutes, easyMax);
  const rate = choice.gentler ? 1.05 : 1.075;
  const extra = (strides: boolean) => ({
    strides,
    easyMin: 20,
    easyMax,
    recovery: days >= 6,
  });

  let n = weeks.length;
  let level = startMinutes;
  let lastLong = 30;
  let built = 0;
  let growthWeeks = 0;

  // After the start, running days are added one a week; the other days stay brisk walks until then.
  const addWeek = (stage: Stage, theme: string, easier: boolean, target: number, long: LongPlan, quality: Draft[], runDays = days) => {
    n += 1;
    const walks = days - runDays;
    const drafts = arrangeWeek(runDays, target - walks * 30, long, quality, extra(runDays >= 4 || quality.length === 0));
    for (let w = 0; w < walks; w += 1)
      drafts.splice(1 + w * 2, 0, { kind: 'walk', title: 'Brisk walk', summary: 'Easy aerobic time, no running', parts: [step('walk', 30)] });
    weeks.push({ n, stage, theme, easier, workouts: drafts.map((draft, i) => finish(id, n, i, draft)) });
  };

  /** Marathon-effort blocks sized to the week: no more than about a seventh of it. */
  const raceBlocks = (upTo: number): [number, number] => {
    for (let i = Math.min(upTo, marathonBlocks.length - 1); i >= 0; i -= 1) {
      const [repeat, length] = marathonBlocks[i];
      if (repeat * length <= level * 0.14) return marathonBlocks[i];
    }
    return marathonBlocks[0];
  };
  /** Race-effort blocks belong in long runs of an hour and a half or more, in weeks big enough for the smallest. */
  const raceBlocksFit = (longMinutes: number) => longMinutes >= 90 && marathonBlocks[0][0] * marathonBlocks[0][1] <= level * 0.14;

  /** The largest step so far whose hard minutes fit the week's budget (under a fifth of the week, all told). */
  const fit = (steps: string[], upTo: number, budget: number) => {
    const minutesOf = (spec: string) => spec.split('x').map(Number).reduce((a, b) => a * b, 1);
    for (let i = Math.min(upTo, steps.length - 1); i >= 0; i -= 1) if (minutesOf(steps[i]) <= budget) return steps[i];
    return steps[0];
  };

  /**
   * Whether this week's long run carries steady or race effort. With five or
   * more days toward a long aim, it does every other week, so the weeks with
   * intervals keep a plain long run: two harder sessions a week at most.
   */
  const effortLong = (k: number, easier: boolean) => longAim && !easier && k > 4 && (days < 5 || k % 2 === 0);

  const qualityFor = (k: number, easier: boolean, target = level): Draft[] => {
    if (!distance) return easier || k % 2 === 1 ? [] : [steadyRun(Math.min(30, 10 + k * 2))];
    if (easier) return k >= 8 ? [tempo('2x8', warmUp)] : [];
    if (k <= 4) return k === 2 || k === 3 ? [hills(6 + k * 2, warmUp)] : [];
    const both = days >= 5 && longAim && !effortLong(k, easier);
    // Steady minutes in the long run count too: hard and steady together stay under about 28% of the week.
    const longSteady = !effortLong(k, easier) ? 0 : marathon && built >= 4 && raceBlocksFit(lastLong) ? raceBlocks(built - 4).reduce((a, b) => a * b, 1) : Math.min(30, level * 0.1);
    const budget = Math.max(12, Math.min(target * (both ? 0.09 : 0.17), target * 0.27 - longSteady));
    const quality = [tempo(fit(thresholdSteps, built, budget), warmUp)];
    if (both) quality.push(intervals(fit(intervalSteps, Math.floor(built / 2), budget), warmUp));
    built += 1;
    return quality;
  };

  const longFor = (k: number, easier: boolean, minutes: number, cap = need.long): LongPlan => {
    const finishSteady = effortLong(k, easier) ? round5(Math.min(30, 15 + built * 3, level * 0.1)) : 0;
    return {
      minutes,
      cap: Math.max(minutes, Math.min(need.long, cap)),
      make: (m) => {
        if (aim.kind === 'time' && m >= aim.minutes) {
          const run = longRun(aim.minutes);
          return { ...run, title: aimWords(aim), summary: 'Easy, the whole way: your aim' };
        }
        if (marathon && effortLong(k, easier) && built >= 5 && raceBlocksFit(m)) {
          const [repeat, length] = raceBlocks(built - 5);
          return racePaceLong(m, repeat, length);
        }
        return longRun(m, finishSteady, longAim && !marathon ? 'About half-marathon effort' : undefined);
      },
    };
  };

  // Base and Build: weekly time grows by 5-8% a building week, every fourth week easier,
  // the long run by about a tenth (`nextLongest`), until the aim's needs are met.
  const limit = growth.limit ?? 80;
  // Building weeks in a row that laid out no more time than the one before: the days chosen hold no more.
  let still = 0;
  let laidOut = 0;
  for (let k = 1; k <= limit; k += 1) {
    // Distance aims build for at least eight weeks before sharpening, even when the time is already there.
    const enough = level >= need.weekly - 2 || still >= 2;
    if (((enough && lastLong >= need.long) || still >= 4) && (!distance || k > 8)) break;
    const easier = k % 4 === 0;
    let target: number;
    if (easier) target = level * 0.8;
    else {
      level = Math.min(need.weekly, level * rate);
      target = level;
    }
    const growTo = nextLongest(lastLong);
    const longMinutes = easier
      ? Math.max(30, lastLong - 15)
      : Math.min(need.long, Math.max(lastLong, Math.min(growTo, Math.floor((target * longShare(days)) / 5) * 5)));
    if (!easier) lastLong = longMinutes;
    const stage: Stage = k <= 4 ? 'Base' : 'Build';
    const quality = qualityFor(k, easier, target);
    // Two harder sessions, a long run and the shortest easy days must fit the week; if not, one harder session.
    const runDays = Math.min(days, 3 + k);
    const floor = (q: Draft[]) => q.reduce((t, d) => t + totalMinutes(d.parts), 0) + longMinutes + (runDays - 1 - q.length) * 20 + (days - runDays) * 30;
    while (quality.length > 1 && floor(quality) > target) quality.pop();
    // One harder session made shorter if the week still has no room for it.
    if (quality.length && floor(quality) > target) quality[0] = within(quality[0], totalMinutes(quality[0].parts) - (floor(quality) - target));
    // No harder session longer than the long run may grow to this week.
    for (let i = 0; i < quality.length; i += 1) quality[i] = within(quality[i], Math.max(longMinutes, easier ? lastLong : growTo));
    const theme = easier
      ? 'An easier week'
      : stage === 'Base'
        ? 'Easy time on your feet, and strides'
        : distance
          ? quality.length > 1
            ? 'Threshold and intervals'
            : 'Threshold work, longer runs'
          : 'Longer runs, a little more each week';
    addWeek(stage, theme, easier, target, longFor(k, easier, longMinutes, easier ? lastLong : growTo), quality, runDays);
    // The long run as laid out (it may have grown to stay past the easy runs).
    if (!easier) lastLong = Math.max(lastLong, longestOf(weeks[weeks.length - 1], ['long', 'race-pace']));
    // The next week grows from the week as laid out, so rounding never piles up.
    if (!easier) {
      const minutes = weekMinutes(weeks[weeks.length - 1]);
      still = minutes <= laidOut ? still + 1 : 0;
      laidOut = Math.max(laidOut, minutes);
      level = Math.min(level, minutes);
    }
    growthWeeks = k;
  }

  // Holding steady, when a date leaves room to spare.
  for (let h = 1; h <= (growth.hold ?? 0); h += 1) {
    const easier = h % 4 === 0;
    const target = easier ? level * 0.8 : level;
    addWeek('Hold', easier ? 'An easier week' : 'Holding steady', easier, target, longFor(growthWeeks + h, easier, easier ? Math.max(30, lastLong - 15) : lastLong, lastLong), qualityFor(growthWeeks + h, easier));
  }

  if (aim.kind === 'time') {
    // The path never ends on an easier week: one more ordinary week, with the aim as its long run.
    if (weeks[weeks.length - 1].easier) {
      addWeek('Build', 'Longer runs, a little more each week', false, level, longFor(growthWeeks + 1, false, need.long), [], days);
      growthWeeks += 1;
    }
    // The last building week holds the aim itself, as its long run.
    const last = weeks[weeks.length - 1];
    weeks[weeks.length - 1] = { ...last, stage: 'Your aim', theme: aimWords(aim) };
    return { id, aim, days, weeks, growthWeeks };
  }

  if (aim.kind === 'steady') {
    // Round and round: a four-week rhythm at the level reached.
    const cycleFrom = n + 1;
    const rhythm: [string, number, number, Draft[], boolean][] = [
      ['A steady week, with strides', 1, lastLong, [], false],
      ['A steady week, with a steady run', 1, lastLong - 5, [steadyRun(15)], false],
      ['A little longer', 1.05, nextLongest(lastLong), [], false],
      ['An easier week', 0.8, Math.max(30, lastLong - 15), [], true],
    ];
    for (const [theme, share, longMinutes, quality, easier] of rhythm)
      addWeek('Keep going', theme, easier, level * share, { minutes: longMinutes, cap: longMinutes, make: (m) => longRun(m) }, quality);
    return { id, aim, days, weeks, cycleFrom, growthWeeks };
  }

  // Shape: two sharper weeks at the level reached.
  for (const spec of ['5x3', '4x4']) {
    const quality = [intervals(spec, warmUp)];
    const long: LongPlan = {
      minutes: lastLong,
      cap: lastLong,
      make: (m) =>
        marathon && raceBlocksFit(m)
          ? racePaceLong(m, ...raceBlocks(3))
          : longRun(m, longAim ? round5(Math.min(20, level * 0.1)) : 0, longAim && !marathon ? 'About half-marathon effort' : undefined),
    };
    addWeek('Shape', 'Sharper sessions', false, level, long, quality);
  }

  // Taper and the aim's week: less running, a little intensity kept (Bosquet et al., 2007).
  const taper = marathon ? [0.8, 0.65] : longAim ? [0.75] : [0.8];
  for (const share of taper) {
    const quality = [intervals('4x3', warmUp)];
    if (days >= 5 && longAim) quality.push(tempo('3x5', warmUp));
    addWeek('Taper', 'Ease off, keep a little sharpness', false, level * share, { minutes: lastLong * share, cap: lastLong, make: (m) => longRun(m) }, quality);
  }
  addWeek('Your aim', aimWords(aim), false, level * (marathon ? 0.4 : 0.5), { minutes: 10, cap: 10, race: true, make: () => aimDay(aim, warmUp) }, [
    tempo(longAim ? '2x5' : '3x3', warmUp),
  ]);
  return { id, aim, days, weeks, growthWeeks };
}

/**
 * The path for an aim. With a date, it counts back to it: if there is more
 * time than the gentle path needs, it holds steady for a while; if less,
 * it grows for fewer weeks (never faster) and says so.
 */
export function buildPath(choice: PathChoice): Plan {
  const natural = generate(choice);
  const strip = ({ growthWeeks: _g, ...plan }: Plan & { growthWeeks: number }): Plan => plan;
  if (!choice.raceDate || !choice.today || choice.aim.kind === 'steady' || natural.growthWeeks === 0) return strip(natural);
  const join = Math.max(1, choice.joinWeek ?? 1);
  const available = Math.floor(daysBetween(mondayOnOrBefore(choice.today), mondayOnOrBefore(choice.raceDate)) / 7) + 1;
  const needed = natural.weeks.length - join + 1;
  if (needed === available) return { ...strip(natural), fit: 'fits' };
  if (needed < available) return { ...strip(generate(choice, { hold: available - needed })), fit: 'held' };
  const limit = Math.max(Math.max(0, join - 10), natural.growthWeeks - (needed - available));
  return { ...strip(generate(choice, { limit })), fit: 'shortened' };
}

/** The number of the last week listed. */
export const lastWeekOf = (plan: Plan): number => plan.weeks.at(-1)?.n ?? 0;

/** A week by its number; steady paths go round their rhythm after the last week. */
export function weekAt(plan: Plan, n: number): PlanWeek {
  const first = plan.weeks[0]?.n ?? 1;
  const last = lastWeekOf(plan);
  if (n <= last) return plan.weeks[Math.max(0, n - first)];
  if (plan.cycleFrom) {
    const cycle = plan.weeks.filter((week) => week.n >= plan.cycleFrom!);
    return { ...cycle[(n - plan.cycleFrom) % cycle.length], n };
  }
  return plan.weeks[plan.weeks.length - 1];
}

/** Whether the path is finished at week n: its aim week is done and nothing follows. */
export function isLastWeek(plan: Plan, n: number): boolean {
  return !plan.cycleFrom && n >= lastWeekOf(plan);
}

/**
 * Where someone joins, from how much they run now (minutes a week): the
 * growing week whose time is closest without going over.
 */
export function joinWeekFor(plan: Plan, weeklyMinutes: number, longestRun?: number): number {
  if (weeklyMinutes <= 0) return 1;
  const growing = plan.weeks.filter((week) => week.stage === 'Base' || week.stage === 'Build' || week.stage === 'Hold' || week.stage === 'Keep going');
  // A short aim reached within the walk-run weeks: someone already running is at its end.
  if (growing.length === 0) return plan.weeks.length;
  let join = growing[0].n;
  // The longest session matters too: a long run more than 15 minutes past what they run now is a week for later.
  const reachable = (week: PlanWeek) =>
    longestRun === undefined || Math.max(...week.workouts.map((workout) => totalMinutes(workout.parts))) <= longestRun + 15;
  for (const week of growing) {
    if (!reachable(week)) break;
    if (!week.easier && weekMinutes(week) <= weeklyMinutes * 1.05) join = week.n;
  }
  return join;
}

/** The first week after the walk-run start, or the last week when the aim is met within it. */
export function firstAfterStart(plan: Plan): number {
  return plan.weeks.find((week) => week.stage !== 'Start')?.n ?? lastWeekOf(plan);
}

/**
 * The runner's own path: the full path toward the aim, seen from the week
 * they joined at, which becomes their week 1. Ids stay as they are, so what
 * was logged stays with its session.
 */
export function fromWeek(plan: Plan, joinWeek: number): Plan {
  const shift = joinWeek - 1;
  if (shift === 0) return plan;
  return {
    ...plan,
    weeks: plan.weeks.filter((week) => week.n > shift).map((week) => ({ ...week, n: week.n - shift })),
    cycleFrom: plan.cycleFrom ? Math.max(1, plan.cycleFrom - shift) : undefined,
  };
}

export type OwnPath = Omit<PathChoice, 'joinWeek' | 'today'> & { joinWeek: number; startedOn: string };

export function ownPath(state: OwnPath): Plan {
  const natural = buildPath({
    aim: state.aim,
    days: state.days,
    gentler: state.gentler,
    walkFirst: state.walkFirst,
    raceDate: state.raceDate,
    joinWeek: Math.max(1, state.joinWeek),
    today: state.startedOn,
  });
  return fromWeek(natural, state.joinWeek);
}

/** In the full path, the week that matches where the runner is in another one (same walk-run step, or the same weekly time). */
export function matchingWeek(from: PlanWeek, to: Plan): number {
  if (from.stage === 'Start' && from.startIndex !== undefined)
    return to.weeks.find((week) => week.startIndex === from.startIndex)?.n ?? 1;
  return Math.max(firstAfterStart(to), joinWeekFor(to, weekMinutes(from)));
}

// ---------- Where to begin ----------

export type WalkNow = 'under10' | '10to20' | '20to40' | 'over40';
export type RunNow = 'none' | 'under5' | '5to15' | '15to30' | '30to60' | 'over60';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type StartTest = { walk: WalkNow; run: RunNow; weekly?: number };

export const walkChoices: { id: WalkNow; label: string }[] = [
  { id: 'under10', label: 'Under 10 minutes' },
  { id: '10to20', label: '10 to 20 minutes' },
  { id: '20to40', label: '20 to 40 minutes' },
  { id: 'over40', label: 'Over 40 minutes' },
];

export const runChoices: { id: RunNow; label: string; minutes: number }[] = [
  { id: 'none', label: 'Not yet', minutes: 0 },
  { id: 'under5', label: 'Under 5 minutes', minutes: 2 },
  { id: '5to15', label: '5 to 15 minutes', minutes: 5 },
  { id: '15to30', label: '15 to 30 minutes', minutes: 15 },
  { id: '30to60', label: '30 minutes to an hour', minutes: 30 },
  { id: 'over60', label: 'Over an hour', minutes: 60 },
];

/** A run time in minutes, as one of the answers. */
export function runAnswerFor(minutes: number): RunNow {
  if (minutes < 1) return 'none';
  if (minutes < 5) return 'under5';
  if (minutes < 15) return '5to15';
  if (minutes < 30) return '15to30';
  if (minutes < 60) return '30to60';
  return 'over60';
}

/** The level the answers suggest; the runner can pick another. */
export function suggestedLevel(test: StartTest): Level {
  if (test.run === 'over60' && (test.weekly ?? 0) >= 240) return 'advanced';
  if (test.run === '30to60' || test.run === 'over60') return 'intermediate';
  return 'beginner';
}

/** Walk-run steps by how long someone runs now. */
const startStepFor: Record<RunNow, number> = { none: 1, under5: 3, '5to15': 5, '15to30': 8, '30to60': 9, over60: 9 };

export type Placement = { walkFirst: boolean; gentler: boolean; startIndex?: number; weekly?: number; longest?: number };

/** What a level means for this runner: where week 1 begins, and whether walking comes first. */
export function placementFor(test: StartTest, level: Level): Placement {
  const short = test.walk === 'under10';
  if (level === 'beginner') {
    const walkFirst = short && test.run === 'none';
    return { walkFirst, gentler: short || test.walk === '10to20', startIndex: walkFirst ? 0 : startStepFor[test.run] };
  }
  const weekly = Math.max(level === 'advanced' ? 180 : 60, test.weekly ?? (level === 'advanced' ? 240 : 120));
  // About the longest run they do now, from the answer (the top of a range is not assumed).
  const longest = test.run === 'over60' ? (level === 'advanced' ? 90 : 75) : test.run === '30to60' ? 45 : 30;
  return { walkFirst: false, gentler: false, weekly, longest };
}

/** The week of the full path where a placement begins. */
export function joinFor(plan: Plan, placement: Placement): number {
  if (placement.startIndex !== undefined)
    return plan.weeks.find((week) => week.startIndex === placement.startIndex)?.n ?? 1;
  return Math.max(firstAfterStart(plan), joinWeekFor(plan, placement.weekly ?? 120, placement.longest));
}

/** The stages in order, each with its first and last week. */
export function stagesOf(plan: Plan): { stage: Stage; from: number; to: number }[] {
  const out: { stage: Stage; from: number; to: number }[] = [];
  for (const week of plan.weeks) {
    const last = out[out.length - 1];
    if (last && last.stage === week.stage) last.to = week.n;
    else out.push({ stage: week.stage, from: week.n, to: week.n });
  }
  return out;
}

export function weekMinutes(week: PlanWeek): number {
  return week.workouts.reduce((sum, workout) => sum + totalMinutes(workout.parts), 0);
}

export function findWorkout(plan: Plan, id: string): { week: PlanWeek; workout: Workout } | undefined {
  for (const week of plan.weeks) {
    const workout = week.workouts.find((item) => item.id === id);
    if (workout) return { week, workout };
  }
  return undefined;
}

/** The path shown in Train before an aim is set: a 10K, three days a week. */
export function examplePath(): Plan {
  return buildPath({ aim: { kind: 'distance', meters: 10000 }, days: 3 });
}
