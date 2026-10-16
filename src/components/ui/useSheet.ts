import { useEffect, useRef } from 'react';
import { useBackHandler } from '../../app/back/backStack';

const DISMISS_DISTANCE = 110;
/** How long a sheet takes to glide away; matches `.sheet--closing` in 07-sheet.css. */
const CLOSE_MS = 220;

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Everything a bottom sheet needs to be easy to leave: opens as a modal,
 * closes on the system back gesture, and closes on a swipe down when
 * scrolled to the top (or a quick flick down), springing back when let go short. Tap outside, Escape, and the Close button are wired
 * by each sheet through `dialog`. Every way out glides the sheet down
 * first (instantly when the device asks for less motion).
 */
export function useSheet() {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const close = () => {
    const element = dialog.current;
    if (!element?.open || closing.current) return;
    if (reducedMotion()) {
      element.close();
      return;
    }
    closing.current = true;
    // A swiped panel goes on from where it was let go.
    if (panel.current) panel.current.style.transform = '';
    element.classList.add('sheet--closing');
    window.setTimeout(() => element.close(), CLOSE_MS);
  };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    // Escape glides out like every other way of leaving.
    const cancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    element.addEventListener('cancel', cancel);
    return () => element.removeEventListener('cancel', cancel);
  }, []);

  useBackHandler(true, close);

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    let startY: number | null = null;
    let dy = 0;
    let samples: [number, number][] = [];
    const sheet = dialog.current;

    const down = (event: TouchEvent) => {
      const target = event.target as HTMLElement;
      if (element.scrollTop > 0 || target.closest('input, textarea, select')) return;
      startY = event.touches[0]?.clientY ?? null;
      dy = 0;
      samples = [];
    };
    const move = (event: TouchEvent) => {
      if (startY === null) return;
      const raw = (event.touches[0]?.clientY ?? startY) - startY;
      // Down follows the finger; up gives a little and resists, as a held sheet does.
      dy = raw >= 0 ? raw : -Math.min(24, Math.sqrt(-raw) * 3);
      samples.push([performance.now(), raw]);
      if (samples.length > 6) samples.shift();
      element.style.transition = 'none';
      element.style.transform = dy ? `translateY(${dy}px)` : '';
      // The room brightens again as the sheet is pulled away.
      sheet?.style.setProperty('--sheet-pull', String(Math.max(0, Math.min(1, dy / (element.offsetHeight || 1)))));
    };
    const up = () => {
      if (startY === null) return;
      const [t0, y0] = samples[0] ?? [performance.now(), dy];
      const speed = (dy - y0) / Math.max(1, performance.now() - t0); // px per ms, down is positive
      element.style.transition = '';
      sheet?.style.removeProperty('--sheet-pull');
      if (dy > DISMISS_DISTANCE || (speed > 0.6 && dy > 24)) {
        // From where the finger let go, the rest of the way down: a flick is enough.
        close();
      } else {
        element.classList.add('sheet__panel--spring');
        element.style.transform = '';
        window.setTimeout(() => element.classList.remove('sheet__panel--spring'), 420);
      }
      startY = null;
    };

    element.addEventListener('touchstart', down, { passive: true });
    element.addEventListener('touchmove', move, { passive: true });
    element.addEventListener('touchend', up);
    element.addEventListener('touchcancel', up);
    return () => {
      element.removeEventListener('touchstart', down);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', up);
      element.removeEventListener('touchcancel', up);
    };
  }, []);

  return { dialog, panel, close };
}
