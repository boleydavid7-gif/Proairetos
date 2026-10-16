import '../app/family/decideAdded';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../app/ErrorBoundary';
import App from './app/App';
import { startStore } from './data/store';
import { startSync } from '../app/sync/syncController';
// Same type as Proairetos, bundled so it works offline.
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import './styles/askesis.css';
import '../styles/premium.css';
import './styles/desktop.css';
import '../app/family/account.css';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';

// Lamplight: the person's room on every surface, this app's own lamp; it also sets the bar color.
withLamplight((look, light) => applyLamplight(look, light, 'askesis'));
import { startDailyCopies } from '../app/family/dailyCopy';
import AddedOnly from '../app/family/AddedOnly';
import { startLaunchFiles } from '../app/family/launchFiles';
import { keepStravaReturn } from './app/strava';

// Files opened with this app on a computer (Chrome, Edge) wait for the page that takes them.
startLaunchFiles();
// Back from Strava: its answer is kept before the app tidies the address.
keepStravaReturn();

document.documentElement.classList.add('askesis');

// The same theme and text size as Proairetos (Settings > Appearance there), with Askesis's own bar color.
const appearance = () => applyAppearance();
appearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);

// Storage first (the plan is read once), then the same sign-in and sync as Proairetos.
void startStore()
  .catch(() => undefined)
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <ErrorBoundary><AddedOnly app="askesis"><App /></AddedOnly></ErrorBoundary>
      </React.StrictMode>,
    );
    void startSync();
    startDailyCopies();
  });

// Its own service worker, scoped to /askesis/, so it installs and opens offline as its own app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/askesis/sw.js', { scope: '/askesis/' }).catch(() => undefined);
  });
}
