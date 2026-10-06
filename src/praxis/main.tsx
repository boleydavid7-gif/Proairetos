import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../styles/tokens.css';
import './praxis.css';
import '../app/family/account.css';
import { applyAppearance } from '../app/appearance';
import { startDailyCopies } from '../app/family/dailyCopy';
import PraxisApp from './PraxisApp';

applyAppearance();
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => applyAppearance());
startDailyCopies();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PraxisApp />
  </React.StrictMode>,
);
