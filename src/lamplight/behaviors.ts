/*
 * Lamplight's behaviors, the parts of the system that are felt rather than seen, started once in every app (from
 * applyAppearance):
 *
 *   The bar. On phones every page has one bar across the top: the app's name (or the way back) on the left, the
 *   page's actions and Settings on the right. The page's own title stays in the page and scrolls under it.
 *
 *   Row menus. Press and hold a row (or right-click it) and a menu offers what the row itself offers: its swipe
 *   action, mark done, open, delete…, read from the row's own buttons, so every list in every app has one.
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
  '.hydros-header h1',
  '.poreia-header__title',
  'main h1',
].join(', ');

const BACK = '.back-link, .page-hero__back, .theoria-back-button, .meditate-page__back, .hydros-header .hydros-icon-button, [data-back]';
const OUTSIDE = 'dialog, nav, .tab-bar, .ll-topbar, [data-no-topbar]';
const PAGE = '.app-shell__content, .page, main';
const PHONE = '(max-width: 61.99rem)';
/** How much scroll the title's handoff to the top bar takes, in CSS pixels. */
const HANDOFF = 40;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
/** Full-screen moments with no bar of their own to fold into. */
const FULL = '.theoria-reader-back, .sit-screen__leave, .focus-screen, .pause-screen, .guide, .welcome, .onboarding-layout, .added-only';

let started = false;

