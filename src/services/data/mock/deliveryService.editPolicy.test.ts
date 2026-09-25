import { afterEach, describe, expect, it } from 'vitest';
import { MockDeliveryService } from './MockDeliveryService';
import { MockCommandService } from './MockCommandService';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

// The delivery lane's THIRD write (the governance write), at the service seam.
// Fixtures: the at-scale demo fleet. sa-1002 (ctr-004 / sup-005, FRC) is Case B
// {0.10, flag}; sa-1004 (ctr-008 / sup-009, FRC) is Case C {null, ignore} with
// seqs 1–3 released (75,000 of an agreed 100,000) — the clean enforced-flip case.
//
// ⚠️ **TWO THINGS CHANGED AT CALL-OFF STEP 1, AND BOTH TIGHTEN RATHER THAN
// RELAX.** (1) The seat must name a person (Q6). (2) A LOOSENING is refused to
// a SAMPLE identity (C10 §6.3a, `SAMPLE_ACTOR_CANNOT_LOOSEN`) — a sample person
// cannot accept governance risk — so the worked example below moves from
// widening a tolerance to TIGHTENING one, and the widening it used to perform
// is asserted as a REFUSAL in its own case. No assertion was deleted; one
// changed direction and gained a twin.
const PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'compliance')!;
const ACTOR = { kind: 'RESOLVED', person: { personId: PERSON.personId } } as const;
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: ACTOR };
const SUPPLIER_005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier, actor: ACTOR };
const svc = new MockDeliveryService(new MockCommandService());

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

    // ⚠️ TIGHTENED, not widened — see the header. The shape of the assertion
    // is identical; only the direction of the change is legal now.
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.05,
      enforcement: 'flag',
      reason: 'tighten tolerance after amendment',
    });
    expect(result.ok).toBe(true);

    const after = await itemTen('ctr-004');
    expect(after.item.drawdownPolicy.active).toEqual({ tolerancePct: 0.05, enforcement: 'flag' });
    expect(after.item.drawdownPolicy.activeChangedAt).toBeDefined();
    expect(after.item.drawdownPolicy.activeChangeReason).toBe('tighten tolerance after amendment');
    // ⚠️ **AND `activeChangedBy` IS WRITTEN NOW.** This asserted `toBeUndefined()`
    // with the comment "deferred to the dispatcher"; the lane HAS its dispatcher,
    // so the deferral is over and the field carries the session's actor.
    expect(after.item.drawdownPolicy.activeChangedBy).toEqual(ACTOR);
    // The deviation is now marked, measured against the IMMUTABLE contract default.
    expect(after.ledger.policyDeviation).toBe(true);
    expect(after.item.drawdownPolicy.contractDefault).toEqual({ tolerancePct: 0.1, enforcement: 'flag' });
  });

  it('ok returns the re-derived view so the caller renders without a second read', async () => {
    // ⚠️ **THIS USED TO SWITCH THE ITEM TO REFERENCE-ONLY, AND THAT IS NOW THE
    // ONE THING A SAMPLE IDENTITY MAY NOT DO.** `{ null, ignore }` is the widest
    // band and the weakest mode — a loosening on both knobs — and
    // `SAMPLE_ACTOR_CANNOT_LOOSEN` refuses it by name. The assertion under test
    // is *"ok returns the re-derived view"*, which needs any legal change at
    // all, so it tightens instead. The Case-C flip it used to demonstrate is
    // still demonstrated, by the very next case, from the other direction.
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.02,
      enforcement: 'block',
      reason: 'tighten to a hard envelope',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = result.view.items.find((iv) => iv.item.lineSeq === 10)!;
      expect(item.ledger.enforced).toBe(true);
      expect(item.ledger.policyDeviation).toBe(true);
    }
  });

  it('⚠️ AND THE LOOSENING IT USED TO PERFORM IS REFUSED BY NAME', async () => {
    // The other half of the case above, kept rather than dropped: the exact
    // edit this file used to assert as a success is now a governed refusal, and
    // asserting that is how the change stays visible instead of vanishing into
    // a reworded test.
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: null,
      enforcement: 'ignore',
      reason: 'switch to reference-only',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
    const after = await itemTen('ctr-004');
    expect(after.item.drawdownPolicy.activeChangedAt).toBeUndefined();
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
    // ⚠️ The refusal moved to the dispatcher's SCOPE gate, which THROWS rather
    // than returns. Same claim, new mechanism — and the store check below is
    // what makes it a refusal rather than a partial act with an exception.
    await expect(
      svc.editPolicy(SUPPLIER_005, 'sa-1002', 10, {
        tolerancePct: 0.25,
        enforcement: 'flag',
        reason: 'supplier should not be able to do this',
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
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
    // ⚠️ **AND IT IS REFUSED AT THE GATE NOW, NOT INSIDE THE WRITE.**
    // `setActivePolicy` still answers `NO_CHANGE`, but it runs after every gate
    // has passed — a refusal raised there could only be an exception. The rule
    // moved to `DELIVERY_POLICY_GOVERNED`, where it can refuse before the act.
    if (!result.ok) expect(result.reason).toContain('DELIVERY_POLICY_NO_CHANGE');
  });

  it('a blank reason is refused REASON_REQUIRED', async () => {
    const result = await svc.editPolicy(BUYER, 'sa-1002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: '   ',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('DELIVERY_POLICY_REASON_BLANK');
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
