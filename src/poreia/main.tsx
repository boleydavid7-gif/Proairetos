import '../app/family/decideAdded';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from '../app/ErrorBoundary';
import AddedOnly from '../app/family/AddedOnly';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';
import App from './app/App';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../askesis/styles/askesis.css';
import '../styles/premium.css';
import '../app/family/account.css';
import './styles/poreia.css';

document.documentElement.classList.add('poreia');
withLamplight((look, light) => applyLamplight(look, light, 'poreia'));
applyAppearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => applyAppearance());

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><AddedOnly app="poreia"><App /></AddedOnly></ErrorBoundary></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/poreia/sw.js', { scope: '/poreia/' }).catch(() => undefined);
  });
}
