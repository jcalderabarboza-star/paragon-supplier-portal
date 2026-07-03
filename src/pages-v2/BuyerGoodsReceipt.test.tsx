import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty result, not a persona.
const noGRs: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getGoodsReceipts') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerGoodsReceipt — four honest states', () => {
  it('data: renders the QC workspace with wired reads', async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Rejection Rate (30d)')).toBeInTheDocument();
    expect(screen.getByText('Goods Receipt & Quality Control')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Rejection Rate (30d)')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no goods receipts', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { service: noGRs });
    expect(await screen.findByText('No goods receipts yet')).toBeInTheDocument();
  });
});
