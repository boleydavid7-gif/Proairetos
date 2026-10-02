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
 * scrolled to the top. Tap outside, Escape, and the Close button are wired
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

    const down = (event: TouchEvent) => {
      const target = event.target as HTMLElement;
      if (element.scrollTop > 0 || target.closest('input, textarea, select')) return;
      startY = event.touches[0]?.clientY ?? null;
      dy = 0;
    };
    const move = (event: TouchEvent) => {
      if (startY === null) return;
      dy = Math.max(0, (event.touches[0]?.clientY ?? startY) - startY);
      element.style.transition = 'none';
      element.style.transform = dy ? `translateY(${dy}px)` : '';
    };
    const up = () => {
      if (startY === null) return;
      element.style.transition = '';
      if (dy > DISMISS_DISTANCE) {
        // From where the finger let go, the rest of the way down.
        close();
      } else {
        element.style.transform = '';
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
