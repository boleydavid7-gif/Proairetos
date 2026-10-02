import { burst, chain, every, filter, gain, midi, noise, Parts, pick, rand, room, wobble, type Layer } from './engine';

/**
 * Sounds (nature and noise) and music (slow, generative, never the same
 * twice). Each builder returns a running layer; the player fades it in.
 */
type Builder = (ctx: BaseAudioContext) => Layer;

function layer(ctx: BaseAudioContext, build: (out: GainNode, parts: Parts) => void): Layer {
  const out = gain(ctx, 1);
  const parts = new Parts();
  build(out, parts);
  return { output: out, stop: () => parts.stop() };
}

/** A parameter that drifts to a new random value every so often. */
function drift(ctx: BaseAudioContext, parts: Parts, param: AudioParam, low: number, high: number, seconds: number): void {
  every(ctx, parts, () => seconds * rand(0.6, 1.4), (when) => param.setTargetAtTime(rand(low, high), when, seconds / 2.5), 0);
}

// ---------- Sounds ----------

function rainBed(ctx: BaseAudioContext, out: AudioNode, parts: Parts, heavy: number): void {
  chain(parts.add(noise(ctx, 'pink')), filter(ctx, 'highpass', 450), filter(ctx, 'lowpass', 7500), gain(ctx, 0.55 * heavy), out);
  chain(parts.add(noise(ctx, 'brown')), filter(ctx, 'lowpass', 380), gain(ctx, 0.35 * heavy), out);
  every(
    ctx,
    parts,
    () => rand(0.015, 0.09) / heavy,
    (when) =>
      burst(ctx, out, when, {
        length: rand(0.015, 0.05),
        level: Math.pow(Math.random(), 2) * 0.22,
        frequency: rand(1800, 6500),
        q: rand(1.5, 4),
        pan: rand(-0.85, 0.85),
      }),
  );
}

const rain: Builder = (ctx) => layer(ctx, (out, parts) => rainBed(ctx, out, parts, 1));

const storm: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    rainBed(ctx, out, parts, 1.35);
    // Wind under the rain.
    const wind = filter(ctx, 'bandpass', 400, 0.8);
    const windLevel = gain(ctx, 0.12);
    chain(parts.add(noise(ctx, 'pink')), wind, windLevel, out);
    drift(ctx, parts, wind.frequency, 250, 700, 3);
    drift(ctx, parts, windLevel.gain, 0.05, 0.2, 3);
    // Thunder, now and then: a low roll that rises and slowly dies away.
    every(
      ctx,
      parts,
      () => rand(14, 34),
      (when) => {
        const source = ctx.createBufferSource();
        source.buffer = noise(ctx, 'brown').buffer;
        const low = filter(ctx, 'lowpass', rand(110, 220));
        const env = gain(ctx, 0);
        const panner = ctx.createStereoPanner();
        panner.pan.value = rand(-0.6, 0.6);
        chain(source, low, env, panner, out);
        const peak = rand(1, 1.8);
        const rise = rand(0.2, 1.2);
        const length = rand(5, 9);
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(peak, when + rise);
        // A second rumble inside the first.
        env.gain.setTargetAtTime(peak * 0.45, when + rise, 0.6);
        env.gain.setTargetAtTime(peak * 0.8, when + rise + rand(0.8, 2), 0.3);
        env.gain.setTargetAtTime(0, when + rise + rand(2, 3), length / 4);
        source.start(when, rand(0, 6), length + 2);
        if (Math.random() < 0.4)
          burst(ctx, out, when + rise * 0.3, { length: 0.6, level: 0.12, frequency: 900, q: 0.6, kind: 'pink' });
      },
      rand(4, 10),
    );
  });

const river: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    chain(parts.add(noise(ctx, 'brown')), filter(ctx, 'lowpass', 900), gain(ctx, 0.45), out);
    for (const frequency of [320, 700, 1400, 2600]) {
      const band = filter(ctx, 'bandpass', frequency, 1.4);
      const level = gain(ctx, 0.2);
      chain(parts.add(noise(ctx, 'pink')), band, level, out);
      drift(ctx, parts, level.gain, 0.05, frequency > 2000 ? 0.18 : 0.45, 0.35);
      drift(ctx, parts, band.frequency, frequency * 0.8, frequency * 1.25, 0.6);
    }
    // Small bubbles where the water turns over stones.
    every(
      ctx,
      parts,
      () => rand(0.04, 0.35),
      (when) => {
        const osc = parts.add(ctx.createOscillator());
        const env = gain(ctx, 0);
        const panner = ctx.createStereoPanner();
        panner.pan.value = rand(-0.7, 0.7);
        chain(osc, env, panner, out);
        const from = rand(350, 900);
        osc.frequency.setValueAtTime(from, when);
        osc.frequency.exponentialRampToValueAtTime(from * rand(1.4, 2.2), when + 0.04);
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(rand(0.006, 0.025), when + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
        osc.start(when);
        osc.stop(when + 0.06);
      },
    );
  });

