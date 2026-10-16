import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../lamplight/tokens.css';
import '../lamplight/components.css';
import '../lamplight/motion.css';
import '../lamplight/icons.css';
import './guide.css';
import Guide from './Guide';

// The public guide to Lamplight: a page of its own, no account, nothing stored.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Guide />
  </React.StrictMode>,
);
