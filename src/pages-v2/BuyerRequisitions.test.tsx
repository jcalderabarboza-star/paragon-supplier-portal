import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import BuyerRequisitions from './BuyerRequisitions';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

describe('BuyerRequisitions — four honest states', () => {
  it('data: renders the requisitions workspace with wired reads', async () => {
    renderWithProviders(<BuyerRequisitions />);
    expect(await screen.findByText('Purchase Requisitions')).toBeInTheDocument();
    // A relocated PR proves the read resolved and drove the table.
    expect(await screen.findByText('PR-2026-00341')).toBeInTheDocument();
    // Numeric estimatedValue renders through the compact IDR formatter (lowercase jt).
    expect(await screen.findByText('Rp 79.0jt')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<BuyerRequisitions />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Purchase Requisitions')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<BuyerRequisitions />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier persona (buyer-only view)', async () => {
    renderWithProviders(<BuyerRequisitions />, { identity: SUPPLIER });
    expect(await screen.findByText('No requisitions yet')).toBeInTheDocument();
  });
});

describe('BuyerRequisitions — the fabricated-number toast stub is retired (G1.2b)', () => {
  it('New PR submit dispatches a REAL t_pr_create — store-assigned PR-2026-9xx, not a fabricated 00xx', async () => {
    purchaseRequisitionStore.reset();
    renderWithProviders(<BuyerRequisitions />);
    await screen.findByText('Purchase Requisitions');

    // Open the New PR panel and fill the required fields (material + qty + date +
    // cost center gate `canSubmit`; t_pr_create requires material + quantity).
    fireEvent.click(screen.getByRole('button', { name: 'New PR' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Niacinamide B3 USP Grade'), {
      target: { value: 'Test Material B3' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '750' } });
    // The single date input + the cost-center select (the second combobox).
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'CC-RD-001 — R&D' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));

    // The dispatch really minted a Draft (store-assigned PR-2026-9xx) and the
    // invalidation makes it LIST-VISIBLE — the material appears in the table.
    // This is a real command outcome, not the old fabricated-number theater.
    expect(await screen.findByText('Test Material B3')).toBeInTheDocument();
    const created = purchaseRequisitionStore.all().find((p) => p.material === 'Test Material B3');
    expect(created).toBeDefined();
    expect(created!.prNumber).toMatch(/^PR-2026-9\d+$/); // store range, never PR-2026-00xx
    expect(created!.quantity).toBe(750);
  });
});
