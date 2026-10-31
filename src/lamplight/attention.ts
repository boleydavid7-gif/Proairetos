/*
 * What may ask for the person's attention, as they choose it (Settings > The app > Attention): the bell's count on
 * Today, Today's updates card, and the light on the one thing that matters now in every app. Kept in the synced
 * setting `proairetos.attention`, so every app and device follows one choice. Absent means as it was: on.
 */
export type BellCount = 'number' | 'dot' | 'off';
/** `icon`: the bell's count on the app's icon too (installed apps that can show one); off until chosen. */
export type Attention = { bell: BellCount; updates: boolean; light: boolean; icon: boolean };

export const ATTENTION_KEY = 'proairetos.attention';
const CHANGED = 'proairetos-attention';
const DEFAULTS: Attention = { bell: 'number', updates: true, light: true, icon: false };

export function attention(): Attention {
  try {
    const saved = JSON.parse(localStorage.getItem(ATTENTION_KEY) ?? '{}') as Partial<Attention>;
    return {
      bell: saved.bell === 'dot' || saved.bell === 'off' ? saved.bell : 'number',
      updates: saved.updates !== false,
      light: saved.light !== false,
      icon: saved.icon === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setAttention(patch: Partial<Attention>): void {
  try {
    localStorage.setItem(ATTENTION_KEY, JSON.stringify({ ...attention(), ...patch }));
  } catch {
    // Storage closed: the choice holds for this visit only.
  }
  dispatchEvent(new Event(CHANGED));
}

/** Calls back when the choice changes here, in another tab, or arrives from another device. */
export function onAttention(listener: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === ATTENTION_KEY) listener();
  };
  addEventListener(CHANGED, listener);
  addEventListener('storage', storage);
  return () => {
    removeEventListener(CHANGED, listener);
    removeEventListener('storage', storage);
  };
}

type Badging = Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/** Whether this browser can put a count on the app's icon (installed apps on iPhone, Android, Windows and Mac). */
export const canBadgeIcon = () => typeof navigator !== 'undefined' && typeof (navigator as Badging).setAppBadge === 'function';

/** The bell's count on the app's icon, as the person chose it: a number, a dot, or nothing. The choice and count are
 *  also left for the service worker (`/__notify/badge.json` in Cache Storage `proairetos-notify`), which adds to the
 *  count when a reminder arrives with the app closed. */
export function showIconBadge(count: number): void {
  const nav = navigator as Badging;
  if (!canBadgeIcon()) return;
  const choice = attention();
  const on = choice.icon && choice.bell !== 'off';
  const shown = on && count > 0;
  if (!shown) void nav.clearAppBadge?.().catch(() => undefined);
  else void nav.setAppBadge?.(choice.bell === 'dot' ? undefined : count).catch(() => undefined);
  if (typeof caches === 'undefined') return;
  const body = JSON.stringify({ on, dot: choice.bell === 'dot', count: shown ? count : 0 });
  void caches
    .open('proairetos-notify')
    .then((cache) => cache.put('/__notify/badge.json', new Response(body, { headers: { 'content-type': 'application/json' } })))
    .catch(() => undefined);
}