export function startLamplightBehaviors(): void {
  if (started || typeof window === 'undefined' || typeof document === 'undefined' || typeof matchMedia !== 'function') return;
  started = true;
  largeTitle();
  dockMarks();
  backSwipe();
  rowMenus();
  listMotion();
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

function rtl(): boolean {
  return getComputedStyle(document.documentElement).direction === 'rtl';
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
/** A home picture at the top of a page: the bar's mark and name stay light over its shaded top, in either look. */
const PICTURE = '.hero, .hydros-hero, .poreia-scene';

let barMark = '';
let onMark: (() => void) | undefined;

/** The app's symbolic mark (SVG text), drawn before its name at the bar's left. Set by each app's appearance. */
export function setBarMark(svg: string): void {
  if (svg === barMark) return;
  barMark = svg;
  onMark?.();
}

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
  bar.className = 'll-topbar ll-mica';
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
  let titleFrame: HTMLElement | undefined;
  let anchoredTitle: HTMLElement | undefined;
  let originals: HTMLElement[] = [];
  let copied = '';
  let leadKey = '';
  let frame = 0;
  let shownProgress = '';
  // Where the title's words begin inside its box: a title moved down by padding (the anchoring below) starts higher
  // than its words. Read once per page change, never per scroll frame.
  let titleInset = 0;
  let lastY = 0;
  let tucked = false;
  // Reading the page's controls (and serialising them to see whether they changed) happens only after the page
  // itself changed; a scroll frame reads the scroll and one rectangle, so long pages scroll without extra work.
  let dirty = true;
  let picture: HTMLElement | undefined;
  let looks = 0;
  let full = false;

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
        const label = original.getAttribute('aria-label') || original.textContent?.trim() || '';
        copy.setAttribute('aria-label', label);
        copy.title = label;
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
    // Whether a full-screen moment is up changes only with the page, never with a scroll.
    if (dirty) full = Boolean(document.querySelector(FULL));
    const on = phone.matches && !full;
    root.classList.toggle('ll-bar-on', on);
    if (!on) {
      root.classList.remove('ll-tucked');
      title?.classList.remove('ll-title-folding');
      titleFrame?.classList.remove('ll-title-anchored');
      titleFrame?.classList.remove('ll-title-anchored--down', 'll-title-anchored--up');
      titleFrame?.style.removeProperty('--ll-title-shift');
      titleFrame = undefined;
      anchoredTitle = undefined;
      bar.style.removeProperty('--ll-bar-progress');
      title?.style.removeProperty('--ll-title-opacity');
      shownProgress = '';
      bar.classList.remove('is-on', 'is-scrolled', 'is-folded', 'is-over-picture');
      bar.setAttribute('aria-hidden', 'true');
      dirty = false;
      return;
    }
    if (title && !title.isConnected) dirty = true;
    if (dirty) structure();
    scrolled();
  };

  const structure = () => {
    dirty = false;
    if (!title?.isConnected || !shown(title)) {
      const next = first(TITLE);
      if (next !== title) {
        title?.classList.remove('ll-title-folding');
        title?.style.removeProperty('--ll-title-opacity');
        shownProgress = '';
      }
      title = next;
    }
    const nextFrame =
      title?.closest<HTMLElement>('.page-header, .page-hero, .home__words, .hero__content, .praxis-page-heading, .theoria-heading, .hydros-header, .poreia-header__words') ?? title;
    if (titleFrame !== nextFrame || anchoredTitle !== title) {
      titleFrame?.classList.remove('ll-title-anchored');
      titleFrame?.classList.remove('ll-title-anchored--down', 'll-title-anchored--up');
      titleFrame?.style.removeProperty('--ll-title-shift');
      titleFrame = nextFrame;
      anchoredTitle = title;
    }
    const anchorTitle = Boolean(title && titleFrame && !titleFrame.matches('.hydros-add__stage > .hydros-header') && !title.closest('[data-no-title-anchor]'));
    if (!anchorTitle) {
      // Hydros's add screen deliberately floats its header over a full-screen illustration. Its own title band is
      // positioned by hydros.css; the family-wide anchor would add padding to that absolute frame and cover the
      // drink picker below it.
      if (titleFrame?.classList.contains('ll-title-anchored')) titleFrame.classList.remove('ll-title-anchored');
      if (titleFrame?.classList.contains('ll-title-anchored--down')) titleFrame.classList.remove('ll-title-anchored--down');
      if (titleFrame?.classList.contains('ll-title-anchored--up')) titleFrame.classList.remove('ll-title-anchored--up');
      if (titleFrame?.style.getPropertyValue('--ll-title-shift')) titleFrame.style.removeProperty('--ll-title-shift');
    }
    if (anchorTitle && title && titleFrame) {
      const anchorTop = Number.parseFloat(getComputedStyle(root).getPropertyValue('--ll-title-anchor-top')) || 148;
      // Measure in document coordinates. The structure pass can happen while the page is already scrolled;
      // using the viewport coordinate there would fold the scroll offset into the layout shift.
      const scrollTop = document.scrollingElement?.scrollTop ?? scrollY;
      const previousShift = Number.parseFloat(titleFrame.style.getPropertyValue('--ll-title-shift')) || 0;
      // A direct title uses padding to keep the handoff in the document flow. Its border-box top does not move
      // when that padding is applied, so subtracting the previous shift here feeds the padding back into the next
      // measurement and grows the page forever. Wrapped titles use translate/padding on their frame, so their prior
      // shift still needs removing from the measured position.
      const previousVisualShift = titleFrame === title && titleFrame.classList.contains('ll-title-anchored--down') ? 0 : previousShift;
      const titleDocumentTop = title.getBoundingClientRect().top + scrollTop - previousVisualShift;
      const shift = anchorTop - titleDocumentTop;
      const marginTop = Number.parseFloat(getComputedStyle(title).marginTop) || 0;
      const frameShift = shift > 0 ? shift - marginTop : shift;
      const anchored = Math.abs(frameShift) > 0.5;
      const down = frameShift > 0;
      const shiftValue = `${frameShift.toFixed(2)}px`;
      if (titleFrame.classList.contains('ll-title-anchored') !== anchored) {
        titleFrame.classList.toggle('ll-title-anchored', anchored);
      }
      if (titleFrame.classList.contains('ll-title-anchored--down') !== (anchored && down)) {
        titleFrame.classList.toggle('ll-title-anchored--down', anchored && down);
      }
      if (titleFrame.classList.contains('ll-title-anchored--up') !== (anchored && !down)) {
        titleFrame.classList.toggle('ll-title-anchored--up', anchored && !down);
      }
      if (anchored) {
        if (titleFrame.style.getPropertyValue('--ll-title-shift') !== shiftValue) {
          titleFrame.style.setProperty('--ll-title-shift', shiftValue);
        }
      } else if (titleFrame.style.getPropertyValue('--ll-title-shift')) {
        titleFrame.style.removeProperty('--ll-title-shift');
      }
    }
    titleInset = title ? Number.parseFloat(getComputedStyle(title).paddingTop) || 0 : 0;
    picture = first(PICTURE);
    // Mid-transition a page's title or picture can measure empty; look again once the move has settled.
    const unseen = (!title && document.querySelector(TITLE)) || (!picture && document.querySelector(PICTURE));
    if (!unseen) looks = 0;
    if (unseen && looks++ < 4) setTimeout(changed, 300);
    // and measure where things sit once a page's slide in has ended.
    else setTimeout(soon, 400);
    copyActions(gather());
    const control = backControl();
    const hasBack = Boolean(control) || Boolean(swipeSource?.can());
    const backWords = control?.textContent?.trim() ?? '';
    const key = hasBack ? `back:${backWords.length <= 14 ? backWords : ''}` : `name:${appName()}`;
    if (key !== leadKey) {
      leadKey = key;
      lead.innerHTML = hasBack ? chevron : barMark ? `<span class="ll-topbar__mark">${barMark}</span>` : '';
      lead.classList.toggle('is-back', hasBack);
      lead.disabled = !hasBack;
      bar.setAttribute('aria-label', appName());
      const label = document.createElement('span');
      label.textContent = hasBack ? (backWords.length <= 14 ? backWords.replace(/^[←‹<]\s*/, '') : '') : appName();
      lead.append(label);
    }
  };

  const scrolled = () => {
    // The dock tucks away while reading down a page and comes back on the way up, at the top or the foot.
    const y = document.scrollingElement?.scrollTop ?? scrollY;
    const room = (document.scrollingElement?.scrollHeight ?? 0) - innerHeight;
    if (y < 80 || y > room - 40) tucked = false;
    else if (y - lastY > 8) tucked = true;
    else if (lastY - y > 8) tucked = false;
    if (Math.abs(y - lastY) > 8 || y < 80) lastY = y;
    root.classList.toggle('ll-tucked', tucked && !reduced());
    const height = bar.offsetHeight;
    // The handoff follows the title's top edge over a short stretch of scroll: it starts just below the bar and is
    // done once the title's top has slipped under it, so the title fades as it passes beneath the bar's glass rather
    // than sitting half there under the app's name. The values go on the bar and the title alone, and only when
    // they change: written on the root they restyled the whole page every frame, which made scrolling stutter.
    const titleTop = title?.isConnected ? title.getBoundingClientRect().top + titleInset : undefined;
    const progress = titleTop === undefined
      ? clamp((y - 8) / HANDOFF)
      : clamp((height + HANDOFF / 2 - titleTop) / HANDOFF);
    const value = progress.toFixed(3);
    if (value !== shownProgress) {
      shownProgress = value;
      bar.style.setProperty('--ll-bar-progress', value);
      title?.style.setProperty('--ll-title-opacity', (1 - progress).toFixed(3));
    }
    const folded = progress >= 0.999;
    bar.classList.add('is-on');
    bar.classList.toggle('is-scrolled', progress > 0.001);
    bar.classList.toggle('is-folded', folded);
    bar.classList.toggle('is-over-picture', !folded && Boolean(picture?.isConnected) && picture!.getBoundingClientRect().top < height);
    if (title && !title.classList.contains('ll-title-folding')) title.classList.add('ll-title-folding');
    bar.setAttribute('aria-hidden', 'false');
  };
  const soon = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const changed = () => {
    dirty = true;
    soon();
  };

  onMark = () => {
    leadKey = '';
    changed();
  };
  addEventListener('scroll', soon, { passive: true, capture: true });
  addEventListener('resize', changed);
  addEventListener('popstate', () => {
    title = undefined;
    changed();
  });
  phone.addEventListener?.('change', changed);
  new MutationObserver((records) => {
    if (records.every((record) => bar.contains(record.target))) return;
    if (!title?.isConnected) title = undefined;
    changed();
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-current', 'aria-pressed', 'class'] });
  soon();
}

// ---------- The dock's mark ----------

export const DOCKS = '.tab-bar, .hydros-tabs, .praxis-bottom-nav, .theoria-bottom-nav';

/*
 * Every phone dock marks the place you are on with one short line along its top edge, centered over that place's
 * icon. Where the place sits is measured, not assumed: docks have their own padding and gaps, and lose places to the
 * top bar on phones, so fixed fractions of the width drifted off center. The center goes on the dock as --ll-dock-x
 * (bars.css draws the line); the line slides between places only once it has been placed the first time.
 */
function dockMarks(): void {
  let frame = 0;
  const place = () => {
    frame = 0;
    for (const dock of document.querySelectorAll<HTMLElement>(DOCKS)) {
      const current = [...dock.querySelectorAll<HTMLElement>('[aria-current="page"]')].find((each) => each.getClientRects().length > 0);
      const marked = Boolean(current) && dock.getClientRects().length > 0;
      if (current && marked) {
        const box = dock.getBoundingClientRect();
        const item = current.getBoundingClientRect();
        const x = `${(item.left + item.width / 2 - box.left - dock.clientLeft).toFixed(1)}px`;
        if (dock.style.getPropertyValue('--ll-dock-x') !== x) dock.style.setProperty('--ll-dock-x', x);
      }
      if (dock.classList.contains('ll-dock-marked') !== marked) dock.classList.toggle('ll-dock-marked', marked);
      // The first placement lands at once; after that the line travels.
      if (marked && !dock.classList.contains('ll-dock-ready')) requestAnimationFrame(() => dock.classList.add('ll-dock-ready'));
    }
  };
  const soon = () => {
    if (!frame) frame = requestAnimationFrame(place);
  };
  addEventListener('resize', soon);
  matchMedia(PHONE).addEventListener?.('change', soon);
  document.fonts?.ready.then(soon, () => undefined);
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] });
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
      // The way back is from the edge you start reading from: the left, or the right in a right-to-left language.
      const fromEdge = rtl() ? innerWidth - (touch?.clientX ?? innerWidth) : (touch?.clientX ?? innerWidth);
      if (!touch || fromEdge > EDGE || document.querySelector('dialog[open]')) return;
      hold = { x: touch.clientX, y: touch.clientY, going: false, samples: [] };
    },
    { passive: true },
  );

  addEventListener(
    'touchmove',
    (event) => {
      const touch = event.touches[0];
      if (!hold || !touch) return;
      const dx = (touch.clientX - hold.x) * (rtl() ? -1 : 1);
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
      if (!reduced()) hold.page!.style.transform = `translate3d(${Math.max(0, dx) * (rtl() ? -1 : 1)}px, 0, 0)`;
    },
    { passive: true },
  );

  const end = (event: TouchEvent) => {
    const current = hold;
    hold = null;
    if (!current?.going || !current.page || !current.back) return;
    const page = current.page;
    const touch = event.changedTouches[0];
    const dx = touch ? (touch.clientX - current.x) * (rtl() ? -1 : 1) : 0;
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
    page.style.transform = `translate3d(${rtl() ? -innerWidth : innerWidth}px, 0, 0)`;
    setTimeout(finish, 180);
  };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });
}

