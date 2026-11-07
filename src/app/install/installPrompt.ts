/*
 * Installing Proairetos on the Home Screen. Chrome and Edge offer an install prompt once per page load, and only
 * before anyone asks, so it is kept from the start (this module loads with the app) and used when the person taps
 * Install. Safari has no prompt: its steps are shown instead.
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let waiting: InstallEvent | undefined;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    waiting = event as InstallEvent;
    listeners.forEach((listener) => listener());
  });
  window.addEventListener('appinstalled', () => {
    waiting = undefined;
    listeners.forEach((listener) => listener());
  });
}

export type Device = 'iphone' | 'android' | 'computer';

/** The kind of device this is, for which steps to show first. */
export function deviceKind(agent = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchMac = false): Device {
  if (/iPhone|iPad|iPod/i.test(agent) || touchMac) return 'iphone';
  if (/Android/i.test(agent)) return 'android';
  return 'computer';
}

/** True when Proairetos is already open from the Home Screen (or as an installed app on a computer). */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export const canPrompt = () => Boolean(waiting);

export function onPromptChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows the browser's own install dialog; true when the person installed. */
export async function promptInstall(): Promise<boolean> {
  const event = waiting;
  if (!event) return false;
  waiting = undefined;
  await event.prompt();
  const { outcome } = await event.userChoice;
  listeners.forEach((listener) => listener());
  return outcome === 'accepted';
}

/** The steps for each kind of device, in plain words. */
export const INSTALL_STEPS: Record<Device, { name: string; steps: string[] }> = {
  iphone: {
    name: 'iPhone and iPad',
    steps: ['Open proairetos.com in Safari.', 'Tap Share (the square with an arrow).', 'Tap Add to Home Screen, then Add.'],
  },
  android: {
    name: 'Android',
    steps: ['Open proairetos.com in Chrome.', 'Tap the menu (⋮).', 'Tap Install app or Add to Home screen.'],
  },
  computer: {
    name: 'Computer',
    steps: ['Chrome or Edge: the install icon at the right of the address bar.', 'Safari on a Mac: File, then Add to Dock.'],
  },
};
