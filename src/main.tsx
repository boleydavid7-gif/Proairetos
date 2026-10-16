import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import ErrorBoundary from './app/ErrorBoundary';
// Fonts ship with the app, so they work offline and no font server sees a visit.
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import './styles/globals.css';
import './styles/premium.css';
import './app/family/account.css';
import { applyAppearance, withLamplight } from './app/appearance';
import { applyLamplight } from './app/lamplight';
import { startDailyCopies } from './app/family/dailyCopy';
import { startLaunchFiles } from './app/family/launchFiles';

// Files opened with this app on a computer (Chrome, Edge) wait for the page that takes them.
startLaunchFiles();

// Theme, text size, room and color before the first paint, and again when the phone switches light or dark.
withLamplight((appearance, light) => applyLamplight(appearance, light, 'proairetos'));
applyAppearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => applyAppearance());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// A copy of everything, once a day, kept on this device (Settings > Your data).
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