// ---------- Row menus ----------

const ROWS = '[data-menu], .swipe, .check-row, .rows > li, .detail-list > li, .days-row';
const TRIGGER_ROWS = '[data-menu], .swipe, .days-row';
const HOLD_MS = 480;
const MENU_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>';

type MenuItem = { label: string; run: () => void; danger: boolean };

/** A row's name: the first words of the control carrying the most text (its open button), before any detail. */
function rowTitle(row: HTMLElement): string {
  const named = row.querySelector('.check-row__title span, .row__text > span, .days-row__title');
  if (named?.textContent?.trim()) return named.textContent.trim();
  const controls = [...row.querySelectorAll<HTMLElement>('button, a[href]')].filter((el) => !el.hidden);
  const main = controls.sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0];
  if (!main) return '';
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text) return text;
  }
  return '';
}

function itemsFor(row: HTMLElement): MenuItem[] {
  const own = (el: Element) => !row.matches('li') || el.closest('li') === row;
  const title = rowTitle(row);
  const seen = new Set<string>();
  const items: MenuItem[] = [];
  const controls = [...row.querySelectorAll<HTMLElement>('[data-menu-first], button, a[href]')].filter(
    (el, index, all) => all.indexOf(el) === index && own(el) && !el.classList.contains('ll-row-menu-trigger') && !el.hasAttribute('data-menu-skip') && !(el as HTMLButtonElement).disabled,
  );
  controls.sort((a, b) => Number(b.hasAttribute('data-menu-first')) - Number(a.hasAttribute('data-menu-first')));
  for (const control of controls) {
    const named = control.getAttribute('aria-label')?.trim();
    let label = named || control.textContent?.trim() || '';
    if (control.getAttribute('role') === 'checkbox') label = control.getAttribute('aria-checked') === 'true' ? 'Mark not done' : 'Mark done';
    else if (title && label.includes(title)) {
      // "Delete Clean floors" is Delete; "Clean floors: done" is Done; the row's own words are Open.
      const rest = named ? label.replace(title, '').replace(/^[\s:,·–-]+|[\s:,·–-]+$/g, '').replace(/\s+(for|of)$/i, '') : '';
      label = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : 'Open';
    }
    if (/^more$/i.test(label)) label = 'Open';
    if (!label || label.length > 32 || seen.has(label)) continue;
    seen.add(label);
    items.push({ label, run: () => control.click(), danger: /^(delete|remove)/i.test(label) });
  }
  return items;
}

