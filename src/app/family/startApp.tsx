import React, { type ComponentType } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../ErrorBoundary';
import { applyAppearance } from '../appearance';
import { startSync } from '../sync/syncController';
import { startDailyCopies } from './dailyCopy';
import { markAdded } from './added';
import { notifications } from '../notify/notifications';

/**
 * How Diaita, Philia and Ergon open: their colours on the root, appearance shared with Proairetos, the app,
 * sync, daily copies, notices through Proairetos's scheduler, and their own worker for working offline.
 */
export function startApp(app: 'diaita' | 'philia' | 'ergon', App: ComponentType, colours: { light: string; dark: string }): void {
  document.documentElement.classList.add(app);
  const appearance = () => {
    applyAppearance();
    const theme = document.documentElement.dataset.theme;
    const light = theme === 'light' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? colours.light : colours.dark);
  };
  appearance();
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', appearance);
  window.addEventListener('storage', appearance);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  void startSync();
  startDailyCopies();
  markAdded(app);
  notifications.start();

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register(`/${app}/sw.js`, { scope: `/${app}/` }).catch(() => undefined);
    });
  }
}
