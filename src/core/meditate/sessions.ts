import type { BreathPatternId } from './breathing';

/**
 * Sitting sessions. Each is a short script of plain cues, spread over the
 * length the person picks: a few to settle in, a few spaced through the
 * middle with silence between, and a few to come back. Nothing is scored
 * or kept; the session simply ends.
 */
export type SessionId = 'guided' | 'mindfulness' | 'sleep' | 'focus' | 'kindness';

export type SessionScript = {
  id: SessionId;
  title: string;
  /** One line under the title. */
  line: string;
  minutes: number;
  /** What plays at first (sound ids, and one piece of music); the person can change both. */
  sounds: readonly string[];
  music: string | null;
  /** The circle breathes at this pace, without counts. */
  pace: BreathPatternId;
  opening: readonly string[];
  middle: readonly string[];
  closing: readonly string[];
  /** Sleep ends by fading out instead of a bell. */
  fadeOut?: boolean;
  source: string;
};

export const sessionLengths = [5, 10, 15, 20, 30, 45, 60] as const;

export const sessions: readonly SessionScript[] = [
  {
    id: 'guided',
    title: 'Guided',
    line: 'A gentle sit with the breath and the body, step by step.',
    minutes: 10,
    sounds: [],
    music: null,
    pace: 'slow',
    opening: [
      'Find a way of sitting or lying that feels steady and easy.',
      'Let your eyes close, or rest your gaze softly on the floor.',
      'Notice the places where your body is supported.',
      'Let the breath come and go by itself. No need to change it.',
    ],
    middle: [
      'Feel the breath where it is clearest: the nose, the chest, or the belly.',
      'If the mind wanders, that is what minds do. Notice where it went, and come back.',
      'Soften the forehead, the jaw, the shoulders.',
      'Rest with one breath at a time.',
      'Let the out-breath be a little slower, if that is easy.',
      'Notice the small pause at the end of each breath.',
      'Wherever your attention is, gently bring it home to the breath.',
    ],
    closing: [
      'Let your attention widen to your whole body, sitting here.',
      'Notice the sounds around you, and the room.',
      'When you are ready, open your eyes and carry this ease with you.',
    ],
    source: 'Mindfulness of breathing (anapanasati), as taught in MBSR and MBCT.',
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    line: 'Open awareness: sounds, sensations, thoughts, coming and going.',
    minutes: 10,
    sounds: ['forest'],
    music: null,
    pace: 'even',
    opening: [
      'Settle in, and take a few easy breaths.',
      'Let your attention rest on sounds, near and far.',
      'No need to name them. Just hear them arrive and fade.',
    ],
    middle: [
      'Now notice sensations in the body: warmth, pressure, tingling, stillness.',
      'Thoughts may come. Let them pass like clouds across the sky.',
      'If a thought pulls you along, notice that, and come back to this moment.',
      'Feelings too can be noticed, without needing to change them.',
      'Rest as the one who is aware, open to whatever comes.',
      'Everything that arrives also leaves. Watch it come and go.',
    ],
    closing: [
      'Come back to the breath for a few moments.',
      'Feel the whole body, here and now.',
      'Slowly open your eyes. Take this open attention into your day.',
    ],
    source: 'Choiceless awareness, from MBSR and Vipassana traditions.',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    line: 'A slow body scan with long out-breaths. The sound fades as it ends.',
    minutes: 20,
    sounds: ['rain'],
    music: null,
    pace: 'four-seven-eight',
    opening: [
      'Lie down and let the bed hold all of your weight.',
      'Let the breath be slow, longer out than in.',
      'There is nothing more to do today.',
    ],
    middle: [
      'Let your feet and ankles grow heavy and warm.',
      'The heaviness moves up through your legs and knees.',
      'Your hips and lower back sink a little deeper.',
      'Your belly rises and falls on its own.',
      'Let your hands and arms go loose.',
      'Your shoulders drop away from your ears.',
      'Soften your face: the jaw, the eyes, the forehead.',
      'The whole body is heavy, warm, and at rest.',
      'If thoughts come, let them drift by. You can pick them up tomorrow.',
    ],
    closing: ['Let yourself drift.'],
    fadeOut: true,
    source: 'Body scan from MBSR (Jon Kabat-Zinn), with progressive relaxation.',
  },
  {
    id: 'focus',
    title: 'Focus',
    line: 'Counting breaths from one to ten, to gather a scattered mind.',
    minutes: 10,
    sounds: ['waterfall'],
    music: null,
    pace: 'even',
    opening: [
      'Sit upright and at ease.',
      'Breathe in, and as you breathe out, count one.',
      'Next out-breath, two. Count up to ten, then begin again at one.',
    ],
    middle: [
      'If you lose count, simply start again at one. That is the practice.',
      'Let each number be soft and clear.',
      'Rest your attention on the whole breath between the counts.',
      'Starting again is not a mistake. It is the practice.',
      'One breath, one count.',
    ],
    closing: [
      'Let the counting go, and just breathe.',
      'Notice how your mind feels now.',
      'When you open your eyes, pick one thing to give your full attention to.',
    ],
    source: 'Counting the breath (sūsokukan), from Zen practice.',
  },
  {
    id: 'kindness',
    title: 'Kindness',
    line: 'Warm wishes, for yourself and then for others.',
    minutes: 10,
    sounds: [],
    music: 'mozart',
    pace: 'calm',
    opening: [
      'Settle in, and place a hand on your heart if that feels right.',
      'Breathe gently, and let your face soften.',
      'Bring to mind yourself, just as you are today.',
    ],
    middle: [
      'May I be safe. May I be well. May I be at ease.',
      'May I meet this day with kindness.',
      'Now picture someone who cares for you. May you be safe. May you be well.',
      'Picture someone you barely know, a face from your week. May you be at ease, too.',
      'If it feels right, someone you find difficult. May you be free from suffering.',
      'Now everyone, everywhere. May all beings be safe, well, and at ease.',
    ],
    closing: [
      'Let the wishes go, and rest in whatever warmth is here.',
      'Return to the breath.',
      'Open your eyes, and offer yourself the same kindness through the day.',
    ],
    source: 'Loving-kindness (metta), from the Buddhist tradition.',
  },
];

