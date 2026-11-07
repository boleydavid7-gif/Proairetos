import { tap } from '../feel';
import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { CheckIcon, MoonIcon, TrashIcon } from './icons';
import './swipe.css';

const COMMIT = 0.38;
const COMMIT_PX = 116;
/** A flick this fast (px per ms) past FLICK_PX acts even when the row has not gone far. */
const FLICK = 0.55;
const FLICK_PX = 36;
const OUT_MS = 220;
const COLLAPSE_MS = 200;
const BACK_MS = 320;
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A list row that can be pulled to the left to mark it (done, taken, in touch), like Oikonomia's bills. Pulling far
 * enough, or a flick, does it; letting go early springs the row back. The left arrow key on the focused row does the
 * same, and up and down still scroll. `className` is the row's own class (e.g. `chore`), put on the part that moves.
 * With `later`, a pull to the right (or the right arrow key) does that instead, as Mail's right swipe does; a row may
 * have only that.
 *
 * The row follows the finger by writing its transform straight onto the element in the next animation frame, never
 * through React state, so a pull costs no render; a row that acts slides out and its height closes before the action
 * runs, so the rows below glide up instead of jumping.
 */
export default function SwipeItem({
  children,
  label,
  onSwipe,
  className,
  off = false,
  tone = 'mark',
  as: Tag = 'li',
  later,
  frontRef,
}: {
  children: ReactNode;
  label?: string;
  onSwipe?: () => void;
  /** The pull to the right: its words and what it does. */
  later?: { label: string; onSwipe: () => void };
  /** The row's element: a list item, or a div in a group that is not a list. */
  as?: 'li' | 'div';
  className: string;
  off?: boolean;
  /** Mark (done, taken) or remove (a delete that offers undo, as in Reminders and Mail). */
  tone?: 'mark' | 'remove';
  /** The moving part, for a page that scrolls a row into view. */
  frontRef?: (element: HTMLElement | null) => void;
}) {
  const root = useRef<HTMLElement | null>(null);
  const front = useRef<HTMLDivElement | null>(null);
  const markAction = useRef<HTMLDivElement | null>(null);
  const laterAction = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; width: number; id: number; pulling: boolean; dx: number; armed: boolean; samples: { t: number; x: number }[] } | null>(null);
  const frame = useRef(0);
  const sides = useRef({ left: false, right: false });
  sides.current = { left: Boolean(onSwipe), right: Boolean(later) };
  const busy = useRef(false);
  const moved = useRef(false);

  // Touch is followed through touch events, which keep coming even when the browser takes a slanted pull for a scroll
  // (pointer events are cancelled then). A thumb's pull is never level, so the row decides, not the browser: once a
  // touch moves more sideways than up or down (and that side has an action), the touch is held so the page stays still;
  // a touch that moves up or down first scrolls the page as usual. Mouse and pen use pointer events below.
  const handlers = useRef<{ start: (x: number, y: number, t: number, id: number) => void; move: (x: number, y: number, t: number) => void; end: () => void; cancel: () => void } | null>(null);
  useEffect(() => {
    const row = root.current;
    if (!row || off) return;
    const start = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch) return handlers.current?.cancel();
      handlers.current?.start(touch.clientX, touch.clientY, event.timeStamp, -1);
    };
    const move = (event: TouchEvent) => {
      const d = drag.current;
      const touch = event.touches[0];
      if (!d || d.id !== -1 || !touch) return;
      const across = Math.abs(touch.clientX - d.x);
      const sideways = across > 4 && across > Math.abs(touch.clientY - d.y) && (touch.clientX > d.x ? sides.current.right : sides.current.left);
      if ((d.pulling || sideways) && event.cancelable) event.preventDefault();
      handlers.current?.move(touch.clientX, touch.clientY, event.timeStamp);
    };
    const end = () => {
      if (drag.current?.id === -1) handlers.current?.end();
    };
    row.addEventListener('touchstart', start, { passive: true });
    row.addEventListener('touchmove', move, { passive: false });
    row.addEventListener('touchend', end);
    row.addEventListener('touchcancel', end);
    return () => {
      row.removeEventListener('touchstart', start);
      row.removeEventListener('touchmove', move);
      row.removeEventListener('touchend', end);
      row.removeEventListener('touchcancel', end);
    };
  }, [off]);

  if (off) return <Tag ref={frontRef} className={className}>{children}</Tag>;

  const actionFor = (side: -1 | 1) => (side === -1 ? onSwipe : later?.onSwipe);

  // Draws the row at `dx`: the transform, which action shows, and whether letting go now would act.
  const paint = (dx: number, armed: boolean) => {
    const el = front.current;
    if (!el) return;
    el.style.transform = `translate3d(${dx}px, 0, 0)`;
    if (markAction.current) markAction.current.style.opacity = dx < 0 ? '1' : '0';
    if (laterAction.current) laterAction.current.style.opacity = dx > 0 ? '1' : '0';
    root.current?.classList.toggle('swipe--armed', armed);
    root.current?.classList.toggle('swipe--moving', dx !== 0);
  };

  const settle = () => {
    const el = front.current;
    const row = root.current;
    if (el) {
      el.style.transition = '';
      el.style.transform = '';
    }
    if (row) {
      row.style.transition = '';
      row.style.height = '';
      row.style.opacity = '';
      row.classList.remove('swipe--moving', 'swipe--armed', 'swipe--leaving');
    }
    if (markAction.current) markAction.current.style.opacity = '0';
    if (laterAction.current) laterAction.current.style.opacity = '0';
    busy.current = false;
  };

  const springBack = () => {
    const el = front.current;
    if (!el) return;
    if (reducedMotion()) return settle();
    el.style.transition = `transform ${BACK_MS}ms var(--ll-spring, ${EASE_OUT})`;
    paint(0, false);
    root.current?.classList.add('swipe--moving');
    window.setTimeout(() => {
      if (!drag.current) settle();
    }, BACK_MS);
  };

  // Slides the row out on the side it went, closes the space it held, then acts. If the row stays on the page
  // afterwards (a chore that comes round again, or undo brings it back), it is put back in place.
  const act = (side: -1 | 1) => {
    const run = actionFor(side);
    const el = front.current;
    const row = root.current;
    if (!run || !el || !row || busy.current) return springBack();
    busy.current = true;
    if (reducedMotion()) {
      run();
      settle();
      return;
    }
    row.classList.add('swipe--leaving', 'swipe--moving');
    el.style.transition = `transform ${OUT_MS}ms ${EASE_OUT}`;
    paint(side * (row.getBoundingClientRect().width + 24), true);
    window.setTimeout(() => {
      row.style.height = `${row.getBoundingClientRect().height}px`;
      void row.offsetHeight;
      row.style.transition = `height ${COLLAPSE_MS}ms ${EASE_OUT}, opacity ${COLLAPSE_MS}ms ease`;
      row.style.height = '0px';
      row.style.opacity = '0';
      window.setTimeout(() => {
        run();
        requestAnimationFrame(() => settle());
      }, COLLAPSE_MS);
    }, OUT_MS);
  };

  const start = (x: number, y: number, t: number, id: number) => {
    if (busy.current) return;
    const width = front.current?.getBoundingClientRect().width ?? 320;
    drag.current = { x, y, width, id, pulling: false, dx: 0, armed: false, samples: [{ t, x }] };
    moved.current = false;
  };

  // Returns false when the pull turned out to be up or down, or toward a side with nothing to do.
  const move = (x: number, y: number, t: number): boolean => {
    const d = drag.current;
    if (!d) return false;
    const across = x - d.x;
    const down = y - d.y;
    if (!d.pulling) {
      if (Math.abs(across) < 8 && Math.abs(down) < 8) return true;
      if (Math.abs(down) > Math.abs(across) || !actionFor(across > 0 ? 1 : -1)) {
        drag.current = null;
        return false;
      }
      d.pulling = true;
      moved.current = true;
      if (front.current) front.current.style.transition = 'none';
    }
    // The finger's own distance, minus the few pixels it took to be sure this was a sideways pull; a direction with no
    // action holds at the edge with a little give.
    const raw = across - Math.sign(across) * 8;
    const allowed = actionFor(raw > 0 ? 1 : -1);
    d.dx = allowed ? raw : raw * 0.12;
    d.samples.push({ t, x });
    if (d.samples.length > 5) d.samples.shift();
    const armed = Boolean(allowed) && (Math.abs(d.dx) > d.width * COMMIT || Math.abs(d.dx) > COMMIT_PX);
    if (armed !== d.armed) {
      d.armed = armed;
      if (armed) tap();
    }
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => paint(d.dx, d.armed));
    return true;
  };

  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.pulling) return;
    cancelAnimationFrame(frame.current);
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const speed = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const side: -1 | 1 = d.dx < 0 ? -1 : 1;
    const flicked = Math.abs(speed) > FLICK && Math.sign(speed) === side && Math.abs(d.dx) > FLICK_PX;
    if ((d.armed || flicked) && actionFor(side)) act(side);
    else springBack();
  };

  const cancel = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.pulling) springBack();
  };
  handlers.current = { start, move: (x, y, t) => void move(x, y, t), end, cancel };

  // Mouse and pen; touch is followed above.
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    start(event.clientX, event.clientY, event.timeStamp, event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const wasPulling = d.pulling;
    if (move(event.clientX, event.clientY, event.timeStamp) && !wasPulling && drag.current?.pulling) event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    end();
  };
  const onPointerCancel = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.id === event.pointerId) cancel();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (busy.current || event.target instanceof HTMLInputElement) return;
    const side = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (side && actionFor(side)) {
      event.preventDefault();
      act(side);
    }
  };
  const keys = [onSwipe && 'ArrowLeft', later && 'ArrowRight'].filter(Boolean).join(' ');

  return (
    // The whole row takes the pull, its menu button included, so a pull may start anywhere on it.
    <Tag
      ref={(element: HTMLElement | null) => {
        root.current = element;
      }}
      className={`swipe swipe--${tone}`}
      aria-keyshortcuts={keys || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={(event) => {
        if (moved.current) {
          event.preventDefault();
          event.stopPropagation();
          moved.current = false;
        }
      }}
    >
      {/* Shown only while the row is pulled, so it never shows through a row's own gaps. */}
      {onSwipe && (
        <div ref={markAction} className="swipe__action" aria-hidden="true" style={{ opacity: 0 }}>
          {tone === 'remove' ? <TrashIcon size={20} /> : <CheckIcon size={20} />}
          <span>{label}</span>
        </div>
      )}
      {later && (
        <div ref={laterAction} className="swipe__action swipe__action--later" aria-hidden="true" style={{ opacity: 0 }}>
          <MoonIcon size={20} />
          <span>{later.label}</span>
        </div>
      )}
      {/* The swipes' actions for the row's long-press menu (lamplight/behaviors.ts), first in its list. */}
      {onSwipe && (
        <button type="button" hidden data-menu-first onClick={() => act(-1)}>
          {label}
        </button>
      )}
      {later && (
        <button type="button" hidden data-menu-first onClick={() => act(1)}>
          {later.label}
        </button>
      )}
      <div
        ref={(element) => {
          front.current = element;
          frontRef?.(element);
        }}
        className={`swipe__front ${className}`}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </Tag>
  );
}
