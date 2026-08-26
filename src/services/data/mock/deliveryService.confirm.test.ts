import { afterEach, describe, expect, it } from 'vitest';
import { MockDeliveryService } from './MockDeliveryService';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

// The delivery lane's SECOND write, at the service seam. Fixtures: the at-scale
// demo fleet (deriveAgreementView over SCALE_DEMO_SHIPMENTS @ the shared SDC clock
// 2026-08-25). sa-1002 (ctr-004 / sup-005, AI-NIAC-6601, FRC) has TWO inferred
// matches — seq1 delivered late, seq2 on time — the perfect honesty-lock case.
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const SUPPLIER_005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const svc = new MockDeliveryService();

/** The item-10 view for one contract's single agreement. */
async function itemTen(contractId: string) {
  const page = await svc.getAgreements(BUYER, { contractId });
  return page.items[0].items.find((iv) => iv.item.lineSeq === 10)!;
}

describe('MockDeliveryService.confirmMatch — the second write', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('confirms an inferred match: deliveredQty climbs by exactly that qty, inferred true→false', async () => {
    const before = await itemTen('ctr-004');
    expect(before.ledger.deliveredQty).toBe(0); // nothing confirmed yet
    const seq2Before = before.fulfillment.find((f) => f.releaseSeq === 2)!;
    expect(seq2Before.inferred).toBe(true); // a proximity PROPOSAL
    expect(seq2Before.fulfillment).toBe('fulfilled');

    const result = await svc.confirmMatch(BUYER, 'sa-1002', 10, 2);
    expect(result.ok).toBe(true);

    const after = await itemTen('ctr-004');
    // seq2 plannedQty === observed shipment qty (20,000) → delivered climbs by exactly that.
    expect(after.ledger.deliveredQty).toBe(20_000);
    const seq2 = after.fulfillment.find((f) => f.releaseSeq === 2)!;
    expect(seq2.inferred).toBe(false); // now AUTHORITATIVE (explicit binding)
    const written = after.item.scheduleLines.find((l) => l.releaseSeq === 2)!;
    expect(written.fulfilledBy).toBe('ish-scale-1002-2');
    expect(written.actualQty).toBe(20_000);
    expect(written.confirmedAt).toBeDefined();
  });

  it('THE HONESTY LOCK: confirming one of two matches leaves the unconfirmed one at 0', async () => {
    await svc.confirmMatch(BUYER, 'sa-1002', 10, 2);

    const after = await itemTen('ctr-004');
    // Only seq2 was confirmed — deliveredQty is JUST seq2, never the still-inferred seq1.
    expect(after.ledger.deliveredQty).toBe(20_000);
    const seq1 = after.fulfillment.find((f) => f.releaseSeq === 1)!;
    expect(seq1.inferred).toBe(true); // still a proposal
    expect(after.item.scheduleLines.find((l) => l.releaseSeq === 1)!.actualQty).toBeUndefined();
  });

  it('ok returns the re-derived view so the caller renders without a second read', async () => {
    const result = await svc.confirmMatch(BUYER, 'sa-1002', 10, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = result.view.items.find((iv) => iv.item.lineSeq === 10)!;
      expect(item.ledger.deliveredQty).toBe(20_000);
    }
  });

  it('is buyer-only: a supplier scope is refused (SCOPE_DENIED), store untouched', async () => {
    const result = await svc.confirmMatch(SUPPLIER_005, 'sa-1002', 10, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('SCOPE_DENIED');
    const item = await itemTen('ctr-004');
    expect(item.ledger.deliveredQty).toBe(0); // the refusal never wrote
  });

  it('idempotence: re-confirming an already-confirmed line is refused ALREADY_CONFIRMED', async () => {
    await svc.confirmMatch(BUYER, 'sa-1002', 10, 2);
    const again = await svc.confirmMatch(BUYER, 'sa-1002', 10, 2);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('ALREADY_CONFIRMED');
  });

  it('a released line with NO matched delivery is NOTHING_TO_CONFIRM (sa-1001 seq1 missed)', async () => {
    const result = await svc.confirmMatch(BUYER, 'sa-1001', 10, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NOTHING_TO_CONFIRM');
  });

  it('a DRAFT line has no derived fulfillment → NOTHING_TO_CONFIRM (sa-1002 seq3 is draft)', async () => {
    // seqs 1–2 are released; seq3 is still draft. deriveFulfillment omits it, so
    // the service refuses before the pure NOT_RELEASED guard is reached.
    const result = await svc.confirmMatch(BUYER, 'sa-1002', 10, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NOTHING_TO_CONFIRM');
  });

  it('an unknown agreement or item is refused UNKNOWN_RELEASE_SEQ', async () => {
    const noAgreement = await svc.confirmMatch(BUYER, 'sa-9999', 10, 1);
    expect(noAgreement.ok).toBe(false);
    if (!noAgreement.ok) expect(noAgreement.reason).toBe('UNKNOWN_RELEASE_SEQ');
    const noItem = await svc.confirmMatch(BUYER, 'sa-1002', 99, 1);
    expect(noItem.ok).toBe(false);
    if (!noItem.ok) expect(noItem.reason).toBe('UNKNOWN_RELEASE_SEQ');
  });

  it('ctr-003 stays pristine: a sa-1002 confirm leaves the anchor all-draft, delivered 0', async () => {
    await svc.confirmMatch(BUYER, 'sa-1002', 10, 2);
    const anchor = await itemTen('ctr-003');
    expect(anchor.ledger.deliveredQty).toBe(0);
    expect(anchor.item.scheduleLines.every((l) => l.state === 'draft')).toBe(true);
  });
});
