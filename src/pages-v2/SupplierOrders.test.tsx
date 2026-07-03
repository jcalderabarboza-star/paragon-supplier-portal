import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import SupplierOrders from './SupplierOrders';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Valid supplier (sup-007) but no POs — override just getPurchaseOrders to [].
const noOrders: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getPurchaseOrders') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierOrders — four honest states', () => {
  it('data: renders the scoped PO workspace with wired reads', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Total Value Pending')).toBeInTheDocument();
    // A real sup-007 PO proves the scoped read drove the table.
    expect(await screen.findByText('PO-2025-00108')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Value Pending')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no purchase orders', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: noOrders,
    });
    expect(await screen.findByText('No purchase orders yet')).toBeInTheDocument();
  });
});
