// A recording as Whisper hears it: one channel of 16 kHz samples, cut into pieces of at most 30 seconds at the
// quietest moment near the end of each, so a word is rarely split between two pieces.

export const SAMPLE_RATE = 16_000;
const MAX_SECONDS = 30;
const MIN_SECONDS = 22;
const FRAME_SECONDS = 0.1;

export type AudioWindow = { start: number; samples: Float32Array };

// Decodes any recording the browser can play and resamples it to 16 kHz mono.
export async function toMono16k(data: ArrayBuffer): Promise<Float32Array> {
  const Context = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error('This browser can’t read the recording.');
  const context = new Context();
  try {
    const decoded = await context.decodeAudioData(data.slice(0));
    const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    void context.close().catch(() => undefined);
  }
}

// Loudness of each 0.1 s frame.
function frameEnergy(samples: Float32Array, from: number, to: number, rate: number): number[] {
  const frame = Math.round(FRAME_SECONDS * rate);
  const out: number[] = [];
  for (let at = from; at + frame <= to; at += frame) {
    let sum = 0;
    for (let i = at; i < at + frame; i += 1) sum += samples[i] * samples[i];
    out.push(sum / frame);
  }
  return out;
}

// Pieces of at most 30 s, each cut at the quietest frame between 22 and 30 s.
export function windowsOf(samples: Float32Array, rate = SAMPLE_RATE): AudioWindow[] {
  const max = MAX_SECONDS * rate;
  const min = MIN_SECONDS * rate;
  const frame = Math.round(FRAME_SECONDS * rate);
  const windows: AudioWindow[] = [];
  let start = 0;
  while (start < samples.length) {
    let end = Math.min(samples.length, start + max);
    if (end < samples.length) {
      const energies = frameEnergy(samples, start + min, end, rate);
      let quietest = 0;
      energies.forEach((energy, index) => {
        if (energy < energies[quietest]) quietest = index;
      });
      if (energies.length) end = start + min + quietest * frame + Math.floor(frame / 2);
    }
    windows.push({ start: start / rate, samples: samples.slice(start, end) });
    start = end;
  }
  // A last piece under half a second is silence or a breath; it rides with the one before.
  if (windows.length > 1 && windows[windows.length - 1].samples.length < rate / 2) {
    const last = windows.pop()!;
    const before = windows.pop()!;
    const joined = new Float32Array(before.samples.length + last.samples.length);
    joined.set(before.samples);
    joined.set(last.samples, before.samples.length);
    windows.push({ start: before.start, samples: joined });
  }
  return windows;
}
