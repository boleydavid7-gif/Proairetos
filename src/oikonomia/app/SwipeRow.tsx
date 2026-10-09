import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CheckIcon } from './icons';

const REVEAL = 96;
const COMMIT = 0.38;

/**
 * A row that can be pulled to the left to do one thing (here, mark a bill paid). Pulling far enough does
 * it; letting go early puts the row back. Mouse and touch both work, and so does the left arrow key on
 * the focused row. Up and down still scroll the page.
 */
export default function SwipeRow({
  children,
  label,
  onSwipe,
}: {
  children: ReactNode;
  /** What the pull does, in a word: shown under the row. */
  label: string;
  onSwipe: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; width: number } | null>(null);
  const pulling = useRef(false);
  const moved = useRef(false);

  const finish = (go: boolean) => {
    start.current = null;
    pulling.current = false;
    if (go) {
      setLeaving(true);
      window.setTimeout(onSwipe, 180);
    } else {
      setDx(0);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' && !leaving) {
      event.preventDefault();
      finish(true);
    }
  };

  return (
    <div className={`oiko-swipe${leaving ? ' oiko-swipe--leaving' : ''}`} role="group" aria-label={`${label}: swipe left or press the left arrow`}>
      <div className="oiko-swipe__action" aria-hidden="true">
        <CheckIcon size={20} />
        <span>{label}</span>
      </div>
      <div
        className="oiko-swipe__front"
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
            // Decide once: a pull to the side starts the swipe; anything else is a scroll or a tap.
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
        // A pull is not a tap: the row underneath must not open after one.
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
    </div>
  );
}
