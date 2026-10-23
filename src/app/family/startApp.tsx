import React, { type ComponentType } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../ErrorBoundary';
import { applyAppearance, withLamplight } from '../appearance';
import { applyLamplight } from '../lamplight';
import { startSync } from '../sync/syncController';
import { startDailyCopies } from './dailyCopy';
import { startHealthInbox } from '../health/start';
import { startLaunchFiles } from './launchFiles';
import AddedOnly from './AddedOnly';
import { notifications } from '../notify/notifications';

/**
 * How the newer apps (Diaita, Philia, Ergon, Therapeia, Dynamis, Ktema, Phyton) open: Lamplight on the root, appearance shared with Proairetos, the app,
 * sync, daily copies, notices through Proairetos's scheduler, and their own worker for working offline.
 */
export function startApp(app: 'diaita' | 'philia' | 'ergon' | 'therapeia' | 'dynamis' | 'ktema' | 'phyton' | 'poreia', App: ComponentType): void {
  document.documentElement.classList.add(app);
  // Lamplight: the person's room on every surface, this app's own lamp (src/lamplight); it also sets the bar color.
  withLamplight((look, light) => applyLamplight(look, light, app));
  const appearance = () => applyAppearance();
  appearance();
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', appearance);
  window.addEventListener('storage', appearance);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AddedOnly app={app}>
          <App />
        </AddedOnly>
      </ErrorBoundary>
    </React.StrictMode>,
  );
  void startSync();
  startDailyCopies();
  startHealthInbox();
  startLaunchFiles();
  notifications.start();

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register(`/${app}/sw.js`, { scope: `/${app}/` }).catch(() => undefined);
    });
  }
}
