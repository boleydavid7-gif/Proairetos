import { flushSync } from 'react-dom';
import type { AppRoute } from './routes/routeTypes';

/**
 * Moving between places, animated with the browser's view transitions: the
 * old view is captured as a picture and slides away as the new one comes
 * in, so nothing fixed on a page (Today's landscape, the lake) comes
 * loose. Where the browser has no view transitions, or the person asks
 * for less motion, the change is immediate and the page simply fades in.
 *
 * `page` moves the whole page (the tab bar stays still); `panel` moves only
 * the `.vt-panel` under a page's own tabs.
 */
export type Direction = 'left' | 'right' | 'forward' | 'back';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export function canTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as ViewTransitionDocument).startViewTransition === 'function' &&
    !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

export function transition(direction: Direction, update: () => void, scope: 'page' | 'panel' = 'page'): void {
  if (!canTransition()) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.nav = scope === 'panel' ? `panel-${direction}` : direction;
  const running = (document as ViewTransitionDocument).startViewTransition!(() => flushSync(update));
  running.finished.finally(() => {
    if (root.dataset.nav?.endsWith(direction)) delete root.dataset.nav;
  });
}

/** The tabs in the bar, left to right; Days ahead's calendar sits just right of its list. */
const order: readonly AppRoute[] = ['today', 'reflect', 'plan', 'calendar', 'capture', 'compass'];

/** Which way a move between routes goes: along the tab bar, or into and out of a page. */
export function directionBetween(from: AppRoute, to: AppRoute): Direction {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a >= 0 && b >= 0) return b > a ? 'right' : 'left';
  if (a >= 0) return 'forward';
  if (b >= 0) return 'back';
  return 'forward';
}

/** For a page's own tabs: which way the content moves, by their order. */
export function directionAlong<T>(tabs: readonly T[], from: T, to: T): Direction {
  return tabs.indexOf(to) > tabs.indexOf(from) ? 'right' : 'left';
}
