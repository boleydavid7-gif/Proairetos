import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource-variable/google-sans-flex/opsz.css';
import '../askesis/styles/askesis.css';
import '../app/family/apps.css';
import '../styles/premium.css';
import './lab.css';
import { applyAppearance, withLamplight } from '../app/appearance';
import { applyLamplight } from '../app/lamplight';
import Lab from './Lab';

// A blank page for trying out how Lamplight's surfaces take light. Only the owner's devices show anything (the same
// cached sign that opens the Store); it holds no data, writes nothing and is not listed anywhere.
withLamplight((look, light) => applyLamplight(look, light, 'proairetos'));
applyAppearance();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Lab />
  </React.StrictMode>,
);
