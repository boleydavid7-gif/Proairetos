import '../app/family/decideAdded';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../app/ErrorBoundary';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource-variable/google-sans-flex/opsz.css';
import '../askesis/styles/askesis.css';
import './styles/hydros.css';
import '../styles/premium.css';
import '../app/family/account.css';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';

// Lamplight: the person's room on every surface, this app's own lamp; it also sets the bar color.
withLamplight((look, light) => applyLamplight(look, light, 'hydros'));
import { startSync } from '../app/sync/syncController';
import { loadSettings, startStore } from './data/store';
import { notifications } from '../app/notify/notifications';
import App from './app/App';
import { startDailyCopies } from '../app/family/dailyCopy';
import AddedOnly from '../app/family/AddedOnly';

const appearance = () => applyAppearance();
appearance();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);
startStore();
notifications.setHydrationSchedule({ enabled: loadSettings().reminders === true, intervalMinutes: loadSettings().reminderIntervalMinutes ?? 120, when: loadSettings().reminderWhen });
notifications.start();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><AddedOnly app="hydros"><App /></AddedOnly></ErrorBoundary></React.StrictMode>);
void startSync();
startDailyCopies();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let refreshing = false;
  // Reload only when a newer worker replaces one already in charge; the first install needs no reload (and a
  // reload then would lose a `?open=` link or a sign-in coming back).
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    const serviceWorkerUrl = `/hydros/sw.js?v=${encodeURIComponent(__BUILT_AT__)}`;
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: '/hydros/' }).then((registration) => registration.update()).catch(() => undefined);
  });
}
