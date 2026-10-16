import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CheckIcon } from './icons';
import './swipe.css';

const REVEAL = 96;
const COMMIT = 0.38;

/**
 * A list row that can be pulled to the left to mark it (done, taken, in touch), like Oikonomia's bills. Pulling far
 * enough does it; letting go early puts the row back. The left arrow key on the focused row does the same, and up and
 * down still scroll. `className` is the row's own class (e.g. `chore`), put on the part that moves.
 */
export default function SwipeItem({ children, label, onSwipe, className, off = false }: { children: ReactNode; label: string; onSwipe: () => void; className: string; off?: boolean }) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; width: number } | null>(null);
  const pulling = useRef(false);
  const moved = useRef(false);

  if (off) return <li className={className}>{children}</li>;

  const finish = (go: boolean) => {
    start.current = null;
    pulling.current = false;
    if (go) {
      setLeaving(true);
      window.setTimeout(() => {
        onSwipe();
        // The same row may stay on the page (a chore that comes around again): bring it back in.
        setLeaving(false);
        setDx(0);
      }, 180);
    } else {
      setDx(0);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' && !leaving && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      finish(true);
    }
  };

  return (
    <li className={`swipe${leaving ? ' swipe--leaving' : ''}`} aria-keyshortcuts="ArrowLeft">
      <div className="swipe__action" aria-hidden="true">
        <CheckIcon size={20} />
        <span>{label}</span>
      </div>
      {/* The swipe's action for the row's long-press menu (lamplight/behaviors.ts), first in its list. */}
      <button type="button" hidden data-menu-first onClick={() => finish(true)}>
        {label}
      </button>
      <div
        className={`swipe__front ${className}`}
        style={{ transform: leaving ? 'translateX(-110%)' : `translateX(${dx}px)`, transition: pulling.current ? 'none' : undefined }}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          start.current = { x: event.clientX, y: event.clientY, width: event.currentTarget.getBoundingClientRect().width };
          moved.current = false;
        }}
        onPointerMove={(event) => {
          const from = start.current;
          if (!from || leaving) return;
          const across = event.clientX - from.x;
          const down = event.clientY - from.y;
          if (!pulling.current) {
            if (Math.abs(across) < 8 && Math.abs(down) < 8) return;
            if (Math.abs(down) > Math.abs(across) || across > 0) {
              start.current = null;
              return;
            }
            pulling.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          moved.current = true;
          setDx(Math.max(-REVEAL * 1.6, Math.min(0, across)));
        }}
        onPointerUp={(event) => {
          if (!pulling.current) {
            start.current = null;
            return;
          }
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          finish(-dx > (start.current?.width ?? 320) * COMMIT || -dx > REVEAL * 1.2);
        }}
        onPointerCancel={() => pulling.current && finish(false)}
        onClickCapture={(event) => {
          if (moved.current) {
            event.preventDefault();
            event.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {children}
      </div>
    </li>
  );
}
