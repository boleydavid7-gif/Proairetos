import { set, step, totalMinutes, type Part, type Workout, type WorkoutKind } from './workouts';

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
 * - Easier weeks. Every fourth week drops by about a fifth so the body
 *   absorbs the work (the common practice of loading and unloading).
 * - Threshold and interval sessions follow the classic forms: cruise
 *   intervals and tempo runs (Daniels), and 4 x 4 minutes hard with
 *   3 minutes easy (Helgerud et al., 2007).
 * - A taper. Before a race, volume falls by roughly 40-60% over about two
 *   weeks while a little intensity stays (Bosquet et al., 2007).
 *
 * Plans prescribe time and effort, never pace: that works without a GPS,
 * on any terrain, and for anyone.
 */
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'run-30' | '10k' | 'half' | 'marathon';
export type PlanChoice = { level: Level; days: number; goal?: Goal };

export type PlanWeek = {
  n: number;
  phase: string;
  theme: string;
  easier: boolean;
  workouts: Workout[];
};

export type Plan = {
  id: string;
  level: Level;
  goal: Goal;
  days: number;
  title: string;
  weeks: PlanWeek[];
};

export const levels: Record<Level, { name: string; line: string; who: string }> = {
  beginner: {
    name: 'Beginner',
    line: 'From walking to 30 minutes of running.',
    who: 'New to running, or coming back after a long break.',
  },
  intermediate: {
    name: 'Intermediate',
    line: 'Build endurance and run a 10K.',
    who: 'You can run about 30 minutes without stopping.',
  },
  advanced: {
    name: 'Advanced',
    line: 'Train for a half marathon or a marathon.',
    who: 'You run 3 to 5 days a week and have run a 10K or longer.',
  },
};

export const goals: Record<Goal, { name: string; weeks: number }> = {
  'run-30': { name: '30 minutes of running', weeks: 10 },
  '10k': { name: '10K', weeks: 12 },
  half: { name: 'Half marathon', weeks: 14 },
  marathon: { name: 'Marathon', weeks: 18 },
};

export function daysFor(level: Level): number[] {
  return level === 'beginner' ? [3, 4] : level === 'intermediate' ? [3, 4, 5] : [4, 5, 6];
}

export function goalsFor(level: Level): Goal[] {
  return level === 'beginner' ? ['run-30'] : level === 'intermediate' ? ['10k'] : ['half', 'marathon'];
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
      'The walks are part of the plan, not a pause from it.',
      'Repeat a week whenever you like.',
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
      'Walk or jog gently until you feel fully recovered.',
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
    why: 'The day you trained for. The work is done; today is for running it.',
    tips: [
      'Start slower than feels right. The second half is where a race is decided.',
      'Nothing new on the day: the same shoes, breakfast and drinks you trained with.',
      'Warm up gently with a few strides.',
    ],
  },
};

type Draft = { kind: WorkoutKind; title: string; summary: string; parts: Part[] };

function finish(planId: string, week: number, index: number, draft: Draft): Workout {
  const notes = kindNotes[draft.kind];
  return { id: `${planId}.w${week}.${index}`, ...draft, why: notes.why, tips: notes.tips };
}

const round5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

// ---------- Beginner: walk-run to 30 minutes ----------

const walkRun = (run: number, walk: number, repeat: number): Part[] => [set(repeat, step('easy', run), step('walk', walk))];
const continuous = (run: number): Part[] => [step('easy', run)];

/** [theme, first two sessions, third session], one per week. */
const beginnerWeeks: [string, Part[], Part[]][] = [
  ['Get comfortable moving', walkRun(1, 1.5, 8), walkRun(1, 1.5, 8)],
  ['Build consistency', walkRun(1.5, 2, 6), walkRun(1.5, 2, 6)],
  ['A little more running', walkRun(2, 2, 5), walkRun(2.5, 2, 4)],
  ['A lighter week', walkRun(2, 2, 4), walkRun(2, 2, 4)],
  ['Longer runs between walks', walkRun(3, 1.5, 4), walkRun(4, 2, 3)],
  ['Five minutes and more', walkRun(5, 2, 3), walkRun(8, 2, 2)],
  ['Ten minutes at a time', walkRun(8, 2, 2), walkRun(10, 2, 2)],
  ['Your first long run', walkRun(12, 2, 2), continuous(20)],
  ['Steady and easy', continuous(22), continuous(25)],
  ['30 minutes, your way', continuous(25), continuous(30)],
];

function describeWalkRun(parts: Part[]): string {
  const first = parts[0];
  if ('repeat' in first) {
    const [run, walk] = first.steps;
    return `${first.repeat} x run ${run.minutes} min, walk ${walk.minutes} min`;
  }
  return `Run ${first.minutes} minutes without stopping`;
}

