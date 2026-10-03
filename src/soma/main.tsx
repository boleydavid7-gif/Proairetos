import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
// Same type as Proairetos, bundled so it works offline.
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
// The family's shared look (from Askesis), then SOMA's own warmer colours.
import '../askesis/styles/askesis.css';
import './styles/soma.css';
import { applyAppearance } from '../app/appearance';

// The same theme and text size as Proairetos, with SOMA's own bar colour.
function appearance() {
  applyAppearance();
  const theme = document.documentElement.dataset.theme;
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121a16' : '#f3ede2');
}
appearance();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Its own service worker, scoped to /soma/, so it installs and opens offline as its own app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/soma/sw.js', { scope: '/soma/' }).catch(() => undefined);
  });
}
