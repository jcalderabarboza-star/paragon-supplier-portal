// ─────────────────────────────────────────────────────────────────────────────
// THE DELIVERY LANE'S FOUR VERBS, BOTH DIRECTIONS EACH.
//
// Every verb is probed for what it ADMITS as well as what it REFUSES. A guard
// habitually probed one way ships looking like a working guard while being
// wrong about what it should accept — GL-1's chip-ref type rejected the bad ref
// *and the known-good one*, and a one-sided probe would have shipped it.
//
// ⚠️ **THE POPULATION IS THE LIVE STORE, RESET BETWEEN TESTS.** These run the
// real dispatcher against the real targets over the real seed, so a refusal
// here is the refusal a surface receives.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from '../../data/mock/MockCommandService';
import { MockDeliveryService } from '../../data/mock/MockDeliveryService';
import { schedulingAgreementStore } from '../stores/schedulingAgreementStore';
import { DECLARED_PRESENT } from '../../data/fixturePresent';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import type { QueryScope } from '../../data/types';

const commands = new MockCommandService();

/**
 * Adjust a draft line the way the SURFACE does — a direct dispatch.
 *
 * ⚠️ **THERE IS NO `svc.delivery.adjustLine`, AND THAT IS A RULING.**
 * `C1-methods.md` enumerates `IDeliveryService`'s methods and pins them EQUAL
 * to the interface, so a fifth method would be a contract amendment. An
 * adjust is one command against one address with nothing to orchestrate, so
 * it is dispatched directly (`useAdjustLine`, on the `commandHooks` pattern)
 * — and this helper is that same call, so the spec exercises the shipped
 * path rather than a convenience the product does not have.
 */
async function adjustLine(
  scope: QueryScope,
  agreementId: string,
  itemSeq: number,
  releaseSeq: number,
  patch: { plannedQty?: number; releaseDate?: string },
) {
  const line = schedulingAgreementStore
    .get(agreementId)
    ?.items.find((i) => i.lineSeq === itemSeq)
    ?.scheduleLines.find((l) => l.releaseSeq === releaseSeq);
  if (!line) return { ok: false as const, reason: 'UNKNOWN_RELEASE_SEQ' };
  const r = await commands.dispatch(scope, {
    transitionId: 't_delivery_adjust',
    entity: 'deliveryRelease',
    entityId: line.releaseRef,
    payload: {
      ...(patch.plannedQty !== undefined ? { plannedQty: patch.plannedQty } : {}),
      ...(patch.releaseDate !== undefined ? { releaseDate: patch.releaseDate } : {}),
    },
  });
  return r.status === 'failed'
    ? { ok: false as const, reason: r.reason ?? 'REFUSED' }
    : { ok: true as const };
}
const delivery = new MockDeliveryService(commands);

/** A named procurement person from the roster — never a hand-spelled id (C10
 *  §6.3: a prefix match says yes to anything spelled to look like one). */
const PROCUREMENT_PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'procurement')!;
const COMPLIANCE_PERSON = SAMPLE_PEOPLE.find((p) => p.role === 'compliance')!;

const seat = (roles: readonly string[], personId?: string): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: [...roles],
  actor: personId
    ? { kind: 'RESOLVED', person: { personId } }
    : { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
});

const PROCUREMENT = seat(['procurement'], PROCUREMENT_PERSON.personId);
const COMPLIANCE = seat(['compliance'], COMPLIANCE_PERSON.personId);
const UNNAMED = seat(['procurement', 'compliance']);

/** The pristine all-draft anchor: every line is dated in 2026 from 08 Jan. */
const ANCHOR = 'sa-0001';
/** The partly-released demo, which carries an INFERRED match to confirm. */
const DEMO = 'sa-0002';

/** A day comfortably after the declared present, in ISO. */
const FUTURE = '2027-06-01';

beforeEach(() => schedulingAgreementStore.reset());

/** The anchor's first item, and a draft line dated in the PAST. */
function anchorPastLine() {
  const a = schedulingAgreementStore.get(ANCHOR)!;
  const item = a.items[0];
  const past = item.scheduleLines.find(
    (l) => l.state === 'draft' && l.releaseDate < DECLARED_PRESENT,
  );
  return { item, past: past! };
}

