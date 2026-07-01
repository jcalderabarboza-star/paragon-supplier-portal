import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataServiceProvider } from '../services/data/DataServiceContext';
import { mockDataService } from '../services/data/mock/mockDataService';
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
}

// One wrapper every page test reuses: mirrors the real main.tsx -> AppRouter
// provider nesting, swapping HashRouter for MemoryRouter.
export function renderWithProviders(
  ui: React.ReactNode,
  { identity = BUYER, route = '/' }: RenderOptions = {},
) {
  return render(
    <DataServiceProvider service={mockDataService}>
      <AdaptiveProvider>
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>
            <CurrentIdentityProvider source={stubSource(identity)}>
              {ui}
            </CurrentIdentityProvider>
          </ToastProvider>
        </MemoryRouter>
      </AdaptiveProvider>
    </DataServiceProvider>,
  );
}
