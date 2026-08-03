import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import type { IDataService } from '../services/data/types';
import i18n from '../lib/i18n';
import SupplierOrders from './SupplierOrders';

// The command layer mutates a shared store + audit sink — reset between tests.
beforeEach(() => {
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Valid supplier (sup-007) but no POs — override just getPurchaseOrders to [].
const noOrders: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getPurchaseOrders') return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierOrders — four honest states', () => {
  it('data: renders the scoped PO workspace with wired reads', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    // KPI strip only renders in the data branch.
    expect(await screen.findByText('Total Value Pending')).toBeInTheDocument();
    // A real sup-007 PO proves the scoped read drove the table.
    expect(await screen.findByText('PO-2025-00108')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Value Pending')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no purchase orders', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      service: noOrders,
    });
    expect(await screen.findByText('No purchase orders yet')).toBeInTheDocument();
  });
});

describe('SupplierOrders — PO-confirm end-to-end proof (Step 3.10)', () => {
  it('confirms a Sent PO through the dispatcher: store mutates + event emitted', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });

    // The Sent PO (PO-2025-00108 / po-008) surfaces a "Confirm" row action.
    await screen.findByText('PO-2025-00108');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    // Editing panel opens → dispatch t_po_confirm with the confirmedQuantities payload.
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm order' }));

    // Success surface renders (driven by the non-failed command outcome).
    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();

    // 3.6: the store mutated (Sent → Confirmed) — no page-local seeded copy.
    expect(purchaseOrderStore.get('po-008')?.status).toBe('Confirmed');
    expect(purchaseOrderStore.get('po-008')?.lineItems[0].confirmedQty).toBe(150000);

    // 3.8: exactly one done event was emitted, actor-scoped to sup-007.
    const done = commandAuditSink.byEvent('t_po_confirm').filter((e) => e.outcome === 'done');
    expect(done).toHaveLength(1);
    expect(done[0].actor).toBe('supplier:sup-007');

    // KPI cards, tab counts, and the banner must re-derive from the SAME
    // invalidated query as the table — no parallel/local derivation, no stale
    // memo. Both sup-007 POs are now Confirmed → needsAction 0, inProgress 2.
    expect(await screen.findByText('All actions cleared')).toBeInTheDocument();
    expect(screen.queryByText(/need your confirmation/i)).not.toBeInTheDocument();
    const inProgressTab = screen.getByRole('tab', { name: /In progress/ });
    expect(within(inProgressTab).getByText('2')).toBeInTheDocument();

    // Riding fix: the drawer Key Facts derives from the live query, not the
    // frozen open-time snapshot. po-008 is now Confirmed, so no 'Sent' status
    // lingers anywhere — neither the table row nor the drawer.
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
  });

  it('confirm toast is honest (F2-24): correlationId surfaced, no false delivery claim', () => {
    const desc = i18n.t('po.confirm.success.desc', { correlationId: 'cmd_0001' });
    expect(desc).toBe('cmd_0001 recorded. Procurement notification pending live channel.');
    expect(desc).not.toMatch(/notified/i);
  });
});

