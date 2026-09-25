import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';
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
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';

// Default persona for page tests that don't care about identity.
//
// ⚠️ NOW EXPORTED, AND IT WAS ALREADY BEING IMPORTED. `buyerWidgets.test.tsx`
//   imported `BUYER` from here while it was module-local, so at runtime the
//   import was `undefined` — and the test worked ONLY because the `identity =
//   BUYER` DEFAULT PARAMETER below fires on `undefined` and substituted this very
//   constant. RIGHT RESULT, WRONG REASON, and one edit to that default away from
//   silently testing a different persona. `tsc` says so; nothing else could.
export const BUYER: CurrentIdentity = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  // THE SEEDED buyer seat — every LANE on that side, which is what a real seat
  // opens holding. Specs that want a NARROWED seat pass their own identity;
  // this default keeps the ~200 specs that predate the role split asserting
  // exactly what they asserted before.
  //
  // ⚠️ **IT READS THE SEED, NOT THE OFFER, AND THAT IS LOAD-BEARING.** They
  // were one constant until `buyer_all` landed; pointing this at the OFFER
  // would hand every default test seat the manager's role — silently widening
  // ~200 specs into asserting against a seat no user ever has.
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  // The portal has no persons; UNATTRIBUTED is the measured fact, not a stub.
  actor: NO_PERSON,
};

/**
 * THE SEEDED BUYER SEAT, ACTING AS A NAMED PERSON.
 *
 * ⚠️ **IT IS A SEPARATE CONSTANT AND NOT A WIDENING OF `BUYER`, DELIBERATELY.**
 * `BUYER.actor` is `UNATTRIBUTED`, which is the MEASURED fact about this
 * platform (no sign-in exists) and is what ~200 specs assert against. Changing
 * it would hand every one of them an attributed actor they never asked for, and
 * would silently delete the coverage of every unattributed render path.
 *
 * This exists because call-off step 1 made one lane refuse an unattributed seat
 * outright (Q6 — a delivery act creates supplier-facing obligations), so a spec
 * exercising a delivery WRITE has to adopt a person exactly as an operator does
 * on the identity panel. Use it for those; use `BUYER` for everything else.
 */
export const BUYER_NAMED: CurrentIdentity = {
  ...BUYER,
  actor: {
    kind: 'RESOLVED',
    person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'procurement')!.personId },
  },
};

/** The same seat acting as a named COMPLIANCE person — the lane that owns
 *  `delivery:policy-set`, which `procurement` deliberately does not hold. */
export const BUYER_NAMED_COMPLIANCE: CurrentIdentity = {
  ...BUYER,
  actor: {
    kind: 'RESOLVED',
    person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'compliance')!.personId },
  },
};

// The seeded supplier (sup-007) — pass to renderWithProviders for pages that
// gate on a supplier identity (e.g. SupplierWhatsApp -> NoSupplierIdentity).
export const SUPPLIER: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
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
  // Share a QueryClient across renders (e.g. to inspect the cache in a
  // scoping test). Defaults to a fresh per-render client.
  queryClient?: QueryClient;
}

// One wrapper every page test reuses: mirrors the real main.tsx -> AppRouter
// provider nesting, swapping HashRouter for MemoryRouter. A fresh QueryClient
// per call keeps the cache isolated between tests.
export function renderWithProviders(
  ui: React.ReactNode,
  { identity = BUYER, route = '/', service = mockDataService, queryClient }: RenderOptions = {},
) {
  const client =
    queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={client}>
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
    </QueryClientProvider>
    </I18nextProvider>,
  );
}
