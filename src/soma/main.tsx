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
import '@fontsource-variable/google-sans-flex/opsz.css';
// The family's shared look (from Askesis), then Soma's own warmer colors.
import '../askesis/styles/askesis.css';
import './styles/soma.css';
import '../styles/premium.css';
import '../app/family/account.css';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';

// Lamplight: the person's room on every surface, this app's own lamp; it also sets the bar color.
withLamplight((look, light) => applyLamplight(look, light, 'soma'));
import { startDailyCopies } from '../app/family/dailyCopy';
import { startLaunchFiles } from '../app/family/launchFiles';
import AddedOnly from '../app/family/AddedOnly';
import { readInvite } from './core/sharedList';
import { keepInvite } from './screens/SharedList';

// The same theme and text size as Proairetos, with Soma's own bar color.
const appearance = () => applyAppearance();
appearance();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);

// Storage first (anything from the first Soma moves into the shared database), then the same sign-in and sync as Proairetos.
void startStore()
  .catch(() => undefined)
  .then(() => {
    // A shared list's invite: the key is after `#`, read here once and taken out of the address.
const invite = readInvite(location.search, location.hash);
if (invite) {
  keepInvite(invite);
  history.replaceState(history.state, '', location.pathname + location.search);
}
ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <ErrorBoundary><AddedOnly app="soma"><App /></AddedOnly></ErrorBoundary>
      </React.StrictMode>,
    );
    void startSync();
    startDailyCopies();
    startLaunchFiles();
  });

// Its own service worker, scoped to /soma/, so it installs and opens offline as its own app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/soma/sw.js', { scope: '/soma/' }).catch(() => undefined);
  });
}
