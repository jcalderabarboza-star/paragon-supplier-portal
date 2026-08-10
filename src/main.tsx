import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n from './lib/i18n';
import { AdaptiveProvider } from './context/AdaptiveContext';
import { DataServiceProvider } from './services/data/DataServiceContext';
import { mockDataService } from './services/data/mock/mockDataService';
import { seedEnforcementLedger } from './services/data/mock/enforcementSeed';
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

const renderApp = () =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <DataServiceProvider service={service}>
            <AdaptiveProvider>
              <App />
            </AdaptiveProvider>
          </DataServiceProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </React.StrictMode>
  );

// CP-3 · E4 — the enforcement ledger's OPENING ACT, before the first paint.
//
// It is a DISPATCHED verb (so it lands in the DR-10 trail), and a dispatch is
// async, so the render waits for it. Racing it would not change what any gate
// DOES — an unseeded check derives `BLOCK / NO_SETTING_RECORDED`, the same
// consequence — but it would briefly make the PROVENANCE wrong, reporting
// "nobody has ruled" for a check the operator has ruled on.
//
// ⚠️ AND IT RENDERS EITHER WAY. A seed that does not land leaves the ledger
// empty, which is the SAFE state and an honest one; refusing to boot over lost
// provenance would trade a real capability for a cosmetic one. The failure is
// reported rather than swallowed — that is the part that must not be silent.
seedEnforcementLedger()
  .then((outcomes) => {
    const refused = outcomes.filter((o) => o.status === 'refused');
    if (refused.length > 0) {
      console.error('[CP-3 · E4] the enforcement seed did not land:', refused);
    }
  })
  .catch((err) => {
    console.error('[CP-3 · E4] the enforcement seed threw:', err);
  })
  .then(renderApp);
