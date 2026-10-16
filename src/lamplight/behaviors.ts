/*
 * Lamplight's behaviors, the parts of the system that are felt rather than seen, started once in every app (from
 * applyAppearance):
 *
 *   The bar. On phones every page has one bar across the top: the app's name (or the way back) on the left, the
 *   page's actions and Settings on the right. The page's own title stays in the page and scrolls under it.
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

const BACK = '.back-link, .page-hero__back, .theoria-back-button, .meditate-page__back, .hydros-header .hydros-icon-button, [data-back]';
const OUTSIDE = 'dialog, nav, .tab-bar, .ll-topbar, [data-no-topbar]';
const PAGE = '.app-shell__content, .page, main';
const PHONE = '(max-width: 61.99rem)';
/** Full-screen moments with no bar of their own to fold into. */
const FULL = '.theoria-reader-back, .sit-screen__leave, .focus-screen, .pause-screen, .guide, .welcome, .onboarding-layout, .added-only';

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

// ---------- The bar and the large title ----------

/** A page's own header actions (search, settings, Lighter today…). */
const ACTIONS = '.page-header__actions, .page-hero__actions, .meditate-page__actions, [data-header-actions]';
/** Places that belong at the top rather than in the dock: More or Settings, Apps, the way to Proairetos. */
const TO_HEADER = '[data-to-header]';
const SIDEBAR = '.praxis-sidebar, .theoria-sidebar, dialog';

function appName(): string {
  return document.title.split(/ by |:/)[0]?.trim() ?? '';
}

/*
 * One bar across the top of every page on a phone, as iOS has it. At rest it is clear: the app's name on the left
 * (or a back chevron with where it goes), and on the right the page's actions with Settings and the family's places,
 * which no longer sit in the dock. Once the page scrolls the bar takes the room's glass; when the page's large title
 * has gone under it, a hairline. The bar names the app only, never the page.
 */
function largeTitle(): void {
  const phone = matchMedia(PHONE);
  const root = document.documentElement;
  const bar = document.createElement('div');
  bar.className = 'll-topbar';
  // The bar holds the only visible copy of these controls on a phone, so it is the one people and screen readers use.
  bar.setAttribute('role', 'toolbar');
  const lead = document.createElement('button');
  lead.type = 'button';
  lead.className = 'll-topbar__lead';
  const chevron =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
  const actions = document.createElement('span');
  actions.className = 'll-topbar__actions';
  bar.append(lead, actions);

  let title: HTMLElement | undefined;
  let originals: HTMLElement[] = [];
  let copied = '';
  let leadKey = '';
  let frame = 0;

  const backControl = () =>
    [...document.querySelectorAll<HTMLElement>(BACK)].find((each) => !each.closest(OUTSIDE) && each.isConnected);

  lead.addEventListener('click', () => {
    const control = backControl();
    if (control) control.click();
    else if (swipeSource?.can()) swipeSource.back();
  });

  // The bar's buttons are copies; a tap presses the original, so each keeps its own behavior.
  actions.addEventListener('click', (event) => {
    const copy = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-copy]') : null;
    originals[Number(copy?.dataset.copy)]?.click();
  });

  const gather = (): HTMLElement[] => {
    const own = first(ACTIONS);
    const page = own ? [...own.querySelectorAll<HTMLElement>('button, a')] : [];
    const places = [...document.querySelectorAll<HTMLElement>(TO_HEADER)].filter((each) => !each.closest(SIDEBAR));
    return [...page, ...places];
  };

  const copyActions = (list: HTMLElement[]) => {
    const key = list.map((each) => each.outerHTML).join('');
    if (key === copied) return;
    copied = key;
    originals = list;
    actions.replaceChildren(
      ...list.map((original, index) => {
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'll-topbar__action';
        copy.setAttribute('aria-label', original.getAttribute('aria-label') || original.textContent?.trim() || '');
        if (original.hasAttribute('aria-pressed')) copy.setAttribute('aria-pressed', original.getAttribute('aria-pressed')!);
        copy.dataset.copy = String(index);
        if (original.getAttribute('aria-pressed') === 'true' || original.getAttribute('aria-current') === 'page' || original.classList.contains('is-active'))
          copy.classList.add('is-on');
        const face = original.querySelector('.profile-button__face');
        const icon = original.querySelector('svg');
        if (face) copy.append(face.cloneNode(true));
        else if (icon) copy.append(icon.cloneNode(true));
        else copy.textContent = original.textContent;
        return copy;
      }),
    );
  };

  const update = () => {
    frame = 0;
    if (!bar.isConnected) document.body.append(bar);
    const on = phone.matches && !document.querySelector(FULL);
    root.classList.toggle('ll-bar-on', on);
    if (!on) {
      bar.classList.remove('is-on', 'is-scrolled', 'is-folded');
      return;
    }
    if (!title?.isConnected || !shown(title)) title = first(TITLE);
    copyActions(gather());
    const control = backControl();
    const hasBack = Boolean(control) || Boolean(swipeSource?.can());
    const backWords = control?.textContent?.trim() ?? '';
    const key = hasBack ? `back:${backWords.length <= 14 ? backWords : ''}` : `name:${appName()}`;
    if (key !== leadKey) {
      leadKey = key;
      lead.innerHTML = hasBack ? chevron : '';
      lead.classList.toggle('is-back', hasBack);
      lead.disabled = !hasBack;
      bar.setAttribute('aria-label', appName());
      const label = document.createElement('span');
      label.textContent = hasBack ? (backWords.length <= 14 ? backWords.replace(/^[←‹<]\s*/, '') : '') : appName();
      lead.append(label);
    }
    const height = bar.offsetHeight;
    const scrolled = scrollY > 2 || document.scrollingElement!.scrollTop > 2;
    const folded = title ? title.getBoundingClientRect().bottom < height : scrolled;
    bar.classList.add('is-on');
    bar.classList.toggle('is-scrolled', scrolled || folded);
    bar.classList.toggle('is-folded', folded);
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
  new MutationObserver((records) => {
    if (records.every((record) => bar.contains(record.target))) return;
    if (!title?.isConnected) title = undefined;
    soon();
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-current', 'aria-pressed', 'class'] });
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
