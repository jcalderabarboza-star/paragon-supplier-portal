import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataServiceProvider } from '../services/data/DataServiceContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import type { IDataService } from '../services/data/types';
import { AdaptiveProvider } from '../context/AdaptiveContext';
import { ToastProvider } from '../hooks/useToast';
import { CurrentIdentityProvider } from '../context/CurrentIdentityContext';
import type {
  CurrentIdentity,
  IdentitySource,
} from '../context/CurrentIdentityContext';

// Default persona for page tests that don't care about identity.
const BUYER: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
};

// The seeded supplier (sup-007) — pass to renderWithProviders for pages that
// gate on a supplier identity (e.g. SupplierWhatsApp -> NoSupplierIdentity).
export const SUPPLIER: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Berlina Packaging Indonesia',
};

const stubSource = (identity: CurrentIdentity): IdentitySource => ({
  load: () => identity,
  save: () => {},
});

interface RenderOptions {
  identity?: CurrentIdentity;
  route?: string;
  // Override the data service — e.g. pass withChaos(mockDataService, {failureRate: 1})
  // to exercise error states deterministically. Defaults to the plain mock.
  service?: IDataService;
}

// One wrapper every page test reuses: mirrors the real main.tsx -> AppRouter
// provider nesting, swapping HashRouter for MemoryRouter. A fresh QueryClient
// per call keeps the cache isolated between tests.
export function renderWithProviders(
  ui: React.ReactNode,
  { identity = BUYER, route = '/', service = mockDataService }: RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DataServiceProvider service={service}>
        <AdaptiveProvider>
          <MemoryRouter initialEntries={[route]}>
            <ToastProvider>
              <CurrentIdentityProvider source={stubSource(identity)}>
                {ui}
              </CurrentIdentityProvider>
            </ToastProvider>
          </MemoryRouter>
        </AdaptiveProvider>
      </DataServiceProvider>
    </QueryClientProvider>,
  );
}
