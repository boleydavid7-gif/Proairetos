import { syncStatus } from '../sync/syncController';
import { offerUndo } from '../../lamplight/undo';

/*
 * Brings in what Apple Health sent while the app was closed: on start, when the account is ready, and on coming back
 * into view (at most once a minute). The work is loaded only while Apple Health is on, so no first chunk carries it.
 */

let last = 0;

function check(): void {
  try {
    if (!localStorage.getItem('proairetos.health')) return;
  } catch {
    return;
  }
  if (syncStatus.get().phase !== 'ready' || Date.now() - last < 60_000) return;
  last = Date.now();
  void import('./health')
    .then(async ({ openHealthInbox }) => {
      const result = await openHealthInbox();
      if (!result) return;
      const { broughtInText } = await import('../../core/health/fromHealth');
      const text = broughtInText(result.counts);
      if (text) offerUndo(text, () => void result.undo());
    })
    .catch(() => {
      // Tried again on the next start or return to the app.
    });
}

export function startHealthInbox(): void {
  syncStatus.subscribe(check);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  setTimeout(check, 3000);
}
