// ────────────────────────────────────────────────────────────────────────────
// RFQ create command integration (Phase A/2 — retire `extraRfqs`). The
// t_rfq_create verb dispatched through the REAL MockCommandService + the real
// rfqStore, read back through the real MockProcurementService. Honest proof that
// RFQ creation now rides the SAME dispatcher creation mechanism as t_pr_create /
// t_asn_create — NOT the client-fabricated `extraRfqs` merge (C6 §1 anti-pattern):
//   buyer create (buyer-only, creation-shape) → Open RFQ, store-assigned number,
//   list-visible via getRFQs; supplier → SCOPE_DENIED; missing required field →
//   failed, nothing minted; the created RFQ carries NO fabricated peer identity.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { rfqStore } from './stores/rfqStore';
import { DataError } from '../types';
import type { QueryScope } from '../types';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null };
const sup005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005' };
const svc = new MockCommandService();
const reads = new MockProcurementService();

const create = (overrides: Record<string, unknown> = {}) => ({
  transitionId: 't_rfq_create',
  entity: 'rfq',
  payload: {
    title: 'Q3 Emulsifier Sourcing — Cetearyl Alcohol',
    materialCategory: 'Emulsifiers',
    materialIds: ['EM-CETE-2201'],
    invitedSupplierIds: ['sup-002', 'sup-005'],
    responseDeadline: '2026-09-10',
    awardDeadline: '2026-09-20',
    totalQty: 3000,
    uom: 'KG',
    estimatedValue: 850_000_000,
    incoterms: 'CIF Jakarta',
    paymentTerms: 'Net 45',
    ...overrides,
  },
});

beforeEach(() => {
  rfqStore.reset();
});

describe('RFQ create — buyer-only creation dispatches (retires extraRfqs)', () => {
  it('a buyer raises an RFQ through t_rfq_create → Draft, store-assigned number', async () => {
    const res = await svc.dispatch(buyer, create());
    expect(res.status).toBe('done');
    expect(res.entityId).toMatch(/^RFQ-2026-9\d+$/); // store-assigned, distinct range
    const rfq = rfqStore.get(res.entityId!)!;
    // ⚠️ PF-1a · D-1 — DRAFT, not Open. FORK-2B had create+publish as ONE
    // buyer action; Paragon's practice is DRAFT → REVIEW → PUBLISH, so the
    // buyer publishes as a second deliberate act (`t_rfq_publish`).
    expect(rfq.status).toBe('Draft');
    expect(rfq.title).toBe('Q3 Emulsifier Sourcing — Cetearyl Alcohol');
    expect(rfq.materialCategory).toBe('Emulsifiers');
    expect(rfq.totalQty).toBe(3000);
    expect(rfq.invitedSupplierIds).toEqual(['sup-002', 'sup-005']);
    // The number doubles as the id (the GR/invoice/PR convention).
    expect(rfq.id).toBe(res.entityId);
    expect(rfq.rfqNumber).toBe(res.entityId);
    // No award metadata on a fresh RFQ.
    expect(rfq.awardedQuotationId).toBeUndefined();
  });

  it('a created RFQ is LIST-VISIBLE via getRFQs (seam read, not a local peer)', async () => {
    const before = (await reads.getRFQs(buyer)).items.length;
    const res = await svc.dispatch(buyer, create());
    const after = await reads.getRFQs(buyer);
    expect(after.items.length).toBe(before + 1);
    expect(after.items.some((r) => r.rfqNumber === res.entityId)).toBe(true);
  });

  it('a supplier is denied — RFQ creation is a buyer verb (SCOPE_DENIED, before the role gate)', async () => {
    await expect(svc.dispatch(sup005, create())).rejects.toBeInstanceOf(DataError);
    try {
      await svc.dispatch(sup005, create());
    } catch (e) {
      expect((e as DataError).code).toBe('SCOPE_DENIED');
    }
    // Nothing minted by the denied attempt.
    expect(rfqStore.all().every((r) => !/^RFQ-2026-9\d+$/.test(r.rfqNumber))).toBe(true);
  });

  it('rejects a missing required field (title) — no RFQ minted', async () => {
    const before = rfqStore.all().length;
    const res = await svc.dispatch(buyer, create({ title: '' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:title/);
    expect(rfqStore.all().length).toBe(before);
  });

  it('rejects a missing required field (materialCategory) — no RFQ minted', async () => {
    const before = rfqStore.all().length;
    const res = await svc.dispatch(buyer, create({ materialCategory: '' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:materialCategory/);
    expect(rfqStore.all().length).toBe(before);
  });

  // ── CP-0 · W1 · 2e-b-4a — totalQty joins the requiredFields floor ─────────
  //
  // THE POSITIVE TWIN FIRST. The negative specs below assert that an absent
  // quantity CANNOT dispatch; on their own that proves nothing, because a gate
  // that rejects everything would pass them too. The spec at the top of this
  // file already proves the other half — `totalQty: 3000` dispatches `done` and
  // lands as 3000 — and this restates it directly beside the refusals so the
  // pair is read together.
  it('POSITIVE TWIN: a stated quantity DOES dispatch and is stored verbatim', async () => {
    const res = await svc.dispatch(buyer, create({ totalQty: 2400 }));
    expect(res.status).toBe('done');
    expect(rfqStore.get(res.entityId!)!.totalQty).toBe(2400);
  });

  it('rejects an ABSENT totalQty — no RFQ minted (an event with no quantity is unanswerable)', async () => {
    const before = rfqStore.all().length;
    const res = await svc.dispatch(buyer, create({ totalQty: undefined }));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:totalQty/);
    expect(rfqStore.all().length).toBe(before);
  });

  it('a TYPED zero quantity still dispatches — requiredFields rules on absence, never on value', async () => {
    // `isEmpty` treats only undefined/null/'' as missing. A zero is a statement
    // the buyer made; the gate must not conflate it with one they did not make.
    // (Whether a zero-quantity RFQ is commercially legal is 4a-FIND-02.)
    const res = await svc.dispatch(buyer, create({ totalQty: 0 }));
    expect(res.status).toBe('done');
    expect(rfqStore.get(res.entityId!)!.totalQty).toBe(0);
  });

  it('an ABSENT estimatedValue is stored as an ABSENCE — never a fabricated Rp 0', async () => {
    const res = await svc.dispatch(buyer, create({ estimatedValue: undefined }));
    expect(res.status).toBe('done');
    const rfq = rfqStore.get(res.entityId!)!;
    // The retired `num('estimatedValue')` returned 0 here, minting a stated
    // budget of nothing out of a buyer who stated none.
    expect('estimatedValue' in rfq).toBe(false);
    expect(rfq.estimatedValue).toBeUndefined();
  });

  it('a STATED estimatedValue survives verbatim — omission is for absence only', async () => {
    const res = await svc.dispatch(buyer, create({ estimatedValue: 850_000_000 }));
    expect(rfqStore.get(res.entityId!)!.estimatedValue).toBe(850_000_000);
  });

  it('HONEST-BY-CONSTRUCTION: the created RFQ mints no downstream artifact (no PO/contract ref)', async () => {
    const res = await svc.dispatch(buyer, create());
    const rfq = rfqStore.get(res.entityId!)!;
    expect('poNumber' in rfq).toBe(false);
    expect('contractId' in rfq).toBe(false);
    // Nothing awarded — a fresh sourcing event carries no winner.
    expect(rfq.awardedSupplierId).toBeUndefined();
  });
});