const ocean: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    chain(parts.add(noise(ctx, 'brown')), filter(ctx, 'lowpass', 500), gain(ctx, 0.25), out);
    for (const pan of [-0.5, 0.5]) {
      const tone = filter(ctx, 'lowpass', 500, 0.5);
      const level = gain(ctx, 0.1);
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      chain(parts.add(noise(ctx, 'pink')), tone, level, panner, out);
      // A wave: it gathers for a few seconds, breaks, and drains back.
      every(
        ctx,
        parts,
        () => rand(7, 12),
        (when) => {
          const gather = rand(2.5, 4);
          const drain = rand(4, 6);
          level.gain.setTargetAtTime(rand(0.5, 0.75), when, gather / 3);
          tone.frequency.setTargetAtTime(rand(1800, 3200), when, gather / 3);
          level.gain.setTargetAtTime(0.1, when + gather, drain / 3);
          tone.frequency.setTargetAtTime(450, when + gather, drain / 3);
        },
        pan < 0 ? 0.3 : rand(3, 6),
      );
    }
  });

function birds(ctx: BaseAudioContext, out: AudioNode, parts: Parts, often = 1): void {
  const space = room(ctx, 2.5);
  const wet = gain(ctx, 0.35);
  chain(space, wet, out);
  every(
    ctx,
    parts,
    () => rand(2, 8) / often,
    (when) => {
      // One bird's song: a few chirps at its own pitch, from one place.
      const panner = ctx.createStereoPanner();
      panner.pan.value = rand(-0.9, 0.9);
      const level = gain(ctx, rand(0.05, 0.12));
      chain(level, panner, out);
      panner.connect(space);
      const pitch = rand(2200, 4800);
      const shape = rand(0.6, 1.5);
      let at = when;
      for (let i = 0, count = Math.floor(rand(2, 7)); i < count; i++) {
        const osc = parts.add(ctx.createOscillator());
        const env = gain(ctx, 0);
        chain(osc, env, level);
        const length = rand(0.05, 0.14);
        const from = pitch * rand(0.92, 1.08);
        osc.frequency.setValueAtTime(from, at);
        osc.frequency.exponentialRampToValueAtTime(from * shape, at + length);
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(1, at + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, at + length);
        osc.start(at);
        osc.stop(at + length + 0.02);
        at += length + rand(0.04, 0.16);
      }
    },
    rand(0.5, 2),
  );
}

function breeze(ctx: BaseAudioContext, out: AudioNode, parts: Parts, level: number, low = 250, high = 900): void {
  for (const pan of [-0.6, 0.6]) {
    const band = filter(ctx, 'bandpass', 500, 0.8);
    const amount = gain(ctx, level);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    chain(parts.add(noise(ctx, 'pink')), band, amount, panner, out);
    drift(ctx, parts, band.frequency, low, high, 2.5);
    drift(ctx, parts, amount.gain, level * 0.3, level * 1.4, 2);
  }
}

const forest: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    breeze(ctx, out, parts, 0.45);
    // Leaves moving high up.
    const leaves = gain(ctx, 0.06);
    chain(parts.add(noise(ctx, 'white')), filter(ctx, 'highpass', 3500), leaves, out);
    drift(ctx, parts, leaves.gain, 0.01, 0.08, 1.5);
    birds(ctx, out, parts);
  });

const campfire: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    const roar = gain(ctx, 0.5);
    chain(parts.add(noise(ctx, 'brown')), filter(ctx, 'lowpass', 420), roar, out);
    drift(ctx, parts, roar.gain, 0.35, 0.65, 0.8);
    chain(parts.add(noise(ctx, 'pink')), filter(ctx, 'bandpass', 1100, 0.9), gain(ctx, 0.04), out);
    every(
      ctx,
      parts,
      () => -Math.log(1 - Math.random()) * 0.11,
      (when) =>
        burst(ctx, out, when, {
          length: rand(0.004, 0.022),
          level: Math.pow(Math.random(), 3) * 0.7,
          type: 'highpass',
          frequency: rand(1200, 4500),
          pan: rand(-0.5, 0.5),
        }),
    );
    // A log settling, now and then.
    every(
      ctx,
      parts,
      () => rand(6, 16),
      (when) => burst(ctx, out, when, { length: 0.25, level: 0.35, type: 'lowpass', frequency: 220, kind: 'brown' }),
      rand(3, 8),
    );
  });

