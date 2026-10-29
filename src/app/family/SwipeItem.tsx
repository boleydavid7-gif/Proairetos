import { tap } from '../feel';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CheckIcon, MoonIcon, TrashIcon } from './icons';
import './swipe.css';

const REVEAL = 96;
const COMMIT = 0.38;

/**
 * A list row that can be pulled to the left to mark it (done, taken, in touch), like Oikonomia's bills. Pulling far
 * enough does it; letting go early puts the row back. The left arrow key on the focused row does the same, and up and
 * down still scroll. `className` is the row's own class (e.g. `chore`), put on the part that moves. With `later`, a
 * pull to the right (or the right arrow key) does that instead, as Mail's right swipe does; a row may have only that.
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
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<0 | -1 | 1>(0);
  // Far enough that letting go will do it: the action lights and the phone gives one small tap as the line is crossed.
  const [armed, setArmed] = useState(false);
  const start = useRef<{ x: number; y: number; width: number } | null>(null);
  const pulling = useRef(false);
  const moved = useRef(false);

  if (off) return <Tag ref={frontRef} className={className}>{children}</Tag>;

  // -1 is the pull to the left (`onSwipe`), 1 the pull to the right (`later`).
  const actionFor = (side: -1 | 1) => (side === -1 ? onSwipe : later?.onSwipe);
  const finish = (side: 0 | -1 | 1) => {
    start.current = null;
    pulling.current = false;
    setArmed(false);
    const run = side ? actionFor(side) : undefined;
    if (side && run) {
      setLeaving(side);
      window.setTimeout(() => {
        run();
        // The same row may stay on the page (a chore that comes around again): bring it back in.
        setLeaving(0);
        setDx(0);
      }, 180);
    } else {
      setDx(0);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (leaving || event.target instanceof HTMLInputElement) return;
    const side = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (side && actionFor(side)) {
      event.preventDefault();
      finish(side);
    }
  };
  const keys = [onSwipe && 'ArrowLeft', later && 'ArrowRight'].filter(Boolean).join(' ');

  return (
    <Tag className={`swipe swipe--${tone}${leaving ? ' swipe--leaving' : ''}${armed ? ' swipe--armed' : ''}${dx || leaving ? ' swipe--moving' : ''}`} aria-keyshortcuts={keys || undefined}>
      {/* Shown only while the row is pulled, so it never shows through a row's own gaps. */}
      {onSwipe && (
        <div className="swipe__action" aria-hidden="true" style={{ opacity: dx < 0 || leaving === -1 ? 1 : 0 }}>
          {tone === 'remove' ? <TrashIcon size={20} /> : <CheckIcon size={20} />}
          <span>{label}</span>
        </div>
      )}
      {later && (
        <div className="swipe__action swipe__action--later" aria-hidden="true" style={{ opacity: dx > 0 || leaving === 1 ? 1 : 0 }}>
          <MoonIcon size={20} />
          <span>{later.label}</span>
        </div>
      )}
      {/* The swipes' actions for the row's long-press menu (lamplight/behaviors.ts), first in its list. */}
      {onSwipe && (
        <button type="button" hidden data-menu-first onClick={() => finish(-1)}>
          {label}
        </button>
      )}
      {later && (
        <button type="button" hidden data-menu-first onClick={() => finish(1)}>
          {later.label}
        </button>
      )}
      <div
        ref={frontRef}
        className={`swipe__front ${className}`}
        style={{ transform: leaving ? `translateX(${leaving * 110}%)` : `translateX(${dx}px)`, transition: pulling.current ? 'none' : undefined }}
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
            if (Math.abs(down) > Math.abs(across) || !actionFor(across > 0 ? 1 : -1)) {
              start.current = null;
              return;
            }
            pulling.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          moved.current = true;
          const next = Math.max(onSwipe ? -REVEAL * 1.6 : 0, Math.min(later ? REVEAL * 1.6 : 0, across));
          setDx(next);
          const over = Math.abs(next) > from.width * COMMIT || Math.abs(next) > REVEAL * 1.2;
          if (over !== armed) {
            setArmed(over);
            if (over) tap();
          }
        }}
        onPointerUp={(event) => {
          if (!pulling.current) {
            start.current = null;
            return;
          }
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          const far = Math.abs(dx) > (start.current?.width ?? 320) * COMMIT || Math.abs(dx) > REVEAL * 1.2;
          finish(far ? (dx < 0 ? -1 : 1) : 0);
        }}
        onPointerCancel={() => pulling.current && finish(0)}
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
    </Tag>
  );
}
