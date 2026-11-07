import { audio, buffer, gain } from '../../app/sound/engine';
import { BELL_FILE } from '../../app/sound/soundscapes';
import { BELL_GAP, type Cue } from '../core/cues';
import { duckAt, unduck } from './music';

/*
 * The session's bells, all handed to the audio clock when it starts (and
 * again after a pause or on looking back at the screen, from where it is).
 * The audio clock keeps time with the screen locked, as long as the page
 * plays as media (`wakeAudio`), so the bells arrive on time in a pocket.
 */
let scheduled: AudioBufferSourceNode[] = [];
let out: GainNode | null = null;

export function cancelCues(): void {
  for (const source of scheduled) {
    try {
      source.stop();
    } catch {
      // Already played.
    }
  }
  scheduled = [];
  unduck();
}

/** Schedules every cue still to come, `elapsed` seconds into the session. */
export async function scheduleCues(cues: readonly Cue[], elapsed: number): Promise<void> {
  cancelCues();
  const data = await buffer(BELL_FILE).catch(() => undefined);
  if (!data) return;
  const ctx = audio();
  out ??= gain(ctx, 0.9);
  out.connect(ctx.destination);
  const now = ctx.currentTime;
  for (const cue of cues) {
    const wait = cue.at - elapsed;
    if (wait < -0.5) continue;
    const at = now + Math.max(0.05, wait);
    duckAt(at, cue.bells);
    for (let i = 0; i < cue.bells; i += 1) {
      const source = ctx.createBufferSource();
      source.buffer = data;
      source.playbackRate.value = cue.rate;
      source.connect(out);
      source.start(at + i * BELL_GAP);
      scheduled.push(source);
    }
  }
}