const wind: Builder = (ctx) => layer(ctx, (out, parts) => breeze(ctx, out, parts, 0.8, 180, 1000));

const white: Builder = (ctx) =>
  layer(ctx, (out, parts) => chain(parts.add(noise(ctx, 'white')), filter(ctx, 'lowpass', 9000), gain(ctx, 0.3), out));

const brown: Builder = (ctx) =>
  layer(ctx, (out, parts) => chain(parts.add(noise(ctx, 'brown')), filter(ctx, 'lowpass', 1200), gain(ctx, 0.85), out));

// ---------- Music ----------

/** A soft struck note: a few sine partials and a long fade. */
function keyNote(ctx: BaseAudioContext, out: AudioNode, parts: Parts, when: number, note: number, level: number, length = 4): void {
  const env = gain(ctx, 0);
  const tone = filter(ctx, 'lowpass', 2600);
  chain(env, tone, out);
  const f = midi(note);
  for (const [ratio, amount, type] of [
    [1, 0.6, 'sine'],
    [2.001, 0.22, 'sine'],
    [3, 0.08, 'sine'],
    [1, 0.12, 'triangle'],
  ] as const) {
    const osc = parts.add(ctx.createOscillator());
    osc.type = type;
    osc.frequency.value = f * ratio;
    const partial = gain(ctx, amount);
    chain(osc, partial, env);
    osc.start(when);
    osc.stop(when + length + 0.1);
  }
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(level, when + 0.012);
  env.gain.exponentialRampToValueAtTime(level * 0.35, when + 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, when + length);
}

function withRoom(ctx: BaseAudioContext, out: AudioNode, wetness: number): GainNode {
  const input = gain(ctx, 1);
  input.connect(out);
  const space = room(ctx, 4);
  chain(input, space, gain(ctx, wetness), out);
  return input;
}

const softKeys: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    const input = withRoom(ctx, out, 0.8);
    // C major pentatonic: no note clashes with another.
    const scale = [60, 62, 64, 67, 69, 72, 74, 76, 79];
    let last = 67;
    every(
      ctx,
      parts,
      () => pick([0.9, 1.2, 1.6, 2.4]),
      (when) => {
        const near = scale.filter((note) => Math.abs(note - last) <= 7 && note !== last);
        last = pick(near.length ? near : scale);
        keyNote(ctx, input, parts, when, last, 0.22);
        if (Math.random() < 0.25) keyNote(ctx, input, parts, when, pick([48, 52, 55]), 0.16, 6);
      },
      0.3,
    );
  });

function pad(ctx: BaseAudioContext, out: AudioNode, parts: Parts, level: number): void {
  const input = withRoom(ctx, out, 0.9);
  const tone = filter(ctx, 'lowpass', 750, 0.4);
  tone.connect(input);
  parts.add(wobble(ctx, tone.frequency, 0.05, 250));
  const chords = [
    [48, 55, 60, 64, 71],
    [45, 52, 57, 60, 67],
    [41, 48, 57, 60, 64],
    [43, 50, 55, 59, 62],
  ];
  let index = 0;
  every(
    ctx,
    parts,
    () => 10,
    (when) => {
      for (const note of chords[index % chords.length]) {
        const env = gain(ctx, 0);
        env.connect(tone);
        for (const cents of [-7, 7]) {
          const osc = parts.add(ctx.createOscillator());
          osc.type = 'sawtooth';
          osc.frequency.value = midi(note);
          osc.detune.value = cents;
          osc.connect(env);
          osc.start(when);
          osc.stop(when + 16);
        }
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(level, when + 4);
        env.gain.setValueAtTime(level, when + 10);
        env.gain.linearRampToValueAtTime(0, when + 15.5);
      }
      index++;
    },
    0.1,
  );
}

const ambient: Builder = (ctx) => layer(ctx, (out, parts) => pad(ctx, out, parts, 0.042));

/** A singing bowl: inharmonic partials, each slowly beating against a twin. */
export function bowl(ctx: BaseAudioContext, out: AudioNode, when: number, base: number, level: number, length = 12): void {
  for (const [ratio, amount, decay] of [
    [1, 1, 1],
    [2.76, 0.5, 0.7],
    [5.4, 0.22, 0.45],
    [8.93, 0.1, 0.3],
  ]) {
    const env = gain(ctx, 0);
    env.connect(out);
    for (const beat of [0, rand(0.6, 1.6)]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = base * ratio + beat;
      osc.connect(env);
      osc.start(when);
      osc.stop(when + length * decay + 0.2);
    }
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(level * amount * 0.5, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + length * decay);
  }
}

