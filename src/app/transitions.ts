import { useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { AppRoute } from './routes/routeTypes';

/**
 * Moving between places, animated with the browser's view transitions: the
 * old view is captured as a picture and slides away as the new one comes
 * in, so nothing fixed on a page (Today's landscape, the lake) comes
 * loose. Where the browser has no view transitions, or the person asks
 * for less motion, the change is immediate and the page simply fades in.
 *
 * `page` moves the whole page (the tab bar stays still). `panel` is for a
 * page's own tabs: no snapshot at all (Safari tinted snapshots of filtered
 * photos green); the new `.vt-panel` simply slides in from the side tapped.
 */
export type Direction = 'left' | 'right' | 'forward' | 'back';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void>; skipTransition?: () => void };
};
type ViewTransitionHandle = { finished: Promise<void>; skipTransition?: () => void };

export function canTransition(): boolean {
  // The companion shells still have their own root-level transition rules. On iOS Safari and
  // embedded web views those rules can leave the document snapshot moving after navigation,
  // which looks like the new page falling forever. Keep their normal keyed-page enter motion,
  // but commit the route without a document-wide snapshot. Proairetos' app shell has the
  // stable, content-only transition setup below and continues to use view transitions.
  if (typeof document !== 'undefined' && document.querySelector('.shell, .hydros-shell, .praxis-app, .theoria-app')) {
    return false;
  }
  return (
    typeof document !== 'undefined' &&
    typeof (document as ViewTransitionDocument).startViewTransition === 'function' &&
    !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

let panelTimer: number | undefined;
let enterTimer: number | undefined;

/**
 * For moves made without a snapshot (the add-on apps, where Safari left document snapshots sliding): the new page
 * enters from the side the move came from. The mark is set before the new page mounts and only sets where it starts
 * (`--ll-enter-x`, motion.css), so lifting it afterwards never restarts the animation.
 */
export function markEnter(direction: Direction): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.enter = direction;
  window.clearTimeout(enterTimer);
  enterTimer = window.setTimeout(() => delete root.dataset.enter, 700);
}

/*
 * The shared element: going into a page from a card or row, the thing tapped grows into the new page's head, so
 * the card is seen to open into its page. The last tap is noted (capture phase, so every app gets it without
 * wiring); a forward move within a moment of it names that card and the new page's head alike, and the browser
 * morphs one into the other while the rest of the page pushes in as before.
 */
const MORPH = 'll-morph';
const SOURCE = '.card, .row, .ll-row, .check-row, .place-row, li, [data-morph]';
const HEAD = '[data-morph-head], .detail-head, .page-header__title, .page-hero__title, h1, .title';
let tapped: { el: Element; at: number } | undefined;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const source = target?.closest('a, button, [role="button"]')?.closest(SOURCE);
      tapped = source && !source.closest('nav, .tab-bar, dialog') ? { el: source, at: Date.now() } : undefined;
    },
    true,
  );
}

function morphSource(): HTMLElement | undefined {
  const last = tapped;
  tapped = undefined;
  if (!last || Date.now() - last.at > 800 || !(last.el instanceof HTMLElement) || !last.el.isConnected) return undefined;
  const box = last.el.getBoundingClientRect();
  // Something off screen or as large as the screen gains nothing from growing into a head.
  if (box.bottom < 0 || box.top > innerHeight || box.height > innerHeight * 0.6) return undefined;
  return last.el;
}

function name(el: HTMLElement | null | undefined, value: string): void {
  if (el) el.style.setProperty('view-transition-name', value);
}

export function transition(direction: Direction, update: () => void, scope: 'page' | 'panel' = 'page'): void {
  const root = document.documentElement;
  if (scope === 'panel') {
    // The panel is keyed by its tab, so it mounts fresh and plays the slide once.
    root.dataset.panel = direction;
    window.clearTimeout(panelTimer);
    panelTimer = window.setTimeout(() => delete root.dataset.panel, 450);
    update();
    return;
  }
  if (!canTransition()) {
    markEnter(direction);
    update();
    return;
  }
  root.dataset.nav = direction;
  const source = direction === 'forward' ? morphSource() : undefined;
  let head: HTMLElement | null = null;
  name(source, MORPH);
  let running: ViewTransitionHandle;
  try {
    running = (document as ViewTransitionDocument).startViewTransition!(() => {
      name(source, '');
      flushSync(update);
      if (!source) return;
      head = [...document.querySelectorAll<HTMLElement>(HEAD)].find((each) => {
        const box = each.getBoundingClientRect();
        return box.height > 0 && box.top < innerHeight && !each.closest('nav, .tab-bar, dialog');
      }) ?? null;
      name(head, MORPH);
    });
  } catch {
    // Some WebViews expose the API but reject a transition at runtime. Commit the route normally in that case.
    name(source, '');
    delete root.dataset.nav;
    update();
    return;
  }
  let cleaned = false;
  const clean = () => {
    if (cleaned) return;
    cleaned = true;
    name(head, '');
    if (root.dataset.nav?.endsWith(direction)) delete root.dataset.nav;
  };
  void running.finished.then(clean, clean);
  // Safari and embedded web views can expose View Transitions but fail to settle their promise. Never leave the
  // page's navigation state or a shared-element name attached indefinitely; the committed DOM remains usable.
  window.setTimeout(() => {
    if (cleaned) return;
    running.skipTransition?.();
    clean();
  }, 1000);
}

/**
 * For apps that switch views themselves (Praxis, Theoria): marks each change's direction just before the new view
 * paints. Places on the bar move sideways by their order; anything else is a page in front of them.
 */
export function useEnterMark<T>(view: T, tabs: readonly T[]): void {
  const last = useRef(view);
  useLayoutEffect(() => {
    const from = last.current;
    last.current = view;
    if (from === view) return;
    const a = tabs.indexOf(from);
    const b = tabs.indexOf(view);
    markEnter(a >= 0 && b >= 0 ? (b > a ? 'right' : 'left') : b >= 0 ? 'back' : 'forward');
    // The tabs are fixed per app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
}

/** The tabs in the bar, left to right; Days ahead's calendar sits just right of its list. */
const order: readonly AppRoute[] = ['today', 'reflect', 'plan', 'calendar', 'capture'];

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
