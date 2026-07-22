import { afterEach, describe, expect, it } from 'vitest';
import { MockDeliveryService } from './MockDeliveryService';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import type { QueryScope } from '../types';

// The delivery lane's THIRD write (the governance write), at the service seam.
// Fixtures: the at-scale demo fleet. sa-1002 (ctr-004 / sup-005, FRC) is Case B
// {0.10, flag}; sa-1004 (ctr-008 / sup-009, FRC) is Case C {null, ignore} with
// seqs 1–3 released (75,000 of an agreed 100,000) — the clean enforced-flip case.
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null };
const SUPPLIER_005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005' };
const svc = new MockDeliveryService();

/** The item-10 view for one contract's single agreement. */
async function itemTen(contractId: string) {
  const page = await svc.getAgreements(BUYER, { contractId });
  return page.items[0].items.find((iv) => iv.item.lineSeq === 10)!;
}

describe('MockDeliveryService.editPolicy — the third write', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('re-points active + stamps when/why; the deviation surfaces; contractDefault untouched', async () => {
    const before = await itemTen('ctr-004');
    expect(before.ledger.policyDeviation).toBe(false); // seeded active === contractDefault
    expect(before.item.drawdownPolicy.contractDefault).toEqual({ tolerancePct: 0.1, enforcement: 'flag' });

    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'widen tolerance after amendment',
    });
    expect(result.ok).toBe(true);

    const after = await itemTen('ctr-004');
    expect(after.item.drawdownPolicy.active).toEqual({ tolerancePct: 0.25, enforcement: 'flag' });
    expect(after.item.drawdownPolicy.activeChangedAt).toBeDefined();
    expect(after.item.drawdownPolicy.activeChangeReason).toBe('widen tolerance after amendment');
    expect(after.item.drawdownPolicy.activeChangedBy).toBeUndefined(); // deferred to dispatcher
    // The deviation is now marked, measured against the IMMUTABLE contract default.
    expect(after.ledger.policyDeviation).toBe(true);
    expect(after.item.drawdownPolicy.contractDefault).toEqual({ tolerancePct: 0.1, enforcement: 'flag' });
  });

  it('ok returns the re-derived view so the caller renders without a second read', async () => {
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: null,
      enforcement: 'ignore',
      reason: 'switch to reference-only',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = result.view.items.find((iv) => iv.item.lineSeq === 10)!;
      expect(item.ledger.enforced).toBe(false); // now Case C — reference, not enforced
      expect(item.ledger.policyDeviation).toBe(true);
    }
  });

  it('Case C → governed flips `enforced`, marks the deviation, and surfaces NO spurious breach', async () => {
    const before = await itemTen('ctr-008'); // sa-1004, Case C, 75,000 released of 100,000
    expect(before.ledger.enforced).toBe(false);
    expect(before.ledger.exceptions.length).toBe(0);

    const result = await svc.editPolicy(BUYER, 'sa-1004', 10, {
      tolerancePct: 0.1,
      enforcement: 'flag',
      reason: 'govern this material',
    });
    expect(result.ok).toBe(true);

    const after = await itemTen('ctr-008');
    expect(after.ledger.enforced).toBe(true); // ignore → flag
    expect(after.ledger.policyDeviation).toBe(true);
    // The released 75,000 is within the 110,000 ceiling — tightening does NOT
    // fabricate a breach on generator-invariant data (the honesty guarantee).
    expect(after.ledger.exceptions.length).toBe(0);
  });

  it('is buyer-only: a supplier scope is refused (SCOPE_DENIED), store untouched', async () => {
    const result = await svc.editPolicy(SUPPLIER_005, 'sa-1002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'supplier should not be able to do this',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('SCOPE_DENIED');
    const after = await itemTen('ctr-004');
    expect(after.ledger.policyDeviation).toBe(false); // the refusal never wrote
    expect(after.item.drawdownPolicy.activeChangedAt).toBeUndefined();
  });

  it('a no-op edit (same values) is refused NO_CHANGE', async () => {
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.1, // === the seeded active
      enforcement: 'flag',
      reason: 'no real change',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NO_CHANGE');
  });

  it('a blank reason is refused REASON_REQUIRED', async () => {
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: '   ',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('REASON_REQUIRED');
  });

  it('an unknown agreement or item is refused UNKNOWN_ITEM', async () => {
    const noAgreement = await svc.editPolicy(BUYER, 'sa-9999', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'x',
    });
    expect(noAgreement.ok).toBe(false);
    if (!noAgreement.ok) expect(noAgreement.reason).toBe('UNKNOWN_ITEM');
    const noItem = await svc.editPolicy(BUYER, 'sa-1002', 99, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'x',
    });
    expect(noItem.ok).toBe(false);
    if (!noItem.ok) expect(noItem.reason).toBe('UNKNOWN_ITEM');
  });

  it('ctr-003 stays pristine: editing sa-1002 leaves the anchor policy at contract default', async () => {
    await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'unrelated edit',
    });
    const anchor = await itemTen('ctr-003');
    expect(anchor.ledger.policyDeviation).toBe(false);
    expect(anchor.item.drawdownPolicy.activeChangedAt).toBeUndefined();
    expect(anchor.item.drawdownPolicy.active).toEqual(anchor.item.drawdownPolicy.contractDefault);
  });
});
