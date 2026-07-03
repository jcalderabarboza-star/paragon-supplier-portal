import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import BuyerSourcing from './BuyerSourcing';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Buyer-only aggregate — empty is reached by an empty RFQ result, not a persona.
const noRfqs: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getRFQs') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerSourcing — four honest states', () => {
  it('data: renders the sourcing workspace with wired reads', async () => {
    renderWithProviders(<BuyerSourcing />);
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Ready to Award')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Response')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerSourcing />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Ready to Award')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerSourcing />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no RFQs', async () => {
    renderWithProviders(<BuyerSourcing />, { service: noRfqs });
    expect(await screen.findByText('No sourcing events yet')).toBeInTheDocument();
  });
});
