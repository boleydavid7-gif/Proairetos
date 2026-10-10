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
import { applyAppearance } from '../app/appearance';
import TheoriaApp from './TheoriaApp';
import { startDailyCopies } from '../app/family/dailyCopy';

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
    <ErrorBoundary><TheoriaApp /></ErrorBoundary>
  </React.StrictMode>,
);
