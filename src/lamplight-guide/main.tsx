import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource-variable/google-sans-flex/opsz.css';
import '../lamplight/tokens.css';
import '../lamplight/materials.css';
import '../lamplight/components.css';
import '../lamplight/motion.css';
import '../lamplight/icons.css';
import './guide.css';
import './preview.css';
import Guide from './Guide';

// The public guide to Lamplight: a page of its own, no account, nothing stored.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Guide />
  </React.StrictMode>,
);
