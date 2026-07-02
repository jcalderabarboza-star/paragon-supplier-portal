import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AdaptiveProvider } from './context/AdaptiveContext';
import { DataServiceProvider } from './services/data/DataServiceContext';
import { mockDataService } from './services/data/mock/mockDataService';
import { queryClient } from './services/query/queryClient';
import './index.css';
import './styles/tailwind.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DataServiceProvider service={mockDataService}>
        <AdaptiveProvider>
          <App />
        </AdaptiveProvider>
      </DataServiceProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
