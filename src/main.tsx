import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@ui5/webcomponents-react';
import App from './App';
import { AdaptiveProvider } from './context/AdaptiveContext';
import '@ui5/webcomponents-react/dist/Assets';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AdaptiveProvider>
        <App />
      </AdaptiveProvider>
    </ThemeProvider>
  </React.StrictMode>
);
