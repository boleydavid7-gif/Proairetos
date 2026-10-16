import '../app/family/decideAdded';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../app/ErrorBoundary';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../styles/tokens.css';
import './theoria.css';
import '../styles/premium.css';
import '../app/family/account.css';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';

// Lamplight: the person's room on every surface, this app's own lamp; it also sets the bar color.
withLamplight((look, light) => applyLamplight(look, light, 'theoria'));
import TheoriaApp from './TheoriaApp';
import { startDailyCopies } from '../app/family/dailyCopy';
import AddedOnly from '../app/family/AddedOnly';
import { startLaunchFiles } from '../app/family/launchFiles';

// Files opened with this app on a computer (Chrome, Edge) wait for the page that takes them.
startLaunchFiles();

applyAppearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => applyAppearance());
startDailyCopies();

// Proairetos's own service worker (scope /) keeps Theoria's page for offline use; registered here too, since
// each Home Screen app on an iPhone keeps its own storage.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><AddedOnly app="theoria"><TheoriaApp /></AddedOnly></ErrorBoundary>
  </React.StrictMode>,
);
