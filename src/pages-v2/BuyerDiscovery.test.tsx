import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import BuyerDiscovery from './BuyerDiscovery';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerDiscovery — four honest states', () => {
  it('data: renders discovery for the buyer once the reads resolve', async () => {
    renderWithProviders(<BuyerDiscovery />);
    expect(await screen.findByText('Supplier Discovery')).toBeInTheDocument();
    // Batch C — the leading tile is now the gap count. `Candidates Identified`
    // is gone: it read 18 over a fixture of 8 and counted nothing.
    expect(await screen.findByText('Dual-Source Gaps')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerDiscovery />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Dual-Source Gaps')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerDiscovery />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only surface)', async () => {
    renderWithProviders(<BuyerDiscovery />, { identity: SUPPLIER });
    expect(await screen.findByText('No discovery data yet')).toBeInTheDocument();
  });

  it('honesty (CI-0): Market Intelligence declares SIMULATED and carries no fabricated source names', async () => {
    renderWithProviders(<BuyerDiscovery />);
    fireEvent.click(await screen.findByRole('tab', { name: /Market Intelligence/ }));
    // D-CENSUS-8 — was findByText, which now finds TWO and throws. That second
    // marker is the fix this batch shipped: the page-level ProvenanceMarker. Before
    // it, the ONLY marker on /buyer/discovery was this tab's pill, so the candidate
    // pool — the page's actual claim — read as trustworthy because the marker beside
    // it belonged to a sibling tab (MARKER-SCOPE-01). Asserting the count keeps both.
    // DISCOVERY-REAL-SUBJECTS-01 (C) — the page-level marker no longer says a bare
    // "Sample": `supplierDiscovery` is now HARVEST-GATED, so it reads the readiness
    // note and states WHY. That is strictly more honest than the count this line
    // used to assert, so the assertion moved from counting markers to reading them.
    expect(await screen.findByText('Sample — awaiting supplier-discovery feed'))
      .toBeInTheDocument();
    // …and the market-intel tab keeps its own capability pill, unchanged.
    expect(screen.getByText('Sample')).toBeInTheDocument();
    // The invented source attributions are deleted (not relabelled) …
    expect(screen.queryByText(/IFRA index/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Niacinamide spot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ICIS PET index/)).not.toBeInTheDocument();
    // … while the SIMULATED trend figure itself remains.
    expect(screen.getByText('+2.1% this month')).toBeInTheDocument();
  });
});
