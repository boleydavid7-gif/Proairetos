/**
 * The audio engine for Meditate. Every sound is made here, on the device,
 * from noise and simple tones: nothing is downloaded, so it all works
 * offline and nothing needs a licence.
 *
 * A layer is a running sound with one output; `stop()` ends it and frees
 * its timers. Builders schedule their own events a little ahead of the
 * audio clock, so timers that run late never make the sound stutter.
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

// ---------- Noise ----------

type NoiseKind = 'white' | 'pink' | 'brown';
const noiseCache = new WeakMap<BaseAudioContext, Map<NoiseKind, AudioBuffer>>();

/** Eight seconds of stereo noise, made once per context and looped. */
function noiseBuffer(ctx: BaseAudioContext, kind: NoiseKind): AudioBuffer {
  let byKind = noiseCache.get(ctx);
  if (!byKind) noiseCache.set(ctx, (byKind = new Map()));
  const cached = byKind.get(kind);
  if (cached) return cached;
  const length = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === 'white') data[i] = white * 0.5;
      else if (kind === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        // Paul Kellet's pink noise filter.
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    // Ease the loop seam so it never clicks.
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const mix = i / fade;
      data[i] = data[i] * mix + data[length - fade + i] * (1 - mix);
    }
  }
  byKind.set(kind, buffer);
  return buffer;
}

export function noise(ctx: BaseAudioContext, kind: NoiseKind): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, kind);
  source.loop = true;
  source.start(ctx.currentTime, Math.random() * 7);
  return source;
}

// ---------- Room ----------

const roomCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** A soft room: a few seconds of fading noise, used as a reverb. */
export function room(ctx: BaseAudioContext, seconds = 3.5): ConvolverNode {
  let impulse = roomCache.get(ctx);
  if (!impulse) {
    const length = Math.floor(ctx.sampleRate * seconds);
    impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
    roomCache.set(ctx, impulse);
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

// ---------- Small parts ----------

export const rand = (low: number, high: number) => low + Math.random() * (high - low);
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

export function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

export function gain(ctx: BaseAudioContext, value: number): GainNode {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

/** Connects a chain of nodes in order and returns the last. */
export function chain<T extends AudioNode>(...nodes: [...AudioNode[], T]): T {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1] as T;
}

/** A slow wobble on a parameter. */
export function wobble(ctx: BaseAudioContext, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const amount = gain(ctx, depth);
  osc.connect(amount).connect(param);
  osc.start();
  return osc;
}

/** Things that need stopping when a layer ends. */
export class Parts {
  private sources: (AudioScheduledSourceNode | null)[] = [];
  private timers: number[] = [];
  stopped = false;

  add<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.push(source);
    return source;
  }

  timer(id: number): void {
    this.timers.push(id);
  }

  stop(): void {
    this.stopped = true;
    for (const id of this.timers) window.clearInterval(id);
    for (const source of this.sources) {
      try {
        source?.stop();
      } catch {
        // Already stopped.
      }
    }
    this.sources = [];
  }
}

/**
 * Calls `fire(when)` for events spaced by `gap()` seconds, scheduled up to
 * a second and a half ahead of the audio clock.
 */
export function every(ctx: BaseAudioContext, parts: Parts, gap: () => number, fire: (when: number) => void, firstIn = 0.2): void {
  let next = ctx.currentTime + firstIn;
  const tick = () => {
    if (parts.stopped) return;
    while (next < ctx.currentTime + 1.5) {
      fire(Math.max(next, ctx.currentTime + 0.01));
      next += gap();
    }
  };
  tick();
  // An offline render has no timers to wait for; schedule its whole length now.
  if (!(ctx instanceof AudioContext)) {
    const end = (ctx as OfflineAudioContext).length / ctx.sampleRate;
    while (next < end) {
      fire(next);
      next += gap();
    }
    return;
  }
  parts.timer(window.setInterval(tick, 250));
}

/** Short burst of noise with a quick decay: a drop, a crackle, a click. */
export function burst(
  ctx: BaseAudioContext,
  out: AudioNode,
  when: number,
  { length, level, type = 'bandpass', frequency, q = 1, pan = 0, kind = 'white' }: {
    length: number;
    level: number;
    type?: BiquadFilterType;
    frequency: number;
    q?: number;
    pan?: number;
    kind?: NoiseKind;
  },
): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, kind);
  const shape = filter(ctx, type, frequency, q);
  const env = gain(ctx, 0);
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  chain(source, shape, env, panner, out);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(level, when + Math.min(0.004, length / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, when + length);
  source.start(when, Math.random() * 7, length + 0.05);
}
