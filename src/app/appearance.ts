import { tap } from './feel';
import { loadAppearance, type Appearance } from '../data/storage/preferences';

const textScale: Record<Appearance['textSize'], string> = { default: '100%', large: '112.5%', larger: '125%' };

/** Applies the theme and text size to the page. Every size is in rem, so text and spacing scale together. */
let switchTaps = false;

/** Every on/off switch in the family gives the gentle tap when flipped (see feel.ts), set up once per page. */
function listenForSwitches(): void {
  if (switchTaps || typeof document === 'undefined') return;
  switchTaps = true;
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest?.('[role="switch"], .toggle-row, .switch-row')) tap();
  });
}

/** Proairetos lays its Lamplight room and color over the theme (main.tsx hands it over, so the other apps
 *  never load the palette). It returns the page color for the browser bar. */
let lamplight: ((appearance: Appearance, light: boolean) => string) | null = null;
export function withLamplight(apply: (appearance: Appearance, light: boolean) => string): void {
  lamplight = apply;
}

export function applyAppearance(appearance: Appearance = loadAppearance()): void {
  listenForSwitches();
  const root = document.documentElement;
  root.dataset.theme = appearance.theme;
  root.style.fontSize = textScale[appearance.textSize];
  const light =
    appearance.theme === 'light' || (appearance.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
  const page = lamplight?.(appearance, Boolean(light));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page ?? (light ? '#f4ecdf' : '#0a0c0e'));
}
