import '../app/family/decideAdded';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../app/ErrorBoundary';
import App from './app/App';
import { startStore } from './data/store';
import { startSync } from '../app/sync/syncController';
import { startDailyCopies } from '../app/family/dailyCopy';
import AddedOnly from '../app/family/AddedOnly';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource-variable/google-sans-flex/opsz.css';
import '../askesis/styles/askesis.css';
import './styles/oikonomia.css';
import '../styles/premium.css';
import '../app/family/account.css';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';

// Lamplight: the person's room on every surface, this app's own lamp; it also sets the bar color.
withLamplight((look, light) => applyLamplight(look, light, 'oikonomia'));
import { startLaunchFiles } from '../app/family/launchFiles';

// Files opened with this app on a computer (Chrome, Edge) wait for the page that takes them.
startLaunchFiles();

document.documentElement.classList.add('oikonomia');

const appearance = () => applyAppearance();

appearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);

void startStore()
  .catch(() => undefined)
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <ErrorBoundary><AddedOnly app="oikonomia"><App /></AddedOnly></ErrorBoundary>
      </React.StrictMode>,
    );
    void startSync();
    startDailyCopies();
  });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/oikonomia/sw.js', { scope: '/oikonomia/' }).catch(() => undefined);
  });
}
