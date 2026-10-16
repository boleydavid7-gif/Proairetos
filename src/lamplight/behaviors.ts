/*
 * Lamplight's behaviors, the parts of the system that are felt rather than seen, started once in every app (from
 * applyAppearance):
 *
 *   The large title. A page opens with its title large; as it scrolls under the top of the screen, a compact bar
 *   fades in carrying the title (and a back chevron when the page has a way back), as iOS does. Phones only.
 *
 *   The back swipe. In an installed app, a swipe from the left edge takes hold of the page: it follows the finger,
 *   and let go past a third of the way (or with a flick) it slides away and the place beneath comes forward; let go
 *   short and it springs back. Browsers and Android keep their own back gesture.
 *
 * Both work from the page as it is (its title, its back link), so no screen needs wiring. Reduced motion keeps the
 * bar and the swipe but drops the travel.
 */

const TITLE = [
  '.page-header__title',
  '.page-hero__title',
  '.home__title',
  '.hero__title',
  '.title',
  '.praxis-page-heading h1',
  '.theoria-heading h1',
  'main h1',
].join(', ');

const BACK = '.back-link, .page-hero__back, .theoria-back-button, .meditate-page__back, [data-back]';
const OUTSIDE = 'dialog, nav, .tab-bar, .ll-topbar, [data-no-topbar]';
const PAGE = '.app-shell__content, .page, main';
const PHONE = '(max-width: 61.99rem)';
/** Full-screen moments with no bar of their own to fold into. */
const FULL = '.theoria-reader-back, .sit-screen__leave, .focus-screen, .pause-screen, .guide';

let started = false;

export function startLamplightBehaviors(): void {
  if (started || typeof window === 'undefined' || typeof document === 'undefined' || typeof matchMedia !== 'function') return;
  started = true;
  largeTitle();
  backSwipe();
}

/** For an app whose back is a stack of its own (Proairetos's sheets and sub-screens). */
let swipeSource: { can: () => boolean; back: () => void } | undefined;
export function setSwipeBack(source: { can: () => boolean; back: () => void } | undefined): void {
  swipeSource = source;
}

function shown(el: Element): boolean {
  if (el.closest(OUTSIDE)) return false;
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

function first(selector: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(selector)].find(shown);
}

function reduced(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- The large title ----------

function largeTitle(): void {
  const phone = matchMedia(PHONE);
  const bar = document.createElement('div');
  bar.className = 'll-topbar';
  bar.setAttribute('aria-hidden', 'true');
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'll-topbar__back';
  back.tabIndex = -1;
  back.innerHTML =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  const words = document.createElement('span');
  words.className = 'll-topbar__title';
  bar.append(back, words);

  let title: HTMLElement | undefined;
  let frame = 0;

  back.addEventListener('click', () => {
    const control = first(BACK);
    if (control) control.click();
    else if (swipeSource?.can()) swipeSource.back();
  });

  const update = () => {
    frame = 0;
    if (!bar.isConnected) document.body.append(bar);
    if (!phone.matches || document.querySelector(FULL)) {
      bar.classList.remove('is-shown');
      return;
    }
    if (!title?.isConnected || !shown(title)) title = first(TITLE);
    const text = title?.textContent?.trim() ?? '';
    // The title has gone when its foot passes under the bar's.
    const under = title ? title.getBoundingClientRect().bottom < bar.offsetHeight : false;
    if (words.textContent !== text) words.textContent = text;
    bar.classList.toggle('is-shown', Boolean(text) && under);
    bar.classList.toggle('has-back', Boolean(first(BACK)) || Boolean(swipeSource?.can()));
  };
  const soon = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  addEventListener('scroll', soon, { passive: true, capture: true });
  addEventListener('resize', soon);
  addEventListener('popstate', () => {
    title = undefined;
    soon();
  });
  phone.addEventListener?.('change', soon);
  new MutationObserver(() => {
    if (!title?.isConnected) title = undefined;
    soon();
  }).observe(document.body, { childList: true, subtree: true });
  soon();
}

// ---------- The back swipe ----------

const EDGE = 24;

function backSwipe(): void {
  const standalone =
    matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!standalone && !('__PROAIRETOS_EDGE_SWIPE__' in window)) return;

  type Hold = { x: number; y: number; page?: HTMLElement; back?: () => void; going: boolean; samples: [number, number][] };
  let hold: Hold | null = null;

  const backFor = (): (() => void) | undefined => {
    if (swipeSource?.can()) return swipeSource.back;
    const control = first(BACK);
    return control ? () => control.click() : undefined;
  };

  addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0];
      if (!touch || touch.clientX > EDGE || document.querySelector('dialog[open]')) return;
      hold = { x: touch.clientX, y: touch.clientY, going: false, samples: [] };
    },
    { passive: true },
  );

  addEventListener(
    'touchmove',
    (event) => {
      const touch = event.touches[0];
      if (!hold || !touch) return;
      const dx = touch.clientX - hold.x;
      const dy = touch.clientY - hold.y;
      if (!hold.going) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > dx) {
          hold = null; // a scroll, not a swipe
          return;
        }
        if (dx < 10) return;
        hold.back = backFor();
        hold.page = first(PAGE);
        if (!hold.back || !hold.page) {
          hold = null;
          return;
        }
        hold.going = true;
        hold.page.classList.add('ll-swiping');
      }
      hold.samples.push([performance.now(), dx]);
      if (hold.samples.length > 6) hold.samples.shift();
      if (!reduced()) hold.page!.style.transform = `translate3d(${Math.max(0, dx)}px, 0, 0)`;
    },
    { passive: true },
  );

  const end = (event: TouchEvent) => {
    const current = hold;
    hold = null;
    if (!current?.going || !current.page || !current.back) return;
    const page = current.page;
    const touch = event.changedTouches[0];
    const dx = touch ? touch.clientX - current.x : 0;
    const [t0, x0] = current.samples[0] ?? [performance.now(), 0];
    const speed = (dx - x0) / Math.max(1, performance.now() - t0); // px per ms
    const go = dx > innerWidth / 3 || (speed > 0.5 && dx > 40);
    page.classList.remove('ll-swiping');
    if (!go) {
      page.classList.add('ll-springing');
      page.style.transform = '';
      setTimeout(() => page.classList.remove('ll-springing'), 420);
      return;
    }
    const finish = () => {
      const root = document.documentElement;
      root.dataset.swiped = '';
      current.back!();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          page.classList.remove('ll-leaving');
          page.style.transform = '';
        }),
      );
      setTimeout(() => delete root.dataset.swiped, 600);
    };
    if (reduced()) {
      finish();
      return;
    }
    page.classList.add('ll-leaving');
    page.style.transform = `translate3d(${innerWidth}px, 0, 0)`;
    setTimeout(finish, 180);
  };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });
}
