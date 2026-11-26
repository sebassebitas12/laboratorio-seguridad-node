import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource-variable/newsreader';
import './styles/tokens.css';
import './styles/base.css';
import './styles/auth.css';
import './styles/workspace.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