const bowls: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    const input = withRoom(ctx, out, 0.6);
    const drone = parts.add(ctx.createOscillator());
    drone.frequency.value = 65.41;
    chain(drone, gain(ctx, 0.04), input);
    drone.start();
    every(ctx, parts, () => rand(7, 14), (when) => bowl(ctx, input, when, pick([196, 220, 261.63, 293.66, 329.63]), 0.2), 0.2);
  });

const space: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    const input = withRoom(ctx, out, 1.2);
    for (const [f, level] of [
      [55, 0.07],
      [82.41, 0.045],
      [110, 0.03],
    ]) {
      const osc = parts.add(ctx.createOscillator());
      osc.frequency.value = f;
      parts.add(wobble(ctx, osc.detune, rand(0.03, 0.08), 8));
      chain(osc, gain(ctx, level), input);
      osc.start();
    }
    const solar = filter(ctx, 'bandpass', 300, 1.5);
    chain(parts.add(noise(ctx, 'brown')), solar, gain(ctx, 0.12), input);
    parts.add(wobble(ctx, solar.frequency, 0.02, 180));
    // Far-off shimmering tones.
    every(
      ctx,
      parts,
      () => rand(3, 8),
      (when) => {
        const osc = parts.add(ctx.createOscillator());
        osc.frequency.value = pick([880, 987.77, 1108.73, 1318.51, 1661.22]);
        const env = gain(ctx, 0);
        const panner = ctx.createStereoPanner();
        panner.pan.value = rand(-0.8, 0.8);
        chain(osc, env, panner, input);
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(0.012, when + 3);
        env.gain.linearRampToValueAtTime(0, when + 8);
        osc.start(when);
        osc.stop(when + 8.2);
      },
      1,
    );
  });

const nature: Builder = (ctx) =>
  layer(ctx, (out, parts) => {
    pad(ctx, out, parts, 0.03);
    const stream = gain(ctx, 0.45);
    stream.connect(out);
    for (const frequency of [700, 1600]) {
      const level = gain(ctx, 0.15);
      chain(parts.add(noise(ctx, 'pink')), filter(ctx, 'bandpass', frequency, 1.4), level, stream);
      drift(ctx, parts, level.gain, 0.04, 0.3, 0.4);
    }
    birds(ctx, out, parts, 0.6);
  });

// ---------- Catalogue ----------

export type SoundKind = 'sound' | 'music';

export type SoundEntry = {
  id: string;
  kind: SoundKind;
  title: string;
  line: string;
  icon: string;
  build: Builder;
};

export const soundCatalogue: readonly SoundEntry[] = [
  { id: 'rain', kind: 'sound', title: 'Rain', line: 'Steady rain on leaves and stone.', icon: 'rain', build: rain },
  { id: 'storm', kind: 'sound', title: 'Thunderstorm', line: 'Heavy rain with thunder far away.', icon: 'storm', build: storm },
  { id: 'river', kind: 'sound', title: 'River', line: 'Water running over stones.', icon: 'river', build: river },
  { id: 'ocean', kind: 'sound', title: 'Ocean', line: 'Slow waves on a long shore.', icon: 'wave', build: ocean },
  { id: 'forest', kind: 'sound', title: 'Forest', line: 'A breeze in the trees, and birds.', icon: 'trees', build: forest },
  { id: 'campfire', kind: 'sound', title: 'Campfire', line: 'A low fire, crackling.', icon: 'flame', build: campfire },
  { id: 'wind', kind: 'sound', title: 'Wind', line: 'Wind rising and falling.', icon: 'wind', build: wind },
  { id: 'white', kind: 'sound', title: 'White noise', line: 'Even and bright; covers other sounds.', icon: 'noise', build: white },
  { id: 'brown', kind: 'sound', title: 'Brown noise', line: 'Deep and soft, like a distant waterfall.', icon: 'noise', build: brown },
  { id: 'soft-keys', kind: 'music', title: 'Soft keys', line: 'Gentle notes, unhurried, never repeating.', icon: 'keys', build: softKeys },
  { id: 'ambient', kind: 'music', title: 'Ambient', line: 'Warm chords that slowly change.', icon: 'bars', build: ambient },
  { id: 'nature', kind: 'music', title: 'Nature blend', line: 'Soft chords with a stream and birds.', icon: 'leaf', build: nature },
  { id: 'space', kind: 'music', title: 'Deep space', line: 'Low drones and faraway tones.', icon: 'planet', build: space },
  { id: 'bowls', kind: 'music', title: 'Singing bowls', line: 'Bowls ringing out, now and then.', icon: 'bowl', build: bowls },
];

export function soundEntry(id: string | null | undefined): SoundEntry | undefined {
  return soundCatalogue.find((entry) => entry.id === id);
}
