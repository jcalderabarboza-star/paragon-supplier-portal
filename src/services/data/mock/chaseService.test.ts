import { describe, expect, it } from 'vitest';
import { MockChaseService } from './MockChaseService';
import { mockDataService } from './mockDataService';
import type { ICollaborationService, IDeliveryService, QueryScope } from '../types';
import type { ChaseEntry } from '../../sdc';
import { deriveAgreementView } from '../../delivery/views';
import { SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS } from '../../delivery/demoFixtures';
import { SDC_SIMULATED_NOW } from '../../sdc';

// ─────────────────────────────────────────────────────────────────────────────
// SDC-5d — the unified chase SERVICE (the composition point). Composes the two
// existing read seams (collaboration.getChase + delivery.getAgreements → the 5a
// commitment chase) via the pure 5c reducer, buyer-gated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007' };

/** A collaboration stub returning a fixed data-chase list (only getChase is used). */
function collabStub(entries: ChaseEntry[]): ICollaborationService {
  return { getChase: async () => ({ items: entries }) } as unknown as ICollaborationService;
}

/** A delivery stub returning fixed agreement views (only getAgreements is used). */
function deliveryStub(views: ReturnType<typeof deriveAgreementView>[]): IDeliveryService {
  return { getAgreements: async () => ({ items: views }) } as unknown as IDeliveryService;
}

const demoView = () =>
  deriveAgreementView(SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS, SDC_SIMULATED_NOW, 'PT Berlina');

describe('MockChaseService.getUnifiedChase — composition', () => {
  it('folds both families into per-supplier views (commitment-only + data-only)', async () => {
    const svc = new MockChaseService(
      collabStub([{ supplierId: 'sup-005', reason: 'overdue', awaitingLines: 2, dueAt: '2026-08-22T00:00:00.000Z' }]),
      deliveryStub([demoView()]), // sa-0002 / sup-007 → real commitment chase
    );
    const { items } = await svc.getUnifiedChase(buyerScope);
    const by = new Map(items.map((v) => [v.supplierId, v]));

    // sup-007 is commitment-only (the sa-0002 chase rows), no data reason.
    expect(by.get('sup-007')!.commitmentEntries.length).toBeGreaterThan(0);
    expect(by.get('sup-007')!.dataReasons).toEqual([]);
    // sup-005 is data-only.
    expect(by.get('sup-005')!.dataReasons).toEqual(['overdue']);
    expect(by.get('sup-005')!.commitmentEntries).toEqual([]);
  });

  it('a supplier appearing in BOTH families carries both under one view', async () => {
    const svc = new MockChaseService(
      collabStub([{ supplierId: 'sup-007', reason: 'partial-response', awaitingLines: 1, dueAt: '2026-08-22T00:00:00.000Z' }]),
      deliveryStub([demoView()]),
    );
    const { items } = await svc.getUnifiedChase(buyerScope);
    const sup007 = items.find((v) => v.supplierId === 'sup-007')!;
    expect(sup007.dataReasons).toEqual(['partial-response']);
    expect(sup007.commitmentEntries.length).toBeGreaterThan(0);
    expect(sup007.chaseCount).toBe(1 + sup007.commitmentEntries.length);
  });

  it('is BUYER-GATED — a supplier persona resolves an empty chase (a supplier does not chase itself)', async () => {
    const svc = new MockChaseService(
      collabStub([{ supplierId: 'sup-007', reason: 'overdue', awaitingLines: 1, dueAt: '2026-08-22T00:00:00.000Z' }]),
      deliveryStub([demoView()]),
    );
    expect((await svc.getUnifiedChase(supplierScope)).items).toEqual([]);
  });
});

describe('MockChaseService — over the real wired service', () => {
  it('the buyer sees a coherent non-empty unified chase; a supplier sees none', async () => {
    const buyer = await mockDataService.chase.getUnifiedChase(buyerScope);
    expect(buyer.items.length).toBeGreaterThan(0);
    // sup-007 (sa-0002) is present with its real commitment chase.
    const sup007 = buyer.items.find((v) => v.supplierId === 'sup-007');
    expect(sup007?.commitmentEntries.length).toBeGreaterThan(0);
    // The buyer gate (a supplier does not chase itself).
    expect((await mockDataService.chase.getUnifiedChase(supplierScope)).items).toEqual([]);
  });
});
