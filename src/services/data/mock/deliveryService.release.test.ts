// ─────────────────────────────────────────────────────────────────────────────
// MockDeliveryService.releaseLines — the release write, AFTER call-off step 1.
//
// ⚠️ **EVERY ASSERTION BELOW SURVIVED; THREE OF THEM HAD TO CHANGE SUBJECT, AND
// THE REASON IS STATED AT EACH SITE.** The write stopped being a direct store
// mutation gated by `scope.personaType === 'buyer'` and became one
// `t_delivery_release` command per line, so two things this file took for
// granted are no longer true:
//
//   · **A SEAT MUST NAME A PERSON** (Q6). Every verb in the lane refuses an
//     unattributed seat, because an act that creates supplier-facing
//     obligations is never recorded against nobody. So the buyer here adopts a
//     sample person, exactly as an operator does on the identity panel.
//   · **A BACK-DATED LINE CANNOT BE TRANSMITTED.** This file used to release
//     `sa-0001` seq 1 (08 Jan 2026) as its worked example, which is now months
//     past the declared present — and releasing it is precisely the defect the
//     guard exists for (it derives `missed` on the next read and the chase
//     engine then pushes on it). The walks move to a FUTURE-dated line of the
//     same item, at the same planned quantity, so every number below is
//     unchanged.
//
// Nothing was weakened to make this pass: the refusal assertions are still
// refusal assertions, and two NEW ones land here because the new mechanism has
// two new things to be honest about (a partial horizon, and a refusal that
// names the back-dating).
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { MockDeliveryService } from './MockDeliveryService';
import { MockCommandService } from './MockCommandService';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import { DECLARED_PRESENT } from '../fixturePresent';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import type { DeliveryAgreementView } from '../../delivery';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

/** A named procurement person from the roster — never a hand-spelled id. */
const PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'procurement')!;

const BUYER: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: { kind: 'RESOLVED', person: { personId: PERSON.personId } },
};
const SUPPLIER_007: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: { kind: 'RESOLVED', person: { personId: PERSON.personId } },
};
const svc = new MockDeliveryService(new MockCommandService());

/** The item-10 (PK-PETB-8810 FRC) view for one contract's single agreement. */
async function itemTen(contractId: string) {
  const page = await svc.getAgreements(BUYER, { contractId });
  const view = page.items[0];
  return view.items.find((iv) => iv.item.lineSeq === 10)!;
}

/**
 * A releasable line of `sa-0001` item 10 — draft, and NOT back-dated.
 *
 * Derived rather than written as a seq literal: the anchor's calendar is
 * generated from a cadence, so which seq happens to be future is a fact about
 * the fixture and the declared present, not something this file should assert
 * by memory.
 */
function releasableLine() {
  const item = schedulingAgreementStore.get('sa-0001')!.items.find((i) => i.lineSeq === 10)!;
  const line = item.scheduleLines.find(
    (l) => l.state === 'draft' && l.releaseDate >= DECLARED_PRESENT && l.plannedQty === 180_000,
  );
  if (!line) throw new Error('no releasable 180,000-unit draft line — the walks examine nothing');
  return line;
}