/** The anchor's first item, and a draft line dated in the FUTURE. */
function anchorFutureLine() {
  const a = schedulingAgreementStore.get(ANCHOR)!;
  const item = a.items[0];
  const future = item.scheduleLines.find(
    (l) => l.state === 'draft' && l.releaseDate >= DECLARED_PRESENT,
  );
  return { item, future: future! };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the fixtures really carry both shapes', () => {
  it('⚠️ THE ANCHOR HAS BOTH A PAST-DATED AND A FUTURE-DATED DRAFT LINE', () => {
    // Without this, every back-dating assertion below could pass vacuously over
    // a calendar that happened to be entirely in the future (or entirely past).
    expect(anchorPastLine().past).toBeDefined();
    expect(anchorFutureLine().future).toBeDefined();
  });

  it('⚠️ AND THE DEMO CARRIES AN INFERRED MATCH TO CONFIRM', () => {
    const view = schedulingAgreementStore.get(DEMO)!;
    expect(view.items.some((i) => i.scheduleLines.some((l) => l.state === 'released'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_delivery_release', () => {
  it('ADMITS a future-dated draft line for a named procurement seat', async () => {
    const { item, future } = anchorFutureLine();
    const r = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    expect(r.ok).toBe(true);
    const after = schedulingAgreementStore
      .get(ANCHOR)!
      .items.find((i) => i.lineSeq === item.lineSeq)!
      .scheduleLines.find((l) => l.releaseSeq === future.releaseSeq)!;
    expect(after.state).toBe('released');
    // ⚠️ THE ACTOR LANDED ON THE ROW, not merely in the event.
    expect(after.releasedBy).toEqual({
      kind: 'RESOLVED',
      person: { personId: PROCUREMENT_PERSON.personId },
    });
  });

  it('REFUSES a back-dated line, by name, with the remedy', async () => {
    const { item, past } = anchorPastLine();
    const r = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [past.releaseSeq],
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_RELEASE_BACKDATED');
    // The remedy is NAMED — a seat told only "no" cannot proceed.
    expect(r.detail ?? r.reason).toMatch(/Move the date forward/);
    // And NOTHING was written.
    expect(
      schedulingAgreementStore
        .get(ANCHOR)!
        .items.find((i) => i.lineSeq === item.lineSeq)!
        .scheduleLines.find((l) => l.releaseSeq === past.releaseSeq)!.state,
    ).toBe('draft');
  });

  it('REFUSES an UNATTRIBUTED seat, by name, naming the remedy (Q6)', async () => {
    const { item, future } = anchorFutureLine();
    const r = await delivery.releaseLines(UNNAMED, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_ACTOR_UNATTRIBUTED');
    expect(r.detail ?? r.reason).toMatch(/sample user|identity panel/);
  });

  it('REFUSES a seat that does not hold `delivery:release`', async () => {
    const { item, future } = anchorFutureLine();
    // A COMPLIANCE seat holds the policy atom and not the release atom —
    // exactly the segregation the lane was built to express.
    const r = await delivery.releaseLines(COMPLIANCE, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('ROLE_NOT_PERMITTED');
  });

  it('a horizon covering past AND future lines releases the future ones and REPORTS the rest', async () => {
    const { item } = anchorFutureLine();
    const r = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      horizonDate: FUTURE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    // ⚠️ A PARTIAL OUTCOME IS REAL AND IS NAMED — never collapsed into one
    // boolean, which is how a surface comes to announce a success over lines
    // that were refused.
    expect(r.releasedSeqs.length).toBeGreaterThan(0);
    expect(r.refusals.length).toBeGreaterThan(0);
    expect(r.refusals.every((x) => x.reason.includes('DELIVERY_RELEASE_BACKDATED'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_delivery_adjust', () => {
  it('ADMITS a date move on a DRAFT line and stamps the actor', async () => {
    const { item, past } = anchorPastLine();
    const r = await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, past.releaseSeq, {
      releaseDate: FUTURE,
    });
    expect(r.ok).toBe(true);
    const after = schedulingAgreementStore
      .get(ANCHOR)!
      .items.find((i) => i.lineSeq === item.lineSeq)!
      .scheduleLines.find((l) => l.releaseSeq === past.releaseSeq)!;
    expect(after.releaseDate).toBe(FUTURE);
    expect(after.adjustedBy).toEqual({
      kind: 'RESOLVED',
      person: { personId: PROCUREMENT_PERSON.personId },
    });
  });

  it('⚠️ ADJUST-THEN-RELEASE IS THE REMEDY, AND IT WORKS END TO END', () => {
    // The back-dating refusal names a remedy; a remedy that does not work is a
    // worse refusal than one that names none.
    return (async () => {
      const { item, past } = anchorPastLine();
      const refused = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
        releaseSeqs: [past.releaseSeq],
      });
      expect(refused.ok).toBe(false);
      await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, past.releaseSeq, {
        releaseDate: FUTURE,
      });
      const released = await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
        releaseSeqs: [past.releaseSeq],
      });
      expect(released.ok).toBe(true);
    })();
  });

  it('REFUSES a move INTO the past', async () => {
    const { item, future } = anchorFutureLine();
    const r = await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, future.releaseSeq, {
      releaseDate: '2020-01-01',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_ADJUST_DATE_BACKDATED');
  });

  it('REFUSES an empty patch', async () => {
    const { item, future } = anchorFutureLine();
    const r = await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, future.releaseSeq, {});
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_ADJUST_EMPTY');
  });

  it('⚠️ THE FREEZE HOLDS — a RELEASED line is ILLEGAL at the schema', async () => {
    const { item, future } = anchorFutureLine();
    await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    const r = await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, future.releaseSeq, {
      plannedQty: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    // `from: ['Draft']` refuses it BEFORE the pure guard runs — the schema is
    // now the outer lock and `adjustDraftLine`'s guard the inner one.
    expect(r.reason).toContain('ILLEGAL_TRANSITION');
  });

  it('REFUSES a NaN quantity — the 4a-FIND-01 family', async () => {
    const { item, future } = anchorFutureLine();
    const r = await adjustLine(PROCUREMENT, ANCHOR, item.lineSeq, future.releaseSeq, {
      plannedQty: Number.NaN,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_ADJUST_QTY_NOT_A_QUANTITY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_delivery_confirm', () => {
  /** The demo's first item + released line carrying an inferred match. */
  async function inferredLine() {
    const page = await delivery.getAgreements(PROCUREMENT, {});
    const view = page.items.find((v) => v.agreement.id === DEMO)!;
    for (const iv of view.items) {
      const fv = iv.fulfillment.find((f) => f.inferred && f.matchedRef !== undefined);
      if (fv) return { itemSeq: iv.item.lineSeq, releaseSeq: fv.releaseSeq };
    }
    throw new Error('no inferred match in the demo — the probe examines nothing');
  }

  it('ADMITS a proposed match and stamps the actor', async () => {
    const { itemSeq, releaseSeq } = await inferredLine();
    const r = await delivery.confirmMatch(PROCUREMENT, DEMO, itemSeq, releaseSeq);
    expect(r.ok).toBe(true);
    const after = schedulingAgreementStore
      .get(DEMO)!
      .items.find((i) => i.lineSeq === itemSeq)!
      .scheduleLines.find((l) => l.releaseSeq === releaseSeq)!;
    expect(after.fulfilledBy).toBeDefined();
    expect(after.confirmedBy).toEqual({
      kind: 'RESOLVED',
      person: { personId: PROCUREMENT_PERSON.personId },
    });
    // ⚠️ AND THE SAP DATE IS STILL NOT WRITTEN — a confirm is a portal record.
    expect(after.sapReleaseNumber).toBeUndefined();
  });

  it('REFUSES a line with no match to accept', async () => {
    const { item, future } = anchorFutureLine();
    await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    const r = await delivery.confirmMatch(PROCUREMENT, ANCHOR, item.lineSeq, future.releaseSeq);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_NOTHING_TO_CONFIRM');
  });

  it('REFUSES an UNATTRIBUTED seat', async () => {
    const { itemSeq, releaseSeq } = await inferredLine();
    const r = await delivery.confirmMatch(UNNAMED, DEMO, itemSeq, releaseSeq);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('DELIVERY_ACTOR_UNATTRIBUTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_delivery_policy_set', () => {
  /** The demo item running Case B (10% · flag) — tightenable and loosenable. */
  function governedItem() {
    const a = schedulingAgreementStore.get(DEMO)!;
    const item = a.items.find((i) => i.drawdownPolicy.active.tolerancePct !== null)!;
    return item;
  }

  it('REACH — the demo really carries a bounded tolerance to move', () => {
    expect(governedItem().drawdownPolicy.active.tolerancePct).not.toBeNull();
  });

  it('ADMITS a TIGHTENING by a named compliance seat, and stamps the actor', async () => {
    const item = governedItem();
    const current = item.drawdownPolicy.active;
    const r = await delivery.editPolicy(COMPLIANCE, DEMO, item.lineSeq, {
      tolerancePct: (current.tolerancePct as number) / 2,
      enforcement: 'block',
      reason: 'tightened after two over-deliveries',
    });
    expect(r.ok).toBe(true);
    const after = schedulingAgreementStore
      .get(DEMO)!
      .items.find((i) => i.lineSeq === item.lineSeq)!.drawdownPolicy;
    expect(after.activeChangedBy).toEqual({
      kind: 'RESOLVED',
      person: { personId: COMPLIANCE_PERSON.personId },
    });
    // The contract default is untouched — it is the immutable audit reference.
    expect(after.contractDefault).toEqual(item.drawdownPolicy.contractDefault);
  });

  it('⚠️ REFUSES A LOOSENING BY A SAMPLE ACTOR, BY NAME (C10 §6.3a)', async () => {
    const item = governedItem();
    const r = await delivery.editPolicy(COMPLIANCE, DEMO, item.lineSeq, {
      tolerancePct: null, // unlimited — the widest band there is
      enforcement: 'ignore',
      reason: 'trying to relax it',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
    // And the tolerance did NOT move.
    expect(
      schedulingAgreementStore
        .get(DEMO)!
        .items.find((i) => i.lineSeq === item.lineSeq)!.drawdownPolicy.active,
    ).toEqual(item.drawdownPolicy.active);
  });

  it('⚠️ A WIDER BAND ALONE IS A LOOSENING, even while the MODE tightens', async () => {
    // Both knobs are answered independently — a change that tightened one while
    // widening the other would otherwise slip through on the tightening.
    const item = governedItem();
    const r = await delivery.editPolicy(COMPLIANCE, DEMO, item.lineSeq, {
      tolerancePct: (item.drawdownPolicy.active.tolerancePct as number) * 4,
      enforcement: 'block',
      reason: 'wider band, stricter mode',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
  });

  it('REFUSES a seat that does not hold `delivery:policy-set`', async () => {
    const item = governedItem();
    const r = await delivery.editPolicy(PROCUREMENT, DEMO, item.lineSeq, {
      tolerancePct: 0.01,
      enforcement: 'block',
      reason: 'procurement cannot set the bar it is measured against',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reason).toContain('ROLE_NOT_PERMITTED');
  });

  it('REFUSES a blank reason', async () => {
    const item = governedItem();
    const r = await delivery.editPolicy(COMPLIANCE, DEMO, item.lineSeq, {
      tolerancePct: 0.01,
      enforcement: 'block',
      reason: '   ',
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ ATTRIBUTION MAY NOT TRAVEL IN A PAYLOAD (C10 §6.2, R-PAYLOAD)', () => {
  it('a hand-crafted dispatch carrying `releasedBy` is refused BY KEY', async () => {
    const { item, future } = anchorFutureLine();
    const line = item.scheduleLines.find((l) => l.releaseSeq === future.releaseSeq)!;
    const r = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_delivery_release',
      entity: 'deliveryRelease',
      entityId: line.releaseRef,
      payload: { releasedBy: { kind: 'RESOLVED', person: { personId: 'whoever' } } },
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('ACTOR_IN_PAYLOAD');
  });

  it('and so is `activeChangedBy` on the policy verb', async () => {
    const a = schedulingAgreementStore.get(DEMO)!;
    const item = a.items[0];
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_delivery_policy_set',
      entity: 'deliveryPolicy',
      entityId: `${DEMO}#${item.lineSeq}`,
      payload: {
        tolerancePct: 0.01,
        enforcement: 'block',
        reason: 'x',
        activeChangedBy: { kind: 'RESOLVED', person: { personId: 'whoever' } },
      },
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('ACTOR_IN_PAYLOAD');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ NO DOCUMENT NUMBER IS MINTED (C12 §2.1)', () => {
  it('no delivery verb declares a field that could carry one', async () => {
    const { getKnownFlows } = await import('../../transitions');
    const delivery = getKnownFlows().filter((f) => f.entity.startsWith('delivery'));
    expect(delivery.length).toBe(2);
    const fields = delivery.flatMap((f) => f.transitions.flatMap((t) => [...t.requiredFields]));
    // `reason` is the only required field in the whole lane.
    expect([...new Set(fields)].sort()).toEqual(['reason']);
  });

  it('and a release leaves `sapReleaseNumber` absent', async () => {
    const { item, future } = anchorFutureLine();
    await delivery.releaseLines(PROCUREMENT, ANCHOR, item.lineSeq, {
      releaseSeqs: [future.releaseSeq],
    });
    const after = schedulingAgreementStore
      .get(ANCHOR)!
      .items.find((i) => i.lineSeq === item.lineSeq)!
      .scheduleLines.find((l) => l.releaseSeq === future.releaseSeq)!;
    expect(after.sapReleaseNumber).toBeUndefined();
    expect(after.fulfilledDate).toBeUndefined();
  });
});
