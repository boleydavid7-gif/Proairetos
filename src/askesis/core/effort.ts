/**
 * How hard a step is, described the ways a runner can tell without
 * equipment: perceived effort (Borg's CR10 scale, as used for session RPE),
 * the talk test, and, for people who wear a heart-rate monitor, a share of
 * maximum heart rate. The plan prescribes effort, never pace.
 */
export type Effort = 'walk' | 'recovery' | 'easy' | 'steady' | 'tempo' | 'hard' | 'stride';

export type EffortInfo = {
  name: string;
  /** What the guide says aloud and shows large. */
  say: string;
  /** Perceived effort on a 0-10 scale. */
  rpe: string;
  talk: string;
  /** Share of maximum heart rate, low and high. */
  hr: [number, number];
  /** Counted as the harder part of training (for the 80/20 balance). */
  intense: boolean;
};

export const efforts: Record<Effort, EffortInfo> = {
  walk: {
    name: 'Brisk walk',
    say: 'Walk briskly',
    rpe: '2 to 3',
    talk: 'You could sing.',
    hr: [0.5, 0.6],
    intense: false,
  },
  recovery: {
    name: 'Very easy',
    say: 'Very easy running',
    rpe: '2 to 3',
    talk: 'Easy to hold a conversation.',
    hr: [0.55, 0.65],
    intense: false,
  },
  easy: {
    name: 'Easy',
    say: 'Run easy',
    rpe: '3 to 4',
    talk: 'You can talk in full sentences.',
    hr: [0.6, 0.72],
    intense: false,
  },
  steady: {
    name: 'Steady',
    say: 'Steady running',
    rpe: '5',
    talk: 'Short sentences, a little effort to talk.',
    hr: [0.72, 0.82],
    intense: false,
  },
  tempo: {
    name: 'Comfortably hard',
    say: 'Comfortably hard',
    rpe: '6 to 7',
    talk: 'A few words at a time.',
    hr: [0.82, 0.89],
    intense: true,
  },
  hard: {
    name: 'Hard',
    say: 'Hard, and controlled',
    rpe: '8 to 9',
    talk: 'A word or two, no more.',
    hr: [0.9, 0.95],
    intense: true,
  },
  stride: {
    name: 'Stride',
    say: 'Quick and relaxed',
    rpe: '7 to 8, briefly',
    talk: 'Fast but smooth, never a sprint.',
    hr: [0.8, 0.9],
    intense: false,
  },
};
