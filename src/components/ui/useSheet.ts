import { useEffect, useRef } from 'react';
import { useBackHandler } from '../../app/back/backStack';

const DISMISS_DISTANCE = 110;

/**
 * Everything a bottom sheet needs to be easy to leave: opens as a modal,
 * closes on the system back gesture, and closes on a swipe down when
 * scrolled to the top. Tap outside, Escape, and the Close button are wired
 * by each sheet through `dialog`.
 */
export function useSheet() {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => dialog.current?.close();

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
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
        element.style.transform = 'translateY(100%)';
        window.setTimeout(() => dialog.current?.close(), 150);
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
