import { useSyncExternalStore } from 'react';
import { player } from '../../app/sound/player';
import { settings } from './state';

/**
 * Sleep sounds, as Calm and BetterSleep keep them: one sound and one piece of music (either may be none), played
 * until a timer fades them out, or until stopped. The fade is set on the audio clock, so it keeps time with the
 * screen locked. What plays carries on while moving around the app; the choices are kept with Diaita's settings.
 */
export type SleepSoundChoice = { sound?: string; music?: string; minutes: number };

export const SLEEP_SOUNDS = ['rain', 'window', 'ocean', 'river', 'waterfall', 'forest', 'crickets', 'wind', 'fan', 'campfire', 'storm'] as const;
export const SLEEP_MUSIC = ['stillness-one', 'stillness-two', 'cosmic-waves', 'bowls'] as const;
/** Minutes before the fade; 0 plays until stopped. */
export const SLEEP_TIMERS = [15, 30, 45, 60, 90, 0] as const;
/** The last minute of a timer is the fade. */
const FADE_SECONDS = 60;

type Playing = { ids: string[]; endsAt?: number };

let playing: Playing | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

player.subscribe(() => {
  if (playing && player.state().playing.length === 0) {
    playing = null;
    changed();
  }
});

export function sleepChoice(): SleepSoundChoice {
  return settings.load().sleepSounds ?? { sound: 'rain', minutes: 45 };
}

export function saveSleepChoice(choice: SleepSoundChoice): void {
  settings.save({ ...settings.load(), sleepSounds: choice });
}

const idsOf = (choice: SleepSoundChoice) => [choice.sound, choice.music].filter((id): id is string => Boolean(id));

/** Starts (or changes) what plays. Call it from a tap: phones only start sound there. */
export function playSleepSounds(choice: SleepSoundChoice): void {
  const ids = idsOf(choice);
  if (ids.length === 0) return stopSleepSounds();
  player.startSit(ids);
  timeSleepSounds(choice.minutes);
}

/** Sets the timer afresh from now: the sounds fade out over its last minute. */
export function timeSleepSounds(minutes: number): void {
  if (!player.state().playing.length) return;
  if (minutes > 0) {
    player.fadeOutLater(minutes * 60 - FADE_SECONDS, FADE_SECONDS);
    playing = { ids: [...player.state().playing], endsAt: Date.now() + minutes * 60_000 };
  } else {
    player.keepPlaying();
    playing = { ids: [...player.state().playing] };
  }
  changed();
}

export function stopSleepSounds(): void {
  player.stop(2);
  playing = null;
  changed();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => playing;

export function useSleepSounds(): Playing | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
