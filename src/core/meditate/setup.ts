import type { BreathPatternId } from './breathing';
import { session, type SessionId } from './sessions';

/**
 * How each kind of sit is set up. Every session type, and breathing, has
 * its own: the person changes what they like and the rest stays as it
 * came. Nothing here is a recommendation; these are starting points.
 */
export type SitKind = SessionId | 'breathe';

export type SitSetup = {
  minutes: number;
  /** The circle's pace (and, for breathing, the pattern followed). */
  pace: BreathPatternId;
  /** "Breathe in, 4" in the circle; otherwise the time left. */
  counts: boolean;
  /** A bowl struck at the start and the end. */
  bells: boolean;
  breathSounds: boolean;
  /** Sounds layered together while the sit runs. */
  sounds: readonly string[];
  /** One piece of music, or none. */
  music: string | null;
};

export const breatheLengths = [1, 3, 5, 10, 15] as const;

export function defaultSetup(kind: SitKind): SitSetup {
  if (kind === 'breathe') {
    return {
      minutes: 3,
      pace: 'calm',
      counts: true,
      bells: true,
      breathSounds: true,
      sounds: [],
      music: null,
    };
  }
  const script = session(kind);
  return {
    minutes: script.minutes,
    pace: script.pace,
    counts: false,
    // A sleep sit ends by fading, without a bell to wake anyone.
    bells: !script.fadeOut,
    breathSounds: kind !== 'sleep',
    sounds: script.sounds,
    music: script.music,
  };
}

/** A kind's setup: what the person changed, over the starting points. */
export function setupFor(kind: SitKind, changed: Partial<SitSetup> | undefined): SitSetup {
  return { ...defaultSetup(kind), ...changed };
}

/** Whether anything differs from the starting point, to offer going back to it. */
export function isChanged(kind: SitKind, changed: Partial<SitSetup> | undefined): boolean {
  const start = defaultSetup(kind);
  const now = setupFor(kind, changed);
  return (Object.keys(start) as (keyof SitSetup)[]).some(
    (key) => JSON.stringify(start[key]) !== JSON.stringify(now[key]),
  );
}
