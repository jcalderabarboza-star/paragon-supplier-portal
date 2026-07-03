import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import type { IDataService } from '../services/data/types';
import BuyerInventory from './BuyerInventory';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Inventory is supplier-scoped (not a buyer-only aggregate), so the empty state
// is reached by an empty result. Override just getInventory to return [] while
// delegating every other procurement method to the real mock.
const noInventory: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getInventory') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('BuyerInventory — four honest states', () => {
  it('data: renders the inventory workspace with wired reads', async () => {
    renderWithProviders(<BuyerInventory />);
    // The KPI strip only renders in the data branch — proof the read resolved.
    expect(await screen.findByText('Total Materials Tracked')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerInventory />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Materials Tracked')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerInventory />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no inventory positions', async () => {
    renderWithProviders(<BuyerInventory />, { service: noInventory });
    expect(await screen.findByText('No inventory positions yet')).toBeInTheDocument();
  });
});
