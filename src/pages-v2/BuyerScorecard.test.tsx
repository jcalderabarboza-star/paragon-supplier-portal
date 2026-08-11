import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerScorecard from './BuyerScorecard';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerScorecard — four honest states', () => {
  it('data: renders the scorecard with wired reads', async () => {
    renderWithProviders(<BuyerScorecard />);
    expect(await screen.findByText('Supplier Scorecard')).toBeInTheDocument();
    // The default-selected supplier appears in both the selector option and the
    // identity hero — proof the scorecard read resolved and drove the page.
    expect(
      (await screen.findAllByText('Sample Vitamins Co.')).length,
    ).toBeGreaterThan(0);
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerScorecard />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Supplier Scorecard')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerScorecard />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerScorecard />, { identity: SUPPLIER });
    expect(await screen.findByText('No scorecards yet')).toBeInTheDocument();
  });
});
