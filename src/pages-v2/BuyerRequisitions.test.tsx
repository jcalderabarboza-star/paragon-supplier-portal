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

// ────────────────────────────────────────────────────────────────────────────
// CP-0 · W1 · PR-2b — the New-PR quantity is PARSED, and a refusal never
// reaches the command spine.
//
// `Number(form.qty)` read "4.500" as 4.5, so a buyer authoring 4,500 KG minted a
// real Draft PR for 4.5 KG. On a governed-fact surface a visible warning is not
// the guarantee — "nothing was dispatched, nothing was stored" is.
// ────────────────────────────────────────────────────────────────────────────

// A material the REQUISITIONS fixture does not already carry, so "did this push
// mint anything?" is answerable by name alone.
const PROBE_MATERIAL = 'Niacinamide B3 USP Grade (2b probe)';

const openNewPrForm = async (qty: string) => {
  renderWithProviders(<BuyerRequisitions />);
  await screen.findByText('Purchase Requisitions');
  fireEvent.click(screen.getByRole('button', { name: 'New PR' }));
  fireEvent.change(screen.getByPlaceholderText('e.g. Niacinamide B3 USP Grade'), {
    target: { value: PROBE_MATERIAL },
  });
  fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: qty } });
  const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'CC-RD-001 — R&D' } });
};

describe('BuyerRequisitions — an AMBIGUOUS quantity never becomes a PR (CP-0 · 2b)', () => {
  it('"4.500" REFUSES visibly — and dispatches nothing, stores nothing', async () => {
    purchaseRequisitionStore.reset();
    const before = purchaseRequisitionStore.all().length;
    await openNewPrForm('4.500');

    // "4.500" is 4500 under id and 4.5 under en. Both readings are plausible, so
    // neither may be produced — the old `Number()` silently picked the en one.
    const refusal = screen.getByTestId('new-pr-qty-refusal');
    expect(refusal.textContent?.trim()).not.toBe(''); // a reason is never blank

    // THE LOAD-BEARING ASSERTION: nothing reached the spine.
    const submit = screen.getByRole('button', { name: 'Submit for approval' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit); // even forced, the click short-circuits
    await waitFor(() => expect(purchaseRequisitionStore.all()).toHaveLength(before));
    expect(
      purchaseRequisitionStore.all().some((p) => p.material === PROBE_MATERIAL),
    ).toBe(false);
  });

  it('"4500" is accepted and mints the PR at 4,500 — never 4.5', async () => {
    purchaseRequisitionStore.reset();
    await openNewPrForm('4500');
    expect(screen.queryByTestId('new-pr-qty-refusal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));

    await waitFor(() => {
      const created = purchaseRequisitionStore
        .all()
        .find((p) => p.material === PROBE_MATERIAL);
      expect(created).toBeDefined();
      expect(created!.quantity).toBe(4_500);
    });
  });

  it('a blank quantity is not a zero commitment — submit stays shut, no PR is minted', async () => {
    purchaseRequisitionStore.reset();
    const before = purchaseRequisitionStore.all().length;
    await openNewPrForm('');
    // An untouched blank does not nag, but it is never submittable either: a
    // zero on a requisition must be TYPED, never defaulted out of an empty box.
    expect(screen.queryByTestId('new-pr-qty-refusal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));
    await waitFor(() => expect(purchaseRequisitionStore.all()).toHaveLength(before));
  });

  it('a comma token cannot reach the store as NaN — the flip widened the input, the parse closed it', async () => {
    purchaseRequisitionStore.reset();
    const before = purchaseRequisitionStore.all().length;
    // Behind type="number" a comma never arrived. On a text field it does, and
    // `Number("4,500")` is NaN — which survives the dispatcher's emptiness check,
    // the command target's `typeof === 'number'` test, and renders as a tidy "—".
    await openNewPrForm('4,500');
    expect(screen.getByTestId('new-pr-qty-refusal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit for approval' }));
    await waitFor(() => expect(purchaseRequisitionStore.all()).toHaveLength(before));
    expect(purchaseRequisitionStore.all().some((p) => Number.isNaN(p.quantity))).toBe(false);
  });
});