function rowMenus(): void {
  let timer = 0;
  let start: { x: number; y: number } | null = null;
  let swallowClick = false;
  let open: HTMLElement | null = null;

  const close = () => {
    open?.remove();
    open = null;
  };

  const show = (row: HTMLElement, x: number, y: number) => {
    const items = itemsFor(row);
    if (items.length < 2) return false;
    close();
    const menu = document.createElement('div');
    menu.className = 'll-menu';
    menu.setAttribute('role', 'menu');
    const title = rowTitle(row);
    if (title) {
      const head = document.createElement('p');
      head.className = 'll-menu__title';
      head.textContent = title;
      menu.append(head);
    }
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.className = item.danger ? 'll-menu__item ll-menu__item--danger' : 'll-menu__item';
      button.textContent = item.label;
      button.addEventListener('click', () => {
        close();
        item.run();
      });
      menu.append(button);
    }
    document.body.append(menu);
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(12, Math.min(x - box.width / 2, innerWidth - box.width - 12))}px`;
    menu.style.top = `${Math.max(12, Math.min(y + 12, innerHeight - box.height - 12))}px`;
    open = menu;
    row.classList.add('ll-held');
    setTimeout(() => row.classList.remove('ll-held'), 260);
    (menu.querySelector('[role=menuitem]') as HTMLElement | null)?.focus({ preventScroll: true });
    if (navigator.vibrate) navigator.vibrate(8);
    return true;
  };

  const ensureTriggers = () => {
    document.querySelectorAll<HTMLElement>(TRIGGER_ROWS).forEach((row) => {
      if (row.closest('dialog, nav, .ll-topbar') || row.querySelector('.ll-row-menu-trigger') || !shown(row)) return;
      if (itemsFor(row).length < 2) return;
      const title = rowTitle(row);
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'll-row-menu-trigger';
      trigger.setAttribute('aria-label', title ? `More actions for ${title}` : 'More actions');
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.innerHTML = MENU_ICON;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const box = trigger.getBoundingClientRect();
        show(row, box.left + box.width / 2, box.bottom);
      });
      row.append(trigger);
    });
  };

  ensureTriggers();
  new MutationObserver(ensureTriggers).observe(document.body, { childList: true, subtree: true });

  addEventListener(
    'pointerdown',
    (event) => {
      if (open && !open.contains(event.target as Node)) close();
      if (event.pointerType === 'mouse') return;
      if (event.target instanceof Element && event.target.closest('.ll-row-menu-trigger')) return;
      const row = event.target instanceof Element ? event.target.closest<HTMLElement>(ROWS) : null;
      if (!row || row.closest('dialog, nav, .ll-topbar')) return;
      start = { x: event.clientX, y: event.clientY };
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (start && show(row, start.x, start.y)) swallowClick = true;
        start = null;
      }, HOLD_MS);
    },
    true,
  );
  addEventListener(
    'pointermove',
    (event) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
        clearTimeout(timer);
        start = null;
      }
    },
    true,
  );
  const cancel = () => {
    clearTimeout(timer);
    start = null;
  };
  addEventListener('pointerup', cancel, true);
  addEventListener('pointercancel', cancel, true);
  // The press that opened the menu does not also tap the row.
  addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  addEventListener('contextmenu', (event) => {
    const row = event.target instanceof Element ? event.target.closest<HTMLElement>(ROWS) : null;
    if (!row || row.closest('dialog, nav') || (event.target as Element).closest('input, textarea, [contenteditable]')) return;
    if (show(row, event.clientX, event.clientY)) event.preventDefault();
  });
  addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const items = [...open.querySelectorAll<HTMLElement>('[role=menuitem]')];
      const at = items.indexOf(document.activeElement as HTMLElement);
      items[(at + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
      event.preventDefault();
    }
  });
  addEventListener('scroll', close, { passive: true, capture: true });
}

// ---------- Lists that glide ----------

/*
 * When a tap or a key adds, finishes, removes or puts back a row, the rows of that list glide to their new places
 * and a new row fades up into its gap (FLIP: where each row was is noted as the finger goes down, where it is after
 * the change is read in the next frame, and the difference is played back as a translate). A row taken away fades
 * where it was; a whole new page (other lists) is left to the page transition. Translate, scale and opacity only.
 */
/** Cards laid out in a grid move sideways as well as up and down. */
const GRID_ITEMS = '.recipe-cards > *, .recipe-grid > *, .theoria-shelf-page-grid > *, .theoria-recent-grid > *, .produce-grid > *';
const LIST_ROWS = `ul > li, ol > li, [role="list"] > *, .rows > *, .hydros-drinks > *, .coming-up > *, .chore-list > *, ${GRID_ITEMS}`;
const MAX_ROWS = 160;

function listMotion(): void {
  let before = new Map<Element, DOMRect>();
  let parents = new Set<Element>();
  let takenAt = 0;
  let queued = false;

  const visible = (): Element[] => {
    const out: Element[] = [];
    const bottom = innerHeight + 80;
    for (const row of document.querySelectorAll(LIST_ROWS)) {
      const box = row.getBoundingClientRect();
      if (row.hasAttribute('data-ll-ghost')) continue;
      if (box.height === 0 || box.bottom < -80 || box.top > bottom) continue;
      out.push(row);
      if (out.length >= MAX_ROWS) break;
    }
    return out;
  };

  const take = () => {
    if (reduced()) return;
    before = new Map(visible().map((row) => [row, row.getBoundingClientRect()]));
    parents = new Set([...before.keys()].map((row) => row.parentElement).filter((parent): parent is HTMLElement => Boolean(parent)));
    takenAt = performance.now();
  };

  const play = () => {
    queued = false;
    if (!before.size || performance.now() - takenAt > 1500) return;
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--ll-spring').trim() || 'cubic-bezier(0.2, 0.8, 0.2, 1)';
    for (const row of visible()) {
      const now = row.getBoundingClientRect();
      const was = before.get(row);
      if (was) {
        const dy = was.top - now.top;
        const dx = was.left - now.left;
        const sideways = Math.abs(dx) > 1;
        if (sideways && !row.matches(GRID_ITEMS)) continue;
        if ((Math.abs(dy) > 1 || sideways) && Math.abs(dy) < 600 && Math.abs(dx) < 600) {
          row.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: 340, easing });
        }
      } else if (row.parentElement && parents.has(row.parentElement)) {
        row.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing });
      }
    }
    // Later steps of the same change (a list that settles in two renders) start from where things are now.
    before = new Map(visible().map((row) => [row, row.getBoundingClientRect()]));
  };

  document.addEventListener('pointerdown', take, { capture: true, passive: true });
  document.addEventListener('keydown', take, { capture: true, passive: true });
  // A row taken away fades where it was (a copy, left in its list out of the flow) while the rows below glide up.
  const fadeOut = (row: Element, list: Element, was: DOMRect) => {
    const ghost = row.cloneNode(true) as HTMLElement;
    // A copy carries no ids, names or labels of its own, so nothing points at it while it fades.
    for (const element of [ghost, ...ghost.querySelectorAll('[id], [name], [for]')]) for (const name of ['id', 'name', 'for']) element.removeAttribute(name);
    ghost.setAttribute('data-ll-ghost', '');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    Object.assign(ghost.style, { position: 'fixed', top: `${was.top}px`, left: `${was.left}px`, width: `${was.width}px`, height: `${was.height}px`, margin: '0', pointerEvents: 'none', zIndex: '1' });
    list.appendChild(ghost);
    // A transformed ancestor moves what is fixed: put it back where the row was.
    const at = ghost.getBoundingClientRect();
    if (Math.abs(at.top - was.top) > 0.5 || Math.abs(at.left - was.left) > 0.5) {
      ghost.style.top = `${2 * was.top - at.top}px`;
      ghost.style.left = `${2 * was.left - at.left}px`;
    }
    const fade = ghost.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '0.97' }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
    const remove = () => ghost.remove();
    fade.onfinish = remove;
    fade.oncancel = remove;
  };

  new MutationObserver((records) => {
    if (!before.size || performance.now() - takenAt > 1500) return;
    const gone = records.flatMap((record) =>
      [...record.removedNodes].flatMap((node) => {
        const was = node instanceof Element && !node.hasAttribute('data-ll-ghost') ? before.get(node) : undefined;
        return was && record.target.isConnected && parents.has(record.target as Element) ? [{ row: node as Element, list: record.target as Element, was }] : [];
      }),
    );
    // Many rows at once is a whole list changing (a filter, another month), not a row taken away.
    if (gone.length && gone.length <= 3) for (const { row, list, was } of gone) fadeOut(row, list, was);
    if (queued) return;
    if (!records.some((record) => record.addedNodes.length || record.removedNodes.length)) return;
    queued = true;
    requestAnimationFrame(play);
  }).observe(document.body, { childList: true, subtree: true });
}
