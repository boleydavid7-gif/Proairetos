/**
 * The audio engine for Meditate: one audio clock, recordings fetched once
 * and kept on the device, and the media trick that lets iPhones play them
 * through the silent switch.
 *
 * A layer is a playing recording with one output; `stop()` ends it.
 */
export type Layer = { output: GainNode; stop(): void };

type Win = typeof window & { webkitAudioContext?: typeof AudioContext };

let shared: AudioContext | null = null;

/** The one audio context, created on the first tap (browsers need a gesture). */
export function audio(): AudioContext {
  if (!shared) {
    const Context = window.AudioContext ?? (window as Win).webkitAudioContext;
    shared = new Context({ latencyHint: 'playback' });
  }
  // iPhones can also report 'interrupted' after a call or a lock.
  if (shared.state !== 'running') void shared.resume().catch(() => undefined);
  return shared;
}

// ---------- Playing as media ----------

/*
 * On iPhones, sound made with Web Audio counts as an app sound effect:
 * the silent switch mutes it and it stops when the screen locks. Playing
 * an <audio> element at the same time makes the page a media player, so
 * the sounds play like music does. The element itself is silence.
 */
let media: HTMLAudioElement | null = null;
let holds = 0;

function silence(): string {
  // Half a second of 8-bit mono silence as a WAV file.
  const samples = 4000;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => [...value].forEach((char, i) => (bytes[at + i] = char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

/**
 * Call from a tap, before any sound starts: wakes the audio clock and lets
 * sounds play through the silent switch, as music does. Each call is
 * matched by `letGo()` when that sound ends.
 */
export function wakeAudio(): void {
  holds++;
  const ctx = audio();
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
  } catch {
    // Older browsers have no audio session.
  }
  // A one-sample sound inside the tap unlocks older iPhones.
  try {
    const tick = ctx.createBufferSource();
    tick.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    tick.connect(ctx.destination);
    tick.start();
  } catch {
    // Nothing to unlock.
  }
  try {
    if (!media) {
      media = new Audio(silence());
      media.loop = true;
      media.setAttribute('playsinline', '');
    }
    if (media.paused) void media.play().catch(() => undefined);
  } catch {
    // Web Audio still plays where media elements are refused.
  }
}

/** Ends one `wakeAudio()`; when none are left, other apps' audio can come back. */
export function letGo(): void {
  holds = Math.max(0, holds - 1);
  if (holds === 0) media?.pause();
}

// ---------- Recordings, kept on the device ----------

const SOUND_CACHE = 'proairetos-sounds';

/** A recording's bytes: from the device after the first time, else fetched and kept. */
export async function recording(url: string): Promise<ArrayBuffer> {
  try {
    const cache = await caches.open(SOUND_CACHE);
    const kept = await cache.match(url);
    if (kept) return await kept.arrayBuffer();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not fetch ${url}`);
    await cache.put(url, response.clone());
    return await response.arrayBuffer();
  } catch (error) {
    // No Cache Storage (some private windows): fetch it plainly.
    if (error instanceof Error && error.message.startsWith('Could not fetch')) throw error;
    const response = await fetch(url);
    return await response.arrayBuffer();
  }
}

/** Whether a recording is already on the device. */
export async function isKept(url: string): Promise<boolean> {
  try {
    return Boolean(await (await caches.open(SOUND_CACHE)).match(url));
  } catch {
    return false;
  }
}

const decoded = new Map<string, Promise<AudioBuffer>>();

/** A short recording, decoded once and held for the session. */
export function buffer(url: string): Promise<AudioBuffer> {
  let pending = decoded.get(url);
  if (!pending) {
    pending = recording(url).then((bytes) => audio().decodeAudioData(bytes));
    pending.catch(() => decoded.delete(url));
    decoded.set(url, pending);
  }
  return pending;
}

export function gain(ctx: BaseAudioContext, value: number): GainNode {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

/** The first and last moments of real sound, past any silence an encoder adds. */
export function soundedSpan(data: AudioBuffer): { start: number; end: number } {
  const channel = data.getChannelData(0);
  const limit = Math.min(channel.length, 8192);
  let first = 0;
  while (first < limit && Math.abs(channel[first]) < 1e-4) first++;
  let last = channel.length - 1;
  while (last > channel.length - limit && Math.abs(channel[last]) < 1e-4) last--;
  return { start: first / data.sampleRate, end: (last + 1) / data.sampleRate };
}

/** Plays a recording once, from `when` on the audio clock. */
export async function playOnce(url: string, out: AudioNode, delay = 0): Promise<void> {
  const data = await buffer(url);
  const ctx = audio();
  const source = ctx.createBufferSource();
  source.buffer = data;
  source.connect(out);
  source.start(ctx.currentTime + delay);
}
