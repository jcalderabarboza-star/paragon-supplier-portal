import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerShipments from './BuyerShipments';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier scope with no shipments — exercises the empty branch.
const NO_SHIPMENTS: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
};

describe('BuyerShipments — four honest states', () => {
  it('data: renders the shipments board once the reads resolve', async () => {
    renderWithProviders(<BuyerShipments />);
    expect(await screen.findByText('Shipments & ASN')).toBeInTheDocument();
    expect(await screen.findByText('Arriving Today')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerShipments />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Arriving Today')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerShipments />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when no shipments are in scope', async () => {
    renderWithProviders(<BuyerShipments />, { identity: NO_SHIPMENTS });
    expect(await screen.findByText('No shipments yet')).toBeInTheDocument();
  });
});
