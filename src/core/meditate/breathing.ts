/**
 * Breathing patterns: a cycle of steps, each a number of seconds. The
 * circle, the counts, and the breath sounds all read from `breathAt`, so
 * they stay together whatever the screen or the timer does.
 */
export type BreathStepKind = 'in' | 'hold' | 'out' | 'rest';

export type BreathStep = { kind: BreathStepKind; seconds: number };

export type BreathPatternId = 'calm' | 'even' | 'box' | 'four-seven-eight' | 'slow';

export type BreathPattern = {
  id: BreathPatternId;
  title: string;
  /** One line under the title. */
  line: string;
  steps: readonly BreathStep[];
  source: string;
};

export const breathPatterns: readonly BreathPattern[] = [
  {
    id: 'calm',
    title: 'Longer out',
    line: 'Breathing out for longer than in, which many find settling.',
    steps: [
      { kind: 'in', seconds: 4 },
      { kind: 'out', seconds: 6 },
    ],
    source: 'Extended exhale breathing, used widely in relaxation and in MBCT breathing spaces.',
  },
  {
    id: 'even',
    title: 'Even',
    line: 'In and out for the same count, steady as a tide.',
    steps: [
      { kind: 'in', seconds: 5 },
      { kind: 'out', seconds: 5 },
    ],
    source: 'Resonant or coherent breathing, around six breaths a minute.',
  },
  {
    id: 'box',
    title: 'Box',
    line: 'In, hold, out, hold. Four sides, four counts each.',
    steps: [
      { kind: 'in', seconds: 4 },
      { kind: 'hold', seconds: 4 },
      { kind: 'out', seconds: 4 },
      { kind: 'rest', seconds: 4 },
    ],
    source: 'Box breathing (square breathing), taught in many traditions and settings.',
  },
  {
    id: 'four-seven-eight',
    title: '4-7-8',
    line: 'In for four, hold for seven, out for eight. Often used before sleep.',
    steps: [
      { kind: 'in', seconds: 4 },
      { kind: 'hold', seconds: 7 },
      { kind: 'out', seconds: 8 },
    ],
    source: 'The 4-7-8 breath as taught by Andrew Weil, from pranayama.',
  },
  {
    id: 'slow',
    title: 'Slow and easy',
    line: 'A gentle, unhurried pace with a pause after each breath.',
    steps: [
      { kind: 'in', seconds: 4 },
      { kind: 'out', seconds: 6 },
      { kind: 'rest', seconds: 2 },
    ],
    source: 'A natural breath with the small rest that follows it, as noticed in mindfulness of breathing (anapanasati).',
  },
];

export function breathPattern(id: BreathPatternId): BreathPattern {
  return breathPatterns.find((pattern) => pattern.id === id) ?? breathPatterns[0];
}

export function cycleSeconds(pattern: BreathPattern): number {
  return pattern.steps.reduce((sum, step) => sum + step.seconds, 0);
}

/** "4 in · 6 out", "4 in · 4 hold · 4 out · 4 hold". */
export function patternCounts(pattern: BreathPattern): string {
  return pattern.steps.map((step) => `${step.seconds} ${step.kind === 'rest' ? 'hold' : step.kind}`).join(' · ');
}

export const stepLabels: Record<BreathStepKind, string> = {
  in: 'Breathe in',
  hold: 'Hold',
  out: 'Breathe out',
  rest: 'Hold',
};

export type BreathMoment = {
  step: BreathStep;
  /** Which step of the cycle. */
  index: number;
  /** Start of this step, in seconds from the beginning. */
  stepStart: number;
  /** 0 to 1 through this step. */
  progress: number;
  /** The count to show: whole seconds left in this step, never 0. */
  count: number;
  /** 0 (empty) to 1 (full): how open the circle is. */
  size: number;
  /** 0 to 1 through the whole cycle; the dot on the ring follows it. */
  cycle: number;
};

/** Smooth in and out, so the circle never jerks at a turn. */
function ease(t: number): number {
  return 0.5 - Math.cos(Math.PI * t) / 2;
}

/** Where the breath is, `seconds` after it began. */
export function breathAt(seconds: number, pattern: BreathPattern): BreathMoment {
  const total = cycleSeconds(pattern);
  const into = ((Math.max(0, seconds) % total) + total) % total;
  const cycleStart = Math.max(0, seconds) - into;
  let start = 0;
  for (let index = 0; index < pattern.steps.length; index++) {
    const step = pattern.steps[index];
    if (into < start + step.seconds || index === pattern.steps.length - 1) {
      const progress = Math.min(1, (into - start) / step.seconds);
      const size = step.kind === 'in' ? ease(progress) : step.kind === 'out' ? 1 - ease(progress) : step.kind === 'hold' ? 1 : 0;
      return {
        step,
        index,
        stepStart: cycleStart + start,
        progress,
        count: Math.max(1, Math.ceil(step.seconds - (into - start))),
        size,
        cycle: into / total,
      };
    }
    start += step.seconds;
  }
  throw new Error('unreachable');
}
