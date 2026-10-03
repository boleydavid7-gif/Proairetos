import React from 'react';
import ReactDOM from 'react-dom/client';
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

// Storage first (the plan is read once), then the same sign-in and sync as Proairetos.
void startStore()
  .catch(() => undefined)
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    void startSync();
  });

// Its own service worker, scoped to /askesis/, so it installs and opens offline as its own app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/askesis/sw.js', { scope: '/askesis/' }).catch(() => undefined);
  });
}
