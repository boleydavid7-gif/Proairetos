import type { BreathPatternId } from './breathing';

/** Quiet sits available in the app; recorded guides are linked separately. */
export type SessionId = 'mindfulness' | 'sleep' | 'focus' | 'kindness';

export type SessionDefinition = {
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
  /** Sleep ends by fading out instead of a bell. */
  fadeOut?: boolean;
  source: string;
};

export const sessionLengths = [5, 10, 15, 20, 30, 45, 60] as const;

export const sessions: readonly SessionDefinition[] = [
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    line: 'Open awareness: sounds, sensations, thoughts, coming and going.',
    minutes: 10,
    sounds: ['forest'],
    music: null,
    pace: 'even',
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
    source: 'Loving-kindness (metta), from the Buddhist tradition.',
  },
];

export function session(id: SessionId): SessionDefinition {
  return sessions.find((definition) => definition.id === id) ?? sessions[0];
}
