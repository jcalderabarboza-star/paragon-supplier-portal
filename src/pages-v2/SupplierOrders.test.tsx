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
  });

  it('confirm toast is honest (F2-24): correlationId surfaced, no false delivery claim', () => {
    const desc = i18n.t('po.confirm.success.desc', { correlationId: 'cmd_0001' });
    expect(desc).toBe('cmd_0001 recorded. Procurement notification pending live channel.');
    expect(desc).not.toMatch(/notified/i);
  });
});