function beginnerPlan(days: number): Plan {
  const id = `beginner-run-30-${days}`;
  const weeks = beginnerWeeks.map(([theme, ab, c], index) => {
    const n = index + 1;
    const session = (parts: Part[]): Draft => ({
      kind: 'walk-run',
      title: parts.length === 1 && !('repeat' in parts[0]) ? 'Easy run' : 'Walk-run',
      summary: describeWalkRun(parts),
      parts: [step('walk', 5, 'Warm up'), ...parts, step('walk', 5, 'Cool down')],
    });
    const drafts: Draft[] = [session(ab), session(ab), session(c)];
    if (days >= 4)
      drafts.splice(2, 0, {
        kind: 'walk',
        title: 'Brisk walk',
        summary: 'Easy aerobic time, no running',
        parts: [step('walk', 30)],
      });
    return {
      n,
      phase: n <= 3 ? 'Start' : n === 4 ? 'Easier week' : n <= 8 ? 'Build' : 'Finish',
      theme,
      easier: n === 4,
      workouts: drafts.map((draft, i) => finish(id, n, i, draft)),
    };
  });
  return { id, level: 'beginner', goal: 'run-30', days, title: 'Beginner: 30 minutes of running', weeks };
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

function raceDay(goal: Goal): Draft {
  return {
    kind: 'race',
    title: `Race day: ${goals[goal].name}`,
    summary: goal === '10k' ? 'Your 10K, or a time trial on your own' : 'The day you trained for',
    parts: [warm(10)],
  };
}

/** Fits the week's sessions to its time: a long run, the harder sessions, and easy running between. */
function arrangeWeek(
  days: number,
  target: number,
  long: Draft,
  quality: Draft[],
  extra: { strides: boolean; easyMin: number; easyMax: number; recovery: boolean },
): Draft[] {
  const easyCount = days - 1 - quality.length;
  const used = totalMinutes(long.parts) + quality.reduce((sum, draft) => sum + totalMinutes(draft.parts), 0);
  const each = Math.min(extra.easyMax, Math.max(extra.easyMin, (target - used) / Math.max(1, easyCount)));
  const easies: Draft[] = Array.from({ length: easyCount }, (_, i) => {
    if (extra.recovery && i === easyCount - 1 && easyCount >= 3) return easyRun(Math.max(extra.easyMin, each * 0.7), 'recovery');
    if (extra.strides && i === easyCount - 1) return stridesRun(each);
    return easyRun(each);
  });
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

// ---------- Intermediate: 10K in 12 weeks ----------

function intermediatePlan(days: number): Plan {
  const id = `intermediate-10k-${days}`;
  const start = ({ 3: 100, 4: 130, 5: 160 } as Record<number, number>)[days] ?? 130;
  const factors = [1, 1.08, 1.16, 0.85, 1.2, 1.28, 1.36, 1, 1.4, 1.48, 1.1, 0.7];
  const themes = [
    'Easy time on your feet',
    'Add strides',
    'First hills',
    'An easier week',
    'Your first threshold session',
    'Longer threshold',
    'Threshold, two long blocks',
    'An easier week',
    'Intervals begin',
    'More intervals',
    'Sharpen, and ease off',
    'Race week',
  ];
  const weeks: PlanWeek[] = factors.map((factor, index) => {
    const n = index + 1;
    const target = start * factor;
    const easier = n === 4 || n === 8;
    const raceWeek = n === 12;
    const longMinutes = Math.min(80, Math.max(40, target * 0.3));
    const long = raceWeek
      ? raceDay('10k')
      : longRun(longMinutes, [6, 7, 9, 10].includes(n) ? 10 : 0);
    const q1: Draft | undefined = (
      {
        2: stridesRun(30),
        3: hills(8, 10),
        4: stridesRun(30),
        5: tempo('3x6', 10),
        6: tempo('3x8', 10),
        7: tempo('2x12', 10),
        8: tempo('2x8', 10),
        9: intervals('5x3', 10),
        10: intervals('6x3', 10),
        11: intervals('4x4', 10),
        12: tempo('3x3', 10),
      } as Record<number, Draft>
    )[n];
    const q2 = days >= 5 ? ({ 9: tempo('20', 10), 10: tempo('2x10', 10), 11: tempo('15', 10) } as Record<number, Draft>)[n] : undefined;
    const quality = [q1, q2].filter((draft): draft is Draft => Boolean(draft));
    const drafts = arrangeWeek(days, target, long, quality, {
      strides: n >= 5 && !raceWeek && days >= 4,
      easyMin: 20,
      easyMax: 50,
      recovery: false,
    });
    return {
      n,
      phase: easier ? 'Easier week' : n <= 3 ? 'Base' : n <= 7 ? 'Build' : n <= 10 ? 'Peak' : n === 11 ? 'Taper' : 'Race week',
      theme: themes[index],
      easier,
      workouts: drafts.map((draft, i) => finish(id, n, i, draft)),
    };
  });
  return { id, level: 'intermediate', goal: '10k', days, title: 'Intermediate: 10K', weeks };
}

// ---------- Advanced: half marathon and marathon ----------

const thresholdSteps = ['3x8', '3x10', '4x8', '2x15', '3x12', '25', '4x10', '30', '2x20', '35'];
const intervalSteps = ['5x3', '4x4', '6x3', '5x4', '6x3', '5x4'];
const marathonBlocks: [number, number][] = [
  [2, 15],
  [2, 20],
  [3, 15],
  [2, 25],
  [3, 20],
  [2, 30],
];

function advancedPlan(days: number, goal: 'half' | 'marathon'): Plan {
  const id = `advanced-${goal}-${days}`;
  const marathon = goal === 'marathon';
  const start = (marathon ? { 4: 240, 5: 280, 6: 320 } : { 4: 180, 5: 220, 6: 260 })[days as 4 | 5 | 6] ?? 220;
  const factors = marathon
    ? [1, 1.07, 1.14, 0.85, 1.2, 1.27, 1.34, 0.95, 1.4, 1.47, 1.53, 1.05, 1.56, 1.6, 1.62, 0.75, 0.6, 0.4]
    : [1, 1.07, 1.14, 0.85, 1.2, 1.27, 1.34, 0.95, 1.4, 1.46, 1.5, 1.05, 0.8, 0.5];
  const total = factors.length;
  const taperFrom = marathon ? 16 : 13;
  const longCap = marathon ? 180 : 120;
  let built = 0;
  const weeks: PlanWeek[] = factors.map((factor, index) => {
    const n = index + 1;
    const target = start * factor;
    const raceWeek = n === total;
    const taper = n >= taperFrom && !raceWeek;
    const easier = !taper && !raceWeek && n % 4 === 0;
    const base = n <= 3;
    // The long run is a larger share for a marathon, where time on feet matters most.
    const longMinutes = Math.min(longCap, Math.max(60, target * (marathon ? 0.35 : 0.3)));

    let long: Draft;
    if (raceWeek) long = raceDay(goal);
    else if (base || easier || taper) long = longRun(longMinutes);
    else if (marathon && n >= 9) {
      const [repeat, length] = marathonBlocks[Math.min(marathonBlocks.length - 1, n - 9 - Math.floor((n - 9) / 4))];
      long = racePaceLong(longMinutes, repeat, length);
    } else long = longRun(longMinutes, Math.min(30, 15 + built * 3), marathon ? undefined : 'About half-marathon effort');

    const quality: Draft[] = [];
    if (raceWeek) quality.push(marathon ? tempo('2x5', 15) : tempo('2x5', 15));
    else if (taper) {
      quality.push(intervals('4x3', 15));
      if (days >= 5) quality.push(tempo('3x5', 15));
    } else if (base) {
      quality.push(hills(6 + n * 2, 15));
      if (days >= 5) quality.push({ kind: 'easy', title: 'Steady run', summary: `${15 + n * 5} min steady in the middle`, parts: [warm(10), step('steady', 15 + n * 5), cool(10)] });
    } else if (easier) {
      quality.push(tempo('2x8', 15));
    } else {
      const threshold = tempo(thresholdSteps[Math.min(thresholdSteps.length - 1, built)], 15);
      const vo2 = intervals(intervalSteps[Math.min(intervalSteps.length - 1, Math.floor(built / 2))], 15);
      if (days >= 5) quality.push(threshold, vo2);
      else quality.push(built % 2 === 0 ? threshold : vo2);
      built += 1;
    }

    const drafts = arrangeWeek(days, target, long, quality, {
      strides: !raceWeek,
      easyMin: 30,
      easyMax: 75,
      recovery: days >= 6,
    });
    return {
      n,
      phase: raceWeek ? 'Race week' : taper ? 'Taper' : easier ? 'Easier week' : base ? 'Base' : n >= total - 6 ? 'Peak' : 'Build',
      theme: raceWeek
        ? 'Race week'
        : taper
          ? 'Ease off, keep a little sharpness'
          : easier
            ? 'An easier week'
            : base
              ? 'Base: hills and easy time'
              : marathon && n >= 9
                ? 'Threshold, intervals, race effort'
                : 'Threshold and intervals',
      easier,
      workouts: drafts.map((draft, i) => finish(id, n, i, draft)),
    };
  });
  return {
    id,
    level: 'advanced',
    goal,
    days,
    title: `Advanced: ${goals[goal].name}`,
    weeks,
  };
}

export function buildPlan(choice: PlanChoice): Plan {
  const allowed = daysFor(choice.level);
  const days = allowed.includes(choice.days) ? choice.days : allowed[0];
  if (choice.level === 'beginner') return beginnerPlan(days);
  if (choice.level === 'intermediate') return intermediatePlan(days);
  return advancedPlan(days, choice.goal === 'marathon' ? 'marathon' : 'half');
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
