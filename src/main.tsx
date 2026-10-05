import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
// Fonts ship with the app, so they work offline and no font server sees a visit.
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import './styles/globals.css';
import { applyAppearance } from './app/appearance';
import { startDailyCopies } from './app/family/dailyCopy';

// Theme and text size before the first paint, and again when the phone switches light or dark.
applyAppearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => applyAppearance());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// A copy of everything, once a day, kept on this phone (Settings > Your data).
startDailyCopies();

// Offline support in production builds only, so development always loads fresh code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn('Offline support is unavailable.', error);
      });
  });
}
