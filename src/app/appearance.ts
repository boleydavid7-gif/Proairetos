import { tap } from './feel';
import { loadAppearance, type Appearance } from '../data/storage/preferences';
import { setPullRefresh, startLamplightBehaviors } from '../lamplight/behaviors';
import { requestPersistentStorage } from './pwa/persistence';

const textScale: Record<Appearance['textSize'], string> = { default: '100%', large: '112.5%', larger: '125%' };

/** Applies the theme and text size to the page. Every size is in rem, so text and spacing scale together. */
let switchTaps = false;

/** Every on/off switch in the family gives the gentle tap when flipped (see feel.ts), set up once per page. */
function listenForSwitches(): void {
  if (switchTaps || typeof document === 'undefined') return;
  switchTaps = true;
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest?.('[role="switch"], .toggle-row, .switch-row, .tick, .chip[aria-pressed], .hydros-glass')) tap();
  });
}

/** Each app lays its Lamplight room and color over the theme (its main hands it over: Proairetos with the
 *  person's color, the others with their own). It returns the page color for the browser bar. */
let lamplight: ((appearance: Appearance, light: boolean) => string) | null = null;
export function withLamplight(apply: (appearance: Appearance, light: boolean) => string): void {
  lamplight = apply;
}

let followingDay = false;

/** Day light (Lamplight 2.0) in every app: the worker that finds where the person is in their day loads after the
 *  first paint, so no app's first chunk carries the schedule and sleep code; until it answers, a recent position kept
 *  on the device (dayLightState) lights the page. */
function followDay(): void {
  if (followingDay) return;
  followingDay = true;
  // Pull to update, in every app: sync now (when signed in) and look for a newer version of the app. Pages that keep
  // more of their own (Proairetos's calendars and weather) listen for `ll-refresh`.
  setPullRefresh(async () => {
    const { syncNow } = await import('./sync/syncController');
    await Promise.all([
      syncNow().catch(() => null),
      navigator.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch(() => undefined),
    ]);
  });
  window.setTimeout(() => {
    void import('./dayLight').then(({ startDayLight }) => startDayLight(() => applyAppearance()));
  }, 1200);
}

export function applyAppearance(appearance: Appearance = loadAppearance()): void {
  void requestPersistentStorage();
  listenForSwitches();
  startLamplightBehaviors();
  followDay();
  const root = document.documentElement;
  root.dataset.theme = appearance.theme;
  root.style.fontSize = textScale[appearance.textSize];
  const light =
    appearance.theme === 'light' || (appearance.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
  const page = lamplight?.(appearance, Boolean(light));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page ?? (light ? '#f4ecdf' : '#0a0c0e'));
}
