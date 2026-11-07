import { useEffect } from 'react';

/*
 * Keeps the screen on while something is being timed (a study block, rests between sets, a nap timer), and lets it
 * sleep again after. Asked again when the page comes back, since browsers let go of it on leaving.
 */

type Sentinel = { release: () => Promise<void> };
type WakeLock = { request: (type: 'screen') => Promise<Sentinel> };

export function useWakeLock(on: boolean): void {
  useEffect(() => {
    const wake = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
    if (!on || !wake) return;
    let held: Sentinel | undefined;
    let done = false;
    const hold = () =>
      void wake
        .request('screen')
        .then((sentinel) => {
          if (done) void sentinel.release().catch(() => undefined);
          else held = sentinel;
        })
        .catch(() => undefined);
    hold();
    const again = () => document.visibilityState === 'visible' && hold();
    document.addEventListener('visibilitychange', again);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', again);
      void held?.release().catch(() => undefined);
    };
  }, [on]);
}
