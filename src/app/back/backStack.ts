import { useEffect, useRef } from 'react';

/**
 * One back gesture closes the topmost thing: a sheet, a full-screen moment,
 * or a sub-screen. Each registers here when it opens and adds a browser
 * history entry, so Android's back button, the browser's back, and our own
 * edge swipe all go through the same path.
 */
type Entry = { id: number; close: () => void };

const stack: Entry[] = [];
let nextId = 0;
let skipPops = 0;
let listening = false;
// History steps released by closes in this moment, not yet removed. A sheet
// that opens in the same moment (one closing, the next opening) reuses one
// instead, so back-then-forward never races and a back press never leaves the app.
let releasedSteps = 0;
let flushScheduled = false;

function onPop() {
  if (skipPops > 0) {
    skipPops--;
    return;
  }
  const top = stack.pop();
  top?.close();
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', onPop);
}

function flushReleased() {
  flushScheduled = false;
  if (releasedSteps === 0) return;
  const steps = releasedSteps;
  releasedSteps = 0;
  skipPops++;
  history.go(-steps);
}

/** Opens a back step. Returns a release for when the thing closes some other way. */
export function pushBack(close: () => void): () => void {
  listen();
  const entry = { id: ++nextId, close };
  stack.push(entry);
  if (releasedSteps > 0) {
    releasedSteps--; // reuse a step just released
  } else {
    history.pushState({ proairetosBack: entry.id }, '');
  }
  return () => {
    const index = stack.indexOf(entry);
    if (index === -1) return; // already closed by a back gesture
    stack.splice(index, 1);
    releasedSteps++;
    if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(flushReleased, 0);
    }
  };
}

/** Goes back one step, as the system back would. */
export function goBack(): boolean {
  if (stack.length === 0) return false;
  history.back();
  return true;
}

export function canGoBack(): boolean {
  return stack.length > 0;
}

/** While `active`, a back gesture calls `close`. */
export function useBackHandler(active: boolean, close: () => void) {
  const latest = useRef(close);
  latest.current = close;

  useEffect(() => {
    if (!active) return;
    return pushBack(() => latest.current());
  }, [active]);
}
