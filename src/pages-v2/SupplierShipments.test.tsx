import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import SupplierShipments from './SupplierShipments';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Empty = no ASNs AND no confirmed POs. Override both reads to [] while a valid
// supplier (sup-007) still resolves, so the empty branch is what renders.
const nothingToShip: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getASNs' || prop === 'getPurchaseOrders')
        return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierShipments — four honest states', () => {
  it('data: renders the ASN workspace scoped to the seeded supplier', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('Shipments & ASN')).toBeInTheDocument();
    // A real sup-007 ASN proves the wired, scoped read drove the list.
    expect(await screen.findByText('ASN-2025-00211')).toBeInTheDocument();
    // Another supplier's ASN must not leak in.
    expect(screen.queryByText('ASN-2025-00301')).not.toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    // ASN rows only render in the data branch.
    expect(screen.queryByText('ASN-2025-00211')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no ASNs or confirmed POs', async () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      service: nothingToShip,
    });
    expect(await screen.findByText('No shipments yet')).toBeInTheDocument();
  });
});
