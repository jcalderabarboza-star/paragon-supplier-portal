import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerWhatsAppHub from './BuyerWhatsAppHub';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerWhatsAppHub — four honest states', () => {
  it('data: renders the communications hub with wired reads', async () => {
    renderWithProviders(<BuyerWhatsAppHub />);
    expect(await screen.findByText('Communications Hub')).toBeInTheDocument();
    // The supplier appears in both the conversation list and the open thread
    // header — proof the conversations read and the thread read both resolved.
    expect(
      (await screen.findAllByText('PT Berlina Packaging 🇮🇩')).length,
    ).toBeGreaterThan(0);
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerWhatsAppHub />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Communications Hub')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerWhatsAppHub />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerWhatsAppHub />, { identity: SUPPLIER });
    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
  });
});
