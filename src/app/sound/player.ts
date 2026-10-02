import { audio, gain, letGo, wakeAudio, type Layer } from './engine';
import { soundEntry, type SoundKind } from './soundscapes';

/**
 * What is playing: one sound and one piece of music at most, mixed. It
 * keeps playing across tabs until stopped, or until the timer runs out,
 * when it fades away rather than cutting off.
 */
export type PlayerState = {
  sound: string | null;
  music: string | null;
  volume: Record<SoundKind, number>;
  /** The timer chosen, in minutes, if any. */
  timer: number | null;
  /** When playing stops by itself (ms since epoch), if a timer is set. */
  stopAt: number | null;
};

const FADE_IN = 2;
const FADE_OUT = 1.5;
const VOLUME_KEY = 'proairetos.soundVolume';

function savedVolume(): Record<SoundKind, number> {
  try {
    const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null');
    if (saved && typeof saved.sound === 'number' && typeof saved.music === 'number') return saved;
  } catch {
    // Use the defaults.
  }
  return { sound: 0.7, music: 0.6 };
}

let state: PlayerState = { sound: null, music: null, volume: savedVolume(), timer: null, stopAt: null };
const listeners = new Set<() => void>();
const buses: Partial<Record<SoundKind, GainNode>> = {};
const playing: Partial<Record<SoundKind, Layer>> = {};
let timer: number | undefined;

function set(next: Partial<PlayerState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function bus(kind: SoundKind): GainNode {
  const ctx = audio();
  let node = buses[kind];
  if (!node) {
    node = gain(ctx, state.volume[kind]);
    // A gentle limiter, so a loud moment (thunder, a wave) never distorts.
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -6;
    limit.knee.value = 6;
    limit.ratio.value = 12;
    limit.attack.value = 0.005;
    limit.release.value = 0.25;
    node.connect(limit).connect(ctx.destination);
    buses[kind] = node;
  }
  return node;
}

function fadeAway(layer: Layer, seconds: number): void {
  const ctx = audio();
  layer.output.gain.cancelScheduledValues(ctx.currentTime);
  layer.output.gain.setValueAtTime(layer.output.gain.value, ctx.currentTime);
  layer.output.gain.linearRampToValueAtTime(0, ctx.currentTime + seconds);
  window.setTimeout(() => {
    layer.stop();
    layer.output.disconnect();
  }, seconds * 1000 + 100);
}

function showOnLockScreen(): void {
  const titles = [soundEntry(state.sound)?.title, soundEntry(state.music)?.title].filter(Boolean);
  try {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = titles.length ? new MediaMetadata({ title: titles.join(' · '), artist: 'Proairetos' }) : null;
  } catch {
    // Not every browser shows it.
  }
}

export const player = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  state(): PlayerState {
    return state;
  },

  /** Plays a sound or a piece of music, replacing whatever of that kind was playing. `null` stops it. */
  play(id: string | null): void {
    const entry = soundEntry(id);
    const kind: SoundKind | undefined = entry?.kind;
    if (!entry || !kind) return;
    player.stop(kind);
    wakeAudio();
    const ctx = audio();
    const layer = entry.build(ctx);
    layer.output.gain.setValueAtTime(0, ctx.currentTime);
    layer.output.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN);
    layer.output.connect(bus(kind));
    playing[kind] = layer;
    set({ [kind]: entry.id } as Partial<PlayerState>);
    showOnLockScreen();
  },

  /** Stops one kind, or everything, with a short fade. */
  stop(kind?: SoundKind, fade = FADE_OUT): void {
    for (const each of kind ? [kind] : (['sound', 'music'] as const)) {
      const layer = playing[each];
      if (layer) {
        fadeAway(layer, fade);
        window.setTimeout(letGo, fade * 1000 + 200);
      }
      delete playing[each];
    }
    set(kind ? ({ [kind]: null } as Partial<PlayerState>) : { sound: null, music: null });
    if (!state.sound && !state.music) player.setTimer(null);
    showOnLockScreen();
  },

  toggle(id: string): void {
    const kind = soundEntry(id)?.kind;
    if (!kind) return;
    if (state[kind] === id) player.stop(kind);
    else player.play(id);
  },

  setVolume(kind: SoundKind, value: number): void {
    const node = buses[kind];
    if (node) node.gain.setTargetAtTime(value, audio().currentTime, 0.05);
    set({ volume: { ...state.volume, [kind]: value } });
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify(state.volume));
    } catch {
      // Volume is remembered when it can be.
    }
  },

  /** Stops everything after `minutes`, fading over the last half minute. `null` keeps playing. */
  setTimer(minutes: number | null): void {
    window.clearTimeout(timer);
    timer = undefined;
    if (minutes === null) {
      if (state.timer !== null) set({ timer: null, stopAt: null });
      return;
    }
    const stopAt = Date.now() + minutes * 60_000;
    timer = window.setTimeout(() => player.stop(undefined, 30), Math.max(0, stopAt - Date.now() - 30_000));
    set({ timer: minutes, stopAt });
  },
};
