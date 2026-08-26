import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import { mockDataService } from '../services/data/mock/mockDataService';
import { withChaos } from '../services/data/mock/withChaos';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '../services/data/mock/stores/asnStore';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import type { IDataService, QueryScope } from '../services/data/types';
import i18n from '../lib/i18n';
import SupplierShipments from './SupplierShipments';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
  commandAuditSink.clear();
});

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// Empty = no ASNs AND no confirmed POs. Override both reads to [] while a valid
// supplier (sup-007) still resolves, so the empty branch is what renders.
const nothingToShip: IDataService = {
  ...mockDataService,
  procurement: new Proxy(mockDataService.procurement, {
    get(target, prop, receiver) {
      if (prop === 'getASNs' || prop === 'getPurchaseOrders')
        return async () => ({ items: [] });
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }),
};

describe('SupplierShipments — four honest states', () => {
  it('data: renders the ASN workspace scoped to the seeded supplier', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('Shipments & ASN')).toBeInTheDocument();
    // A real sup-007 ASN proves the wired, scoped read drove the list.
    expect(await screen.findByText('ASN-2025-00211')).toBeInTheDocument();
    // Another supplier's ASN must not leak in.
    expect(screen.queryByText('ASN-2025-00301')).not.toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      service: alwaysPending,
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    // ASN rows only render in the data branch.
    expect(screen.queryByText('ASN-2025-00211')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      service: alwaysFails,
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when there are no ASNs or confirmed POs', async () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      service: nothingToShip,
    });
    expect(await screen.findByText('No shipments yet')).toBeInTheDocument();
  });
});

describe('SupplierShipments — ASN verbs (Step 4 batch i)', () => {
  const supScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

  it('chain: confirm PO → create ASN (creation-shape) → submit (Draft→Submitted)', async () => {
    // Confirm PO-2025-00108 so it is a Confirmed PO awaiting an ASN.
    await mockDataService.commands.dispatch(supScope, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-008',
      payload: { confirmedQuantities: [150000] },
    });

    // Creation verb: no input id; the store assigns the ASN number (no fabrication).
    const createRes = await mockDataService.commands.dispatch(supScope, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: { poReference: 'PO-2025-00108', carrier: 'Sample Courier', trackingNumber: 'SMPL123', eta: '2026-05-10' },
    });
    expect(createRes.status).toBe('done');
    expect(createRes.entityId).toMatch(/^ASN-2026-9\d+$/);
    const created = asnStore.get(createRes.entityId!);
    expect(created?.status).toBe('Draft');
    expect(created?.poReference).toBe('PO-2025-00108');
    expect(created?.lineItems.length).toBeGreaterThan(0); // derived from the PO

    // Submit verb: Draft → Submitted.
    const submitRes = await mockDataService.commands.dispatch(supScope, {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: createRes.entityId!,
      payload: { carrier: 'Sample Courier', trackingNumber: 'SMPL123', eta: '2026-05-10' },
    });
    expect(submitRes.status).toBe('done');
    expect(asnStore.get(createRes.entityId!)?.status).toBe('Submitted');
  });

  it('UI: "Create ASN" on a confirmed PO drafts a store-assigned ASN', async () => {
    await mockDataService.commands.dispatch(supScope, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-008',
      payload: { confirmedQuantities: [150000] },
    });
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });

    // The confirmed PO surfaces in the "awaiting ASN" panel with a Create action.
    expect(await screen.findByText('PO-2025-00108')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create ASN' }));

    // A Draft ASN was created for that PO — store re-derives; no fabricated id.
    await waitFor(() =>
      expect(asnStore.all().some((a) => a.poReference === 'PO-2025-00108')).toBe(true),
    );
    const done = commandAuditSink.byEvent('t_asn_create').filter((e) => e.outcome === 'done');
    expect(done).toHaveLength(1);
    expect(done[0].actor).toBe('supplier:sup-007');
  });

  it('UI: submit drawer with no fields → dispatcher rejects (MISSING_FIELDS, stays Draft)', async () => {
    // Fixture Draft ASN-2025-00215 has blank shipment details.
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' })); // opens the drawer
    // Submit without filling tracking / ETA → the requiredFields enforcement rejects.
    fireEvent.click(await screen.findByRole('button', { name: 'Submit ASN' }));
    await waitFor(() =>
      expect(commandAuditSink.byEvent('t_asn_submit').some((e) => e.outcome === 'failed')).toBe(true),
    );
    expect(asnStore.get('ASN-2025-00215')?.status).toBe('Draft');
  });

  it('UI: submit drawer WITH fields → Submitted (list re-derives)', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.change(await screen.findByLabelText('Tracking number'), { target: { value: 'SMPL999' } });
    fireEvent.change(screen.getByLabelText('Estimated arrival'), { target: { value: '2026-05-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit ASN' }));
    await waitFor(() => expect(asnStore.get('ASN-2025-00215')?.status).toBe('Submitted'));
    expect(
      commandAuditSink.byEvent('t_asn_submit').filter((e) => e.outcome === 'done'),
    ).toHaveLength(1);
  });

  it('submit rejection copy is human-readable with the code retained (i18n)', () => {
    const desc = i18n.t('asn.submit.missingFields', { code: 'MISSING_FIELDS:eta' });
    expect(desc).toContain('Carrier, tracking number and ETA are required');
    expect(desc).toContain('MISSING_FIELDS:eta');
  });
});
