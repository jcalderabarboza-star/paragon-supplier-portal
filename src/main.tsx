import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AdaptiveProvider } from './context/AdaptiveContext';
import { DataServiceProvider } from './services/data/DataServiceContext';
import { mockDataService } from './services/data/mock/mockDataService';
import { withChaos, chaosConfigFromEnv } from './services/data/mock/withChaos';
import { queryClient } from './services/query/queryClient';
import type { IDataService } from './services/data/types';
import './index.css';
import './styles/tailwind.css';

// Chaos is dev-only and opt-in (VITE_CHAOS=on). import.meta.env.DEV is false
// in the production build, so withChaos is tree-shaken out of the Vercel bundle.
const service: IDataService =
  import.meta.env.DEV && import.meta.env.VITE_CHAOS === 'on'
    ? withChaos(mockDataService, chaosConfigFromEnv())
    : mockDataService;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DataServiceProvider service={service}>
        <AdaptiveProvider>
          <App />
        </AdaptiveProvider>
      </DataServiceProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