// ── CP-0 · W1 · 2f-c — the confirm cells, and why the TYPE is the test ───────
//
// 2f-FIND-03 (as amended). The cells were `type="number"` read with a bare
// `Number()`, and that failure is invisible in this suite: en-US Chrome returns
// "1.500" verbatim and jsdom does no locale parsing at all (4b-FIND-01). So the
// durable lock is the INPUT CONTRACT — `type="text"` + `inputMode` — with the
// behavioural specs stacked on top, honest about what they can prove.
//
// THE INVERTED LOCKS: 2f-b was one lock by necessity (no dispatcher). Here the
// SECOND lock (`poConfirmQtyWithinOrdered`) exists and holds — these specs
// guard the FIRST, and the policy's own first direct unit tests live in
// `services/transitions/policies.test.ts`.
describe('SupplierOrders — the confirm cells are text, so the parser is load-bearing', () => {
  /** Open PO-2025-00108 (sup-007, Sent, one line: 150,000 PCS) in editing mode. */
  const openEditing = async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER });
    await screen.findByText('PO-2025-00108');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    return screen.findByLabelText('Confirmed PK-PETB-8802');
  };

  it('THE LOCK — the cell is not type="number" (Ruling 6.2)', async () => {
    const cell = await openEditing();
    expect(cell).toHaveAttribute('type', 'text');
    expect(cell).toHaveAttribute('inputmode', 'decimal');
    // min/max were number-input affordances that never bound anything; the
    // bound is the policy's, mirrored on the surface from the SAME predicate.
    expect(cell).not.toHaveAttribute('min');
    expect(cell).not.toHaveAttribute('max');
  });

  it('SEEDS canonical ungrouped digits — 150000, not the "150.000" the parser refuses', async () => {
    const cell = await openEditing();
    expect(cell).toHaveValue('150000');
    expect(screen.queryByTestId('po-confirm-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm order' })).not.toBeDisabled();
  });

  it('POSITIVE TWIN — an edited readable quantity DISPATCHES and stores the parsed number', async () => {
    // A negative assertion alone proves nothing (the 2e-b-4a rule): a reduced
    // confirmation must still go through, end to end, into the store.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '120000' } });
    expect(screen.queryByTestId('po-confirm-refusal-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm order' }));
    expect(await screen.findByText('Order confirmed')).toBeInTheDocument();
    expect(purchaseOrderStore.get('po-008')?.lineItems[0].confirmedQty).toBe(120000);
  });

  it('a cross-convention "1.500" REFUSES at the cell and disables Confirm — the token the policy passes as 1.5', async () => {
    // The live defect: 0 < 1.5 ≤ 150000 satisfies the bounds policy, so the
    // misread was stamped onto the stored line and poisoned expectedValue,
    // the 3-way match input. The FIRST lock is the only one that can catch it.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '1.500' } });
    const refusal = screen.getByTestId('po-confirm-refusal-0');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal.textContent).toMatch(/can be read two ways/i);
    expect(cell).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
    expect(purchaseOrderStore.get('po-008')?.status).toBe('Sent');
  });

  it('a CLEARED cell refuses by name — no fabricated zero, no dispatcher debug-string toast', async () => {
    // Retired path: Number('') fabricated 0 into state, dispatched, and the
    // policy bounced it with a raw English bounds string. Now the refusal is
    // at the cell, translated, before any dispatch exists to fail.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '' } });
    expect(screen.getByTestId('po-confirm-refusal-0').textContent).toMatch(
      /not a confirmation of none/i,
    );
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  });

  it('a typed ZERO parses and the BOUNDS MIRROR speaks — courtesy on the surface, law in the policy', async () => {
    // The zero is READ (a real assertion); it is the policy's 0 < q that
    // refuses it, and the mirror explains that bound pre-dispatch using the
    // SAME shared predicate the policy runs. Confirm-disabled is UX; the
    // policy refusal is the guarantee.
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '0' } });
    expect(screen.queryByTestId('po-confirm-refusal-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('po-confirm-bounds-0').textContent).toMatch(
      /between 1 and 150,?000/i,
    );
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  });

  it('an OVER-ORDERED quantity gets the same mirror, naming the line’s own bound', async () => {
    const cell = await openEditing();
    fireEvent.change(cell, { target: { value: '150001' } });
    expect(screen.getByTestId('po-confirm-bounds-0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeDisabled();
  });

  it('the diff warning derives from the PARSED read — suppressed under a refusal, never summed over a guess', async () => {
    const cell = await openEditing();
    // A readable short-confirmation raises the honest diff warning…
    fireEvent.change(cell, { target: { value: '120000' } });
    expect(
      screen.getByText(/Confirmed values differ from the original PO/i),
    ).toBeInTheDocument();
    // …an unreadable token suppresses it: the refusal speaks instead.
    fireEvent.change(cell, { target: { value: '1.500' } });
    expect(
      screen.queryByText(/Confirmed values differ from the original PO/i),
    ).not.toBeInTheDocument();
  });
});