describe('MockDeliveryService.releaseLines — the first write', () => {
  afterEach(() => schedulingAgreementStore.reset());

  it('REACH — the anchor really has a future-dated, releasable draft line', () => {
    // Without this, every walk below could pass over a calendar that happened
    // to have nothing releasable in it (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    expect(releasableLine().releaseDate >= DECLARED_PRESENT).toBe(true);
  });

  it('flips exactly the named draft line: releasedQty up by its plannedQty, remaining down', async () => {
    const before = await itemTen('ctr-003');
    expect(before.ledger.releasedQty).toBe(0);
    expect(before.ledger.remainingQty).toBe(2_000_000);

    const seq = releasableLine().releaseSeq;
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [seq] });
    expect(result.ok).toBe(true);

    const after = await itemTen('ctr-003');
    const flipped = after.item.scheduleLines.find((l) => l.releaseSeq === seq)!;
    expect(flipped.state).toBe('released');
    expect(flipped.releasedAt).toBeDefined();
    // ⚠️ AND THE ACTOR IS ON THE ROW. New at call-off step 1, and it is the
    // whole reason the lane was brought into the transition system.
    expect(flipped.releasedBy).toEqual({
      kind: 'RESOLVED',
      person: { personId: PERSON.personId },
    });
    // plannedQty is 180,000 → released climbs by exactly that, remaining drops.
    expect(after.ledger.releasedQty).toBe(180_000);
    expect(after.ledger.remainingQty).toBe(1_820_000);
  });

  it('the released line now appears in the derived fulfillment (was empty all-draft)', async () => {
    const before = await itemTen('ctr-003');
    expect(before.fulfillment).toHaveLength(0); // all-draft ⇒ nothing to fulfill

    const seq = releasableLine().releaseSeq;
    await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [seq] });

    const after = await itemTen('ctr-003');
    const fv = after.fulfillment.find((f) => f.releaseSeq === seq);
    expect(fv).toBeDefined();
    // ⚠️ **AND IT IS `pending`, NOT `missed` — WHICH IS THE POINT OF THE BATCH.**
    // This assertion used to read `missed`, because the line it released was
    // already months overdue the instant it was transmitted. That is exactly
    // what the back-dating guard now refuses, so the honest state of a
    // newly-transmitted commitment is one nobody has failed yet.
    expect(fv!.fulfillment).toBe('pending');
  });

  it('the horizon arm releases what it legally can and REPORTS what it cannot', async () => {
    // ⚠️ **A PARTIAL HORIZON IS THE NEW HONEST OUTCOME.** The entity is the
    // schedule LINE, so a horizon is many independent commands; the anchor's
    // early lines are past-dated and are refused on their own merits. Reporting
    // "3 released, 8 refused" is the truth of the act — collapsing it into one
    // boolean is how a surface comes to announce a success over refused lines.
    const line = releasableLine();
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, {
      horizonDate: line.releaseDate,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.releasedSeqs).toContain(line.releaseSeq);
    expect(result.refusals.length).toBeGreaterThan(0);
    expect(result.refusals.every((r) => r.reason.includes('DELIVERY_RELEASE_BACKDATED'))).toBe(
      true,
    );
    const states = new Map(
      schedulingAgreementStore
        .get('sa-0001')!
        .items.find((i) => i.lineSeq === 10)!
        .scheduleLines.map((l) => [l.releaseSeq, l.state]),
    );
    expect(states.get(line.releaseSeq)).toBe('released');
    // A line beyond the horizon is untouched, exactly as before.
    expect(states.get(line.releaseSeq + 1)).toBe('draft');
  });

  it('⚠️ A BACK-DATED LINE IS REFUSED BY NAME, AND THE STORE IS UNTOUCHED', async () => {
    const past = schedulingAgreementStore
      .get('sa-0001')!
      .items.find((i) => i.lineSeq === 10)!
      .scheduleLines.find((l) => l.releaseDate < DECLARED_PRESENT)!;
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, {
      releaseSeqs: [past.releaseSeq],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toContain('DELIVERY_RELEASE_BACKDATED');
    expect(
      schedulingAgreementStore
        .get('sa-0001')!
        .items.find((i) => i.lineSeq === 10)!
        .scheduleLines.find((l) => l.releaseSeq === past.releaseSeq)!.state,
    ).toBe('draft');
  });

  it('is buyer-only: a supplier scope is refused (SCOPE_DENIED), store untouched', async () => {
    // ⚠️ The refusal moved from a predicate in this service to the dispatcher's
    // SCOPE gate (`readScopeOwner: () => null` — no supplier may act), and the
    // dispatcher THROWS SCOPE_DENIED rather than returning it. The claim is
    // unchanged and is asserted at the new mechanism.
    await expect(
      svc.releaseLines(SUPPLIER_007, 'sa-0002', 10, { releaseSeqs: [1] }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    const item = await itemTen('ctr-013');
    expect(item.item.scheduleLines.find((l) => l.releaseSeq === 1)!.state).toBe('draft');
  });

  it('idempotence: re-releasing an already-released line is refused ALREADY_RELEASED', async () => {
    const seq = releasableLine().releaseSeq;
    await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [seq] });
    const again = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [seq] });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe('ALREADY_RELEASED');
  });

  it('an empty selection is an honest NO_LINES_SELECTED, not a silent success', async () => {
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NO_LINES_SELECTED');
  });

  it('isolation: a sa-0001 write leaves sa-0002 exactly as it was', async () => {
    // ⚠️ **THE MIRROR OF THE OLD ASSERTION, AND IT HAD TO BE.** This read
    // "a sa-0002 write leaves sa-0001 pristine", which needed a releasable
    // draft on sa-0002 — and every draft line that agreement still carries is
    // past-dated, so no legal write exists there to perform. The PROPERTY is
    // identical (a write touches one agreement and no other) and is asserted in
    // the direction the fixtures can actually exercise.
    const before = JSON.stringify(schedulingAgreementStore.get('sa-0002'));
    await svc.releaseLines(BUYER, 'sa-0001', 10, { releaseSeqs: [releasableLine().releaseSeq] });
    expect(JSON.stringify(schedulingAgreementStore.get('sa-0002'))).toBe(before);
  });

  it('an unknown agreement or item is refused UNKNOWN_RELEASE_SEQ', async () => {
    const noAgreement = await svc.releaseLines(BUYER, 'sa-9999', 10, { releaseSeqs: [1] });
    expect(noAgreement.ok).toBe(false);
    if (!noAgreement.ok) expect(noAgreement.reason).toBe('UNKNOWN_RELEASE_SEQ');
    const noItem = await svc.releaseLines(BUYER, 'sa-0001', 99, { releaseSeqs: [1] });
    expect(noItem.ok).toBe(false);
    if (!noItem.ok) expect(noItem.reason).toBe('UNKNOWN_RELEASE_SEQ');
  });

  it('ok returns the re-derived view so the caller renders without a second read', async () => {
    const result = await svc.releaseLines(BUYER, 'sa-0001', 10, {
      releaseSeqs: [releasableLine().releaseSeq],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const view: DeliveryAgreementView = result.view;
      const item = view.items.find((iv) => iv.item.lineSeq === 10)!;
      expect(item.ledger.releasedQty).toBe(180_000);
    }
  });
});
