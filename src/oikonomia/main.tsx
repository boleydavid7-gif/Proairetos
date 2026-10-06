import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { startStore } from './data/store';
import { startSync } from '../app/sync/syncController';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../askesis/styles/askesis.css';
import './styles/oikonomia.css';
import '../app/family/account.css';
import { applyAppearance } from '../app/appearance';

document.documentElement.classList.add('oikonomia');

function appearance() {
  applyAppearance();
  const theme = document.documentElement.dataset.theme;
  const light = theme === 'light' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f2eee6' : '#0d1110');
}

appearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);

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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/oikonomia/sw.js', { scope: '/oikonomia/' }).catch(() => undefined);
  });
}
