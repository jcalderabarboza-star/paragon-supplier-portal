import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdaptiveProvider } from './context/AdaptiveContext';
import { DataServiceProvider } from './services/data/DataServiceContext';
import { mockDataService } from './services/data/mock/mockDataService';
import './index.css';
import './styles/tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataServiceProvider service={mockDataService}>
      <AdaptiveProvider>
        <App />
      </AdaptiveProvider>
    </DataServiceProvider>
  </React.StrictMode>
);
