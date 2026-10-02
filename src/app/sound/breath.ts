import type { BreathStepKind } from '../../core/meditate/breathing';
import { chain, filter, gain, noise } from './engine';
import { bowl } from './soundscapes';

/**
 * A soft breath, made from filtered noise: the in-breath brightens and
 * swells, the out-breath darkens and falls away. Holds are silent.
 */
export function breathSound(ctx: BaseAudioContext, out: AudioNode, kind: BreathStepKind, when: number, seconds: number): void {
  if (kind !== 'in' && kind !== 'out') return;
  const source = noise(ctx, 'pink');
  const band = filter(ctx, 'bandpass', kind === 'in' ? 650 : 950, 1.1);
  const air = filter(ctx, 'highpass', 250);
  const env = gain(ctx, 0);
  chain(source, air, band, env, out);
  const end = when + seconds;
  if (kind === 'in') {
    band.frequency.setValueAtTime(650, when);
    band.frequency.linearRampToValueAtTime(1400, end);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(1.2, when + seconds * 0.8);
    env.gain.linearRampToValueAtTime(0, end);
  } else {
    band.frequency.setValueAtTime(950, when);
    band.frequency.linearRampToValueAtTime(420, end);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(1.3, when + 0.35);
    env.gain.linearRampToValueAtTime(0, end);
  }
  source.stop(end + 0.1);
}

/** A bell to begin and end a sit. */
export function bell(ctx: BaseAudioContext, out: AudioNode, when: number): void {
  bowl(ctx, out, when, 261.63, 0.35, 14);
}
