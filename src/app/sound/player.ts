import { audio, buffer, gain, isKept, letGo, recording, soundedSpan, wakeAudio, type Layer } from './engine';
import { soundCatalogue, soundEntry, type SoundEntry, type SoundKind } from './soundscapes';

/**
 * What plays during a sit: any number of sounds layered together, and one
 * piece of music. They begin with the sit (from the Start tap) and end
 * with it. Separately, any one recording can be previewed for a short while
 * on the Sounds and Music tabs.
 */
export type PlayerState = {
  /** What a running sit is playing. */
  playing: readonly string[];
  /** The one recording being previewed, if any. */
  preview: string | null;
  volume: Record<SoundKind, number>;
  /** Recordings still on their way (the first time they play). */
  loading: readonly string[];
  /** A recording that could not be fetched, to say so plainly. */
  problem: string | null;
};

const FADE_IN = 2;
const FADE_OUT = 1.5;
/** A preview plays this long, then fades away by itself. */
const PREVIEW_SECONDS = 20;
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

let state: PlayerState = { playing: [], preview: null, volume: savedVolume(), loading: [], problem: null };
/** Music already on the device, ready to play at once (and offline). */
const ready = new Map<string, string>();
const listeners = new Set<() => void>();
const buses: Partial<Record<SoundKind, GainNode>> = {};
const sit = new Map<string, Layer>();
let previewLayer: Layer | null = null;
let previewTimer: number | undefined;

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
  window.setTimeout(
    () => {
      layer.stop();
      layer.output.disconnect();
      letGo();
    },
    seconds * 1000 + 100,
  );
}

function showOnLockScreen(): void {
  const titles = state.playing.map((id) => soundEntry(id)?.title).filter(Boolean);
  try {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = titles.length
      ? new MediaMetadata({ title: titles.join(' · '), artist: 'Proairetos' })
      : null;
  } catch {
    // Not every browser shows it.
  }
}

/**
 * Starts one recording, fading in. Sounds are short loops, decoded whole so
 * they repeat without a seam; music is long and streams through a media
 * element started inside the tap. `onTrouble` runs if it cannot be fetched.
 */
function begin(entry: SoundEntry, onTrouble: () => void): Layer {
  wakeAudio();
  const ctx = audio();
  const output = gain(ctx, 0);
  output.connect(bus(entry.kind));
  let end = () => undefined as void;
  let stopped = false;
  const fadeIn = () => {
    output.gain.setValueAtTime(0, ctx.currentTime);
    output.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN);
  };
  const layer: Layer = {
    output,
    stop: () => {
      stopped = true;
      end();
    },
  };

  if (entry.kind === 'sound') {
    set({ loading: [...state.loading, entry.id] });
    buffer(entry.file)
      .then((data) => {
        set({ loading: state.loading.filter((id) => id !== entry.id) });
        if (stopped) return;
        const source = ctx.createBufferSource();
        const span = soundedSpan(data);
        source.buffer = data;
        source.loop = true;
        source.loopStart = span.start;
        source.loopEnd = span.end;
        source.connect(output);
        source.start(ctx.currentTime, span.start);
        fadeIn();
        end = () => {
          try {
            source.stop();
          } catch {
            // Already stopped.
          }
        };
      })
      .catch(() => {
        set({ loading: state.loading.filter((id) => id !== entry.id) });
        onTrouble();
      });
    return layer;
  }

  const element = new Audio();
  element.loop = true;
  element.preload = 'auto';
  element.setAttribute('playsinline', '');
  element.src = ready.get(entry.file) ?? entry.file;
  const node = ctx.createMediaElementSource(element);
  node.connect(output);
  element.addEventListener('error', onTrouble, { once: true });
  void element.play().catch(onTrouble);
  fadeIn();
  end = () => {
    element.pause();
    element.removeAttribute('src');
    element.load();
    node.disconnect();
  };
  // Kept on the device after this, so it plays offline next time.
  if (!ready.has(entry.file)) void recording(entry.file).catch(() => undefined);
  return layer;
}

export const player = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  state(): PlayerState {
    return state;
  },

  /** Begins what a sit plays. Call it from the Start tap itself: phones only start sound there. */
  startSit(ids: readonly string[]): void {
    player.stopPreview();
    player.stop(0.3);
    const entries = ids.map(soundEntry).filter((entry): entry is SoundEntry => entry !== undefined);
    for (const entry of entries) {
      const layer = begin(entry, () => {
        if (sit.get(entry.id) !== layer) return;
        sit.delete(entry.id);
        set({ playing: state.playing.filter((id) => id !== entry.id), problem: entry.id });
      });
      sit.set(entry.id, layer);
    }
    set({ playing: entries.map((entry) => entry.id), problem: null });
    showOnLockScreen();
  },

  /** Ends what the sit plays, fading over `fade` seconds. */
  stop(fade = FADE_OUT): void {
    for (const layer of sit.values()) fadeAway(layer, fade);
    sit.clear();
    if (state.playing.length) set({ playing: [] });
    showOnLockScreen();
  },

  /** Plays one recording for a short while, or stops it if it is the one playing. */
  preview(id: string): void {
    const entry = soundEntry(id);
    if (!entry) return;
    const same = state.preview === id;
    player.stopPreview();
    if (same) return;
    const layer = begin(entry, () => {
      if (previewLayer !== layer) return;
      player.stopPreview();
      set({ problem: id });
    });
    previewLayer = layer;
    set({ preview: id, problem: null });
    previewTimer = window.setTimeout(() => player.stopPreview(2), PREVIEW_SECONDS * 1000);
  },

  stopPreview(fade = 0.6): void {
    window.clearTimeout(previewTimer);
    if (previewLayer) fadeAway(previewLayer, fade);
    previewLayer = null;
    if (state.preview) set({ preview: null });
  },

  /** Readies music already on the device, so a tap plays it at once, even offline. */
  async prepare(): Promise<void> {
    for (const entry of soundCatalogue) {
      if (entry.kind !== 'music' || ready.has(entry.file) || !(await isKept(entry.file))) continue;
      const bytes = await recording(entry.file);
      ready.set(entry.file, URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
    }
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
};
