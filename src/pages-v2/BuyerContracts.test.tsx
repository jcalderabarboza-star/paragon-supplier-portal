import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import BuyerContracts from './BuyerContracts';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty contract result.
const noContracts: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getContracts') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerContracts — four honest states', () => {
  it('data: renders the contract workspace with wired reads', async () => {
    renderWithProviders(<BuyerContracts />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Overdue Obligations')).toBeInTheDocument();
    expect(screen.getByText('Active Contracts')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerContracts />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Overdue Obligations')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerContracts />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no contracts', async () => {
    renderWithProviders(<BuyerContracts />, { service: noContracts });
    expect(await screen.findByText('No contracts yet')).toBeInTheDocument();
  });
});
