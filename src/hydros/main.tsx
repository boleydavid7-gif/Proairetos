import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../app/ErrorBoundary';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../askesis/styles/askesis.css';
import './styles/hydros.css';
import '../styles/premium.css';
import '../app/family/account.css';
import { applyAppearance } from '../app/appearance';
import { startSync } from '../app/sync/syncController';
import { loadSettings, startStore } from './data/store';
import { notifications } from '../app/notify/notifications';
import App from './app/App';

function appearance() {
  applyAppearance();
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#061b25' : '#eaf4f5');
}
appearance();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);
startStore();
notifications.setHydrationSchedule({ enabled: loadSettings().reminders === true, intervalMinutes: loadSettings().reminderIntervalMinutes ?? 120 });
notifications.start();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);
void startSync();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    const serviceWorkerUrl = `/hydros/sw.js?v=${encodeURIComponent(__BUILT_AT__)}`;
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: '/hydros/' }).then((registration) => registration.update()).catch(() => undefined);
  });
}
