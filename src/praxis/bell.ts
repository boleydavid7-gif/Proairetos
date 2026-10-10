import { audio, buffer, gain, wakeAudio } from '../app/sound/engine';
import { BELL_FILE } from '../app/sound/soundscapes';

/*
 * The bell at the end of a block (or a break), handed to the audio clock when it starts, so it rings on time
 * with the screen locked while the page plays as media (`wakeAudio`), the same way Askesis rings its bells.
 */
let scheduled: AudioBufferSourceNode[] = [];
let out: GainNode | null = null;

export function cancelBell(): void {
  for (const source of scheduled) {
    try {
      source.stop();
    } catch {
      // Already rang.
    }
  }
  scheduled = [];
}

/** Whether a bell is waiting on the audio clock. */
export const bellWaiting = () => scheduled.length > 0;

/** Rings `times` soft bells `seconds` from now (call it from a tap, so phones allow the sound). */
export async function scheduleBell(seconds: number, times = 2): Promise<void> {
  cancelBell();
  wakeAudio();
  const data = await buffer(BELL_FILE).catch(() => undefined);
  if (!data) return;
  const ctx = audio();
  out ??= gain(ctx, 0.85);
  out.connect(ctx.destination);
  const at = ctx.currentTime + Math.max(0.05, seconds);
  for (let index = 0; index < times; index += 1) {
    const source = ctx.createBufferSource();
    source.buffer = data;
    source.connect(out);
    source.start(at + index * 2.2);
    source.onended = () => {
      scheduled = scheduled.filter((each) => each !== source);
    };
    scheduled.push(source);
  }
}

/** A notice when the time is up, if the person allowed notifications and the page is out of sight. */
export function endNotice(title: string, body: string): void {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
    new Notification(title, { body, icon: '/praxis/favicon.svg', tag: 'praxis-end' });
  } catch {
    // Some browsers only show notices from a service worker; the bell still rings.
  }
}