export function session(id: SessionId): SessionScript {
  return sessions.find((script) => script.id === id) ?? sessions[0];
}

export type Cue = { at: number; text: string };

/** Seconds between opening cues, and between closing cues. */
const OPEN_GAP = 18;
const CLOSE_GAP = 20;

/** How often words come: about one every so many seconds through the middle; none is a silent sit. */
export type Guidance = 'often' | 'some' | 'rarely' | 'none';
export const guidanceGaps: Record<Exclude<Guidance, 'none'>, number> = { often: 40, some: 90, rarely: 180 };

/**
 * The cues of a session over `minutes`, each with its start in seconds.
 * The middle cues are spread evenly with silence between; `guidance` sets
 * how much silence (a short session keeps only as many as fit), and
 * `none` leaves the whole sit to the bells.
 */
export function sessionCues(script: SessionScript, minutes: number, guidance: Guidance = 'often'): Cue[] {
  if (guidance === 'none') return [];
  const total = minutes * 60;
  const cues: Cue[] = script.opening.map((text, index) => ({ at: 3 + index * OPEN_GAP, text }));
  const middleFrom = 3 + script.opening.length * OPEN_GAP;
  const closingFrom = total - script.closing.length * CLOSE_GAP - 5;
  const room = closingFrom - middleFrom;
  const fit = Math.max(0, Math.min(script.middle.length, Math.floor(room / guidanceGaps[guidance])));
  // Keep the cues spread across the script, not just the first few.
  const middle = Array.from({ length: fit }, (_, index) => script.middle[Math.floor((index * script.middle.length) / fit)]);
  middle.forEach((text, index) => cues.push({ at: Math.round(middleFrom + ((index + 0.5) * room) / fit), text }));
  script.closing.forEach((text, index) => cues.push({ at: closingFrom + index * CLOSE_GAP, text }));
  return cues;
}

/** The cue showing `seconds` into the session, if any. */
export function cueAt(cues: readonly Cue[], seconds: number): Cue | undefined {
  let current: Cue | undefined;
  for (const cue of cues) if (cue.at <= seconds) current = cue;
  return current;
}
