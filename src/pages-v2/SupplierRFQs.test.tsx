import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import SupplierRFQs from './SupplierRFQs';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Valid supplier (sup-007) with no invited RFQs and no quotations → empty.
const nothing: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getRFQs' || prop === 'getQuotations')
        return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierRFQs — four honest states + wired reads', () => {
  it('data: open-RFQ list is driven by the scoped useRFQs read', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Open Events')).toBeInTheDocument();
    // sup-007 is invited to the Open RFQ-2026-002 — proves the wired read.
    expect(await screen.findByText('RFQ-2026-002')).toBeInTheDocument();
    // Partial migration: the sampled per-card detail is honestly flagged.
    expect(await screen.findAllByText('Sample detail')).toHaveLength(1);
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Open Events')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no invited RFQs or quotes', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER, service: nothing });
    expect(await screen.findByText('No sourcing events yet')).toBeInTheDocument();
  });
});
