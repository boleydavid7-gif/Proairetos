import { useEffect, useRef } from 'react';

type Turn = { canNext: boolean; canPrevious: boolean; onNext: () => void; onPrevious: () => void };

/** How far from either side of the screen a touch belongs to the back swipe, not to turning. */
const EDGE = 24;
const SKIP = 'button, a, input, select, textarea, label, [role="slider"], .theoria-selection-tools, .theoria-lookup';

/**
 * Turning by swiping sideways, for the reader's text and a PDF's pages. Touch and pen only (a mouse drag selects
 * text); the page follows the finger and turns on a third of its width or a flick, else springs back. Vertical
 * movement is left to scrolling, and a drag that started a text selection never turns.
 */
export function useTurnSwipe(area: React.RefObject<HTMLElement | null>, page: () => HTMLElement | null | undefined, turn: Turn) {
  const latest = useRef(turn);
  latest.current = turn;
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    let start: { x: number; y: number; t: number; id: number } | undefined;
    let sideways: boolean | undefined;
    let dx = 0;
    const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const place = (x: number, settle: boolean) => {
      const target = page();
      if (!target) return;
      target.style.transition = settle && !reduced() ? 'translate var(--ll-calm, 320ms) var(--ll-spring, ease-out), opacity var(--ll-calm, 320ms) ease' : 'none';
      target.style.translate = x ? `${x}px 0` : '';
      target.style.opacity = x ? String(Math.max(0.55, 1 - Math.abs(x) / (element.clientWidth * 1.4))) : '';
    };
    const selecting = () => Boolean(window.getSelection()?.toString().trim());
    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      if (event.clientX < EDGE || event.clientX > window.innerWidth - EDGE) return;
      if ((event.target as Element | null)?.closest(SKIP)) return;
      start = { x: event.clientX, y: event.clientY, t: event.timeStamp, id: event.pointerId };
      sideways = undefined;
      dx = 0;
    };
    const move = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      const x = event.clientX - start.x;
      const y = event.clientY - start.y;
      if (sideways === undefined) {
        if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
        sideways = Math.abs(x) > Math.abs(y) * 1.4 && !selecting();
        if (!sideways) { start = undefined; return; }
      }
      const { canNext, canPrevious } = latest.current;
      const open = x < 0 ? canNext : canPrevious;
      dx = open ? x : x * 0.25;
      place(dx, false);
    };
    const up = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      const began = start;
      start = undefined;
      if (!sideways) return;
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - began.t);
      const far = Math.abs(dx) > element.clientWidth / 3 || (speed > 0.45 && Math.abs(dx) > 40);
      const { canNext, canPrevious, onNext, onPrevious } = latest.current;
      if (event.type === 'pointerup' && far && !selecting()) {
        if (dx < 0 && canNext) { place(0, false); onNext(); return; }
        if (dx > 0 && canPrevious) { place(0, false); onPrevious(); return; }
      }
      place(0, true);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
    };
  }, [area, page]);
}

/** Left and right arrow keys turn too, never while typing. */
export function useTurnKeys(turn: Turn, on = true) {
  const latest = useRef(turn);
  latest.current = turn;
  useEffect(() => {
    if (!on) return;
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if ((event.target as Element | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const { canNext, canPrevious, onNext, onPrevious } = latest.current;
      if (event.key === 'ArrowRight' && canNext) { event.preventDefault(); onNext(); }
      if (event.key === 'ArrowLeft' && canPrevious) { event.preventDefault(); onPrevious(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [on]);
}
