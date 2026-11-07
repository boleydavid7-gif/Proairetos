import { DOCKS } from './behaviors';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';

/*
 * One undo bar for the family: one offer at a time, kept above the pages so it stays while the person moves between
 * them, the same place, timing and look in every app. On phones it sits just above the dock at the foot of the screen
 * (measured, since each app's dock has its own height); on computers, bottom right.
 */

type Offer = { id: number; message: string; run?: () => unknown; leaving?: boolean };

/** How long an undo stays offered, and a plain message with nothing to undo. */
export const UNDO_SECONDS = 7;
export const SAY_SECONDS = 3;
const LEAVE_MS = 200;

let current: Offer | null = null;
let timer = 0;
let counter = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

function leave(id: number) {
  if (current?.id !== id) return;
  current = { ...current, leaving: true };
  changed();
  window.setTimeout(() => {
    if (current?.id !== id) return;
    current = null;
    changed();
  }, LEAVE_MS);
}

/** Offers to take a change back; a newer offer replaces this one. */
export function offerUndo(message: string, run?: () => unknown, seconds = UNDO_SECONDS): void {
  window.clearTimeout(timer);
  counter += 1;
  const id = counter;
  current = { id, message, run };
  changed();
  timer = window.setTimeout(() => leave(id), seconds * 1000);
}

/** A short message with no undo (a change that cannot be taken back, or plain news). */
export function say(message: string): void {
  offerUndo(message, undefined, SAY_SECONDS);
}

/** Puts the offer away at once (a page that took the change back by other means). */
export function clearUndo(): void {
  window.clearTimeout(timer);
  if (current) leave(current.id);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Where the dock's top edge rests (read from its layout, so a dock tucked away while reading counts where it comes
 * back to), and above it any bar standing on it (Proairetos's focus bar).
 */
function dockTop(): number | undefined {
  let top: number | undefined;
  for (const dock of document.querySelectorAll<HTMLElement>(DOCKS)) {
    if (!dock.offsetHeight || getComputedStyle(dock).position !== 'fixed') continue;
    if (dock.offsetTop > innerHeight / 2) top = Math.min(top ?? Infinity, dock.offsetTop);
  }
  for (let probe = (top ?? innerHeight) - 4, step = 0; step < 2; step += 1) {
    const bar = fixedAt(probe);
    if (!bar) break;
    const box = bar.getBoundingClientRect();
    if (box.top < innerHeight / 2 || box.top >= probe) break;
    top = box.top;
    probe = box.top - 4;
  }
  return top;
}

function fixedAt(y: number): Element | undefined {
  if (typeof document.elementFromPoint !== 'function') return undefined;
  for (let element = document.elementFromPoint(innerWidth / 2, y); element && element !== document.body; element = element.parentElement) {
    if (element.classList.contains('ll-undo')) return undefined;
    const position = getComputedStyle(element).position;
    if (position === 'fixed' || position === 'sticky') return element;
  }
  return undefined;
}

/** Takes the offered change back now (the Undo button, or ⌘Z / Ctrl+Z on a computer). */
function undoNow(): boolean {
  if (!current?.run || current.leaving) return false;
  window.clearTimeout(timer);
  const run = current.run;
  current = null;
  changed();
  void run();
  return true;
}

/** A field keeps ⌘Z for its own typing; anywhere else it takes back what the undo bar offers. */
function typing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

export function UndoBar() {
  const offer = useSyncExternalStore(subscribe, () => current);
  const canUndo = Boolean(offer?.run && !offer.leaving);
  useEffect(() => {
    if (!canUndo) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'z' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      if (typing(event.target)) return;
      if (undoNow()) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canUndo]);
  const [lift, setLift] = useState<number>();
  const id = offer?.id;
  useLayoutEffect(() => {
    if (id === undefined) return;
    const top = dockTop();
    setLift(top === undefined ? undefined : Math.round(innerHeight - top + 12));
  }, [id]);
  if (!offer) return null;
  return (
    <div
      className={`ll-snackbar ll-undo${offer.leaving ? ' is-leaving' : ''}`}
      role="status"
      key={offer.id}
      style={lift === undefined ? undefined : ({ '--ll-undo-lift': `${lift}px` } as CSSProperties)}
    >
      <span className="ll-snackbar__text">{offer.message}</span>
      {offer.run && (
        <button
          type="button"
          className="ll-snackbar__action"
          aria-keyshortcuts="Meta+Z Control+Z"
          onClick={() => undoNow()}
        >
          Undo
        </button>
      )}
    </div>
  );
}
