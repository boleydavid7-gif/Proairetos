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
import './praxis.css';
import '../styles/premium.css';
import '../app/family/account.css';
import { applyAppearance } from '../app/appearance';
import { startDailyCopies } from '../app/family/dailyCopy';
import { markAdded } from '../app/family/added';
import PraxisApp from './PraxisApp';
import { notifications } from '../app/notify/notifications';

// Praxis is a dark study room in either appearance (like Theoria's library): the text size follows
// Proairetos, the colours stay, so nothing goes dark on dark.
const appearance = () => {
  applyAppearance();
  document.documentElement.dataset.theme = 'dark';
};
appearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', appearance);
window.addEventListener('storage', appearance);
startDailyCopies();
markAdded('praxis');
notifications.start();

// Proairetos's own service worker (scope /) keeps Praxis's page for offline use and shows the notice when a
// block ends, even with Praxis closed. Registered here too, because each Home Screen app on an iPhone keeps
// its own storage and would otherwise never have it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><PraxisApp /></ErrorBoundary>
  </React.StrictMode>,
);
