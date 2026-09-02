// ────────────────────────────────────────────────────────────────────────────
// 1c — THE STATE PRECONDITION (`expectedState` → `STALE_STATE`)
//
// ⚠️ **THIS IS NOT THE REVISION PRECONDITION. READ THIS HEADER BEFORE TREATING
// CONCURRENCY AS HANDLED — WITHOUT IT THIS BATCH PACKAGES A HOLE THAT NOW LOOKS
// CLOSED.**
//
// `CommandInput` carries no version and no etag, and until 1c it carried no
// expected state either. Nothing in this platform is concurrent — the stores
// are module singletons and "two personas" is one tab flipping a panel — so the
// executable specification was SILENT on the exact case its goal names. A
// backend built to it would have two buyers approve the same requisition and
// the second would overwrite, or throw whatever the integration team improvised.
//
// WHAT 1c CATCHES: a concurrent move that leaves the act STILL LEGAL. Two
// callers read state S; one fires a verb landing on S'; S' is still in the
// second verb's `from` set, so `ILLEGAL_TRANSITION` stays silent and the second
// caller writes over a document that moved under it.
//
// ⚠️ **WHAT IT DOES NOT CATCH — TWO HOLES, BOTH DERIVED BELOW RATHER THAN
// PROMISED:**
//
//  1. **CONTENT staleness.** Approving a requisition whose payload was revised
//     under you WHILE THE STATE HELD is invisible here: the state is identical
//     and this compares states. It needs an entity REVISION. No store carries
//     one, and the audit sink has no per-entity read to stand in — both pinned
//     below. That is a second, later precondition.
//
//  2. **`statePreserving` VERBS.** A state-preserving verb leaves the entity
//     where it was, so `expectedState` still matches and this gate passes. A
//     state comparison cannot see a verb that moves no state.
//
// ⚠️ **HOLE 2 IS THE ONE WORTH SAYING OUT LOUD, BECAUSE THE DISPATCH THAT
// ORDERED THIS GATE DESCRIBED THOSE CASES AS PART OF WHAT 1c *CATCHES*.**
// Measured, they are exactly what it is blind to. The correction is asserted
// here rather than filed as a finding, because a finding is read once and a
// failing test is read every time.
//
// `COMMAND-INPUT-HAS-NO-STATE-PRECONDITION-01` — the defect this file closes,
// minted and closed in the same commit so the register index it feeds has a
// first row that satisfies its own future gate. The blind halves stay OPEN
// under `COMMAND-INPUT-HAS-NO-REVISION-PRECONDITION-01`, which this file pins
// as open rather than leaving to prose.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import {
  MockCommandService,
  WIRED_COMMAND_TARGETS,
  commandTargetFor,
} from '../data/mock/MockCommandService';
import { getKnownFlows, getFlow } from './registry';
import './index';
import { COMMAND_REFUSALS } from './refusals';
import { NO_PERSON } from '../../context/noPerson';
import type { QueryScope } from '../data/types';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { asnStore } from '../data/mock/stores/asnStore';
import { goodsReceiptStore } from '../data/mock/stores/goodsReceiptStore';
import { invoiceStore } from '../data/mock/stores/invoiceStore';
import { quotationStore } from '../data/mock/stores/quotationStore';
import { requirementResponseStore } from '../data/mock/stores/requirementResponseStore';
import { inventoryDeclarationStore } from '../data/mock/stores/inventoryDeclarationStore';
import { incomingShipmentStore } from '../data/mock/stores/incomingShipmentStore';
import { supplierDocumentStore } from '../data/mock/stores/supplierDocumentStore';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { enforcementSettingStore } from '../data/mock/stores/enforcementSettingStore';
import { GOVERNED_CHECK_IDS } from '../../lib/enforcement';

const svc = new MockCommandService();

const seat = (...businessRoles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON,
});
const procurement = seat('procurement');
const requisitioner = seat('requisitioner');
/** Holds no atoms — used to prove the precondition sits AFTER the role gate. */
const roleless = seat();

const kindOf = (reason: string | undefined) => (reason ?? '').split(':')[0];

/**
 * One real entity id per wired target that seeds rows — the input to the
 * revision probe. A fixture, not a population: the probe asserts it inspected
 * more than a handful, so a target dropping out of this table cannot quietly
 * shrink the claim to nothing.
 */
const REAL_ID: Record<string, string | undefined> = {
  purchaseOrder: purchaseOrderStore.all()[0]?.id,
  advanceShipNotice: asnStore.all()[0]?.asnNumber,
  goodsReceipt: goodsReceiptStore.all()[0]?.id,
  invoice: invoiceStore.all()[0]?.id,
  rfq: rfqStore.all()[0]?.id,
  quotation: quotationStore.all()[0]?.id,
  purchaseRequisition: purchaseRequisitionStore.all()[0]?.id,
  requirementResponse: requirementResponseStore.all()[0]?.id,
  inventoryDeclaration: inventoryDeclarationStore.all()[0]?.id,
  incomingShipment: incomingShipmentStore.all()[0]?.id,
  supplierDocument: supplierDocumentStore.all()[0]?.id,
};

beforeEach(() => {
  rfqStore.reset();
  purchaseRequisitionStore.reset();
  enforcementSettingStore.reset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION — what a STATE precondition can and cannot see, derived', () => {
  /**
   * (A, B, S): both verbs legal at S, and after A fires, B is STILL legal.
   * That is the whole race. Split by whether the state actually MOVED, because
   * that is precisely what a state comparison can detect.
   */
  function partition() {
    const caught = { pairs: new Set<string>(), triples: [] as string[] };
    const blind = { pairs: new Set<string>(), triples: [] as string[] };
    for (const f of getKnownFlows()) {
      const ts = f.transitions.filter((t) => t.trigger !== 'creation');
      for (const A of ts)
        for (const B of ts)
          for (const S of A.from.filter((s) => B.from.includes(s))) {
            const landing = A.statePreserving ? S : A.to;
            if (!B.from.includes(landing)) continue;
            const row = `${f.entity}|${A.id}|${B.id}|${S}`;
            const bucket = landing === S ? blind : caught;
            bucket.pairs.add(`${f.entity}|${A.id}|${B.id}`);
            bucket.triples.push(row);
          }
    }
    return { caught, blind };
  }

  it('CONTROL — the derivation sees a real registry, not an empty one', () => {
    const flows = getKnownFlows();
    expect(flows.length).toBeGreaterThan(5);
    const nonCreation = flows.flatMap((f) => f.transitions).filter((t) => t.trigger !== 'creation');
    expect(nonCreation.length).toBeGreaterThan(50);
  });

  it('the CAUGHT set is non-empty, and lands on both sides of a bilateral control', () => {
    const { caught } = partition();
    expect(caught.pairs.size).toBeGreaterThan(0);
    // known-GOOD: publishing an RFQ leaves it Open, and cancel is legal from
    // Open — so a caller who read Draft and cancels writes over a moved doc.
    expect([...caught.pairs]).toContain('rfq|t_rfq_publish|t_rfq_cancel');
    // known-FALSE: awarding leaves an RFQ Awarded, which cancel CANNOT leave
    // from — that race is already caught by ILLEGAL_TRANSITION, so it must not
    // be in this set.
    expect([...caught.pairs]).not.toContain('rfq|t_rfq_award|t_rfq_cancel');
  });

  it('⚠️ the BLIND set is non-empty too, and this gate does NOT close it', () => {
    const { blind } = partition();
    expect(blind.pairs.size).toBeGreaterThan(0);
    // Every blind row is a state-preserving verb, by construction — if one ever
    // is not, the reasoning in this file's header no longer covers it.
    for (const row of blind.triples) {
      const [entity, aId] = row.split('|');
      const A = getFlow(entity)!.transitions.find((t) => t.id === aId)!;
      expect(A.statePreserving, `${row} is blind but ${aId} is not statePreserving`).toBe(true);
    }
    expect([...blind.pairs]).toContain('enforcement|t_enforcement_set|t_enforcement_set');
    expect([...blind.pairs]).toContain('rfq|t_rfq_fx_pin|t_rfq_award');
  });

  it('⚠️ OPEN — nothing a command can address carries a revision, so the CONTENT precondition is unbuildable', () => {
    // `COMMAND-INPUT-HAS-NO-REVISION-PRECONDITION-01`, pinned as OPEN rather
    // than described in prose. The day an addressable entity grows a monotonic
    // revision this goes red, and that is the moment the second precondition
    // becomes possible.
    //
    // ⚠️ **THE MATCHER IS DELIBERATELY WIDE (substring, not an anchored name),
    // AND THE HITS ARE ADJUDICATED RATHER THAN EXCLUDED.** An anchored
    // `^version$` returns a tidy empty set and MISSES
    // `requirementResponse.submissionVersion`, which really is monotonic. That
    // is rule 1 and rule 2 in one field: narrow and it hides a real candidate;
    // wide and it accuses two innocents. So it stays wide and every hit carries
    // a stated reason, bilaterally — the `storedFieldGate` allowlist shape.
    const REVISIONISH = /version|etag|revision|_rev\b|updatedat|modifiedat|lastmodified/i;

    /** Every revision-shaped field, with why it is NOT an entity revision. */
    const ADJUDICATED: Record<string, string> = {
      // Written once at creation (`version: 'v1'`) and never again — no
      // transition touches it. Its only consumer is a table cell. A token that
      // does not change when the entity changes cannot detect that it changed.
      'supplierDocument.version': 'write-once display label, never incremented',
      // Genuinely monotonic — `prior.reduce(max) + 1`. But it versions a
      // THREAD, not a ROW: each submission MINTS A NEW ENTITY with a new id
      // rather than incrementing a field on the addressed one. A compare-and-set
      // on `entityId` therefore still has nothing to compare — the id it was
      // handed is a specific version already.
      'requirementResponse.submissionVersion': 'thread counter; a new submission is a NEW row, not a bump',
      // A snapshot binding to ANOTHER entity: the publication's own version,
      // stamped on at submit and pinned by `rr_submit_binds_plan_version` so it
      // cannot be falsified. It never changes on this row, so it says what this
      // response answered — not what state this response is in.
      //
      // ⚠️ **AND IT IS THE MOST INTERESTING OF THE THREE, BECAUSE THE SECOND
      // PRECONDITION ALREADY HAS A PRECEDENT IN THIS TREE.**
      // `services/sdc/consolidation.ts` derives *"stale-against-current — the
      // response answered a SUPERSEDED planVersion"*. That is CONTENT staleness,
      // detected, today — on the READ side, as a projection, gating nothing.
      // Whoever builds the revision precondition should start there rather than
      // from scratch: the hard half (what does "superseded" mean for this lane)
      // is answered, and only the write-side gate is missing.
      'requirementResponse.planVersion': 'snapshot binding to the publication, not a revision of this row',
    };

    const hits: string[] = [];
    const inspected: string[] = [];
    for (const entity of WIRED_COMMAND_TARGETS) {
      const target = commandTargetFor(entity);
      const id = REAL_ID[entity];
      if (!target || !id) continue;
      const e = target.readEntity(id) as Record<string, unknown> | null;
      if (!e || typeof e !== 'object') continue;
      inspected.push(entity);
      for (const k of Object.keys(e)) if (REVISIONISH.test(k)) hits.push(`${entity}.${k}`);
    }

    // ⚠️ CONTROL, both ways. Without the first, an empty result is a report
    // about a probe that inspected nothing; without the second, the matcher is
    // unproven and "no hits" means "no matcher".
    expect(inspected.length, 'the probe inspected no entity at all').toBeGreaterThan(4);
    expect(REVISIONISH.test('submissionVersion')).toBe(true);
    expect(REVISIONISH.test('status')).toBe(false);

    // BILATERAL: every hit is adjudicated, and every adjudication is a real hit
    // — so the allowlist can only ever shrink truthfully.
    const unadjudicated = hits.filter((h) => !(h in ADJUDICATED));
    expect(
      unadjudicated,
      'a revision-shaped field appeared with no ruling — decide whether it is an entity revision',
    ).toEqual([]);
    const stale = Object.keys(ADJUDICATED).filter((k) => !hits.includes(k));
    expect(stale, 'the allowlist names fields that no longer exist').toEqual([]);
    // and the population is not vacuous — it really found the two.
    expect(hits.sort()).toEqual(Object.keys(ADJUDICATED).sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE PRECONDITION — walked to the state where the refusal is produced', () => {
  /** The canonical race: read Draft, someone publishes, cancel is STILL legal. */
  const draftRfq = () => rfqStore.all().find((r) => r.status === 'Draft')!;

  it('CONTROL — the walk really reaches the racing state, and both verbs are legal there', async () => {
    const rfq = draftRfq();
    expect(rfq.status).toBe('Draft');
    expect(getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_publish')!.from).toContain('Draft');
    expect(getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_cancel')!.from).toContain('Draft');
    // …and cancel is still legal at the state publish lands on. Without this,
    // the refusal below could be ILLEGAL_TRANSITION wearing a new name.
    expect(getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_cancel')!.from).toContain('Open');
  });

  it('⚠️ THE DEFECT, AS IT BEHAVES WITHOUT A PRECONDITION — the second write lands silently', async () => {
    const id = draftRfq().id;
    // Actor A reads Draft. Actor B reads Draft. A publishes.
    const published = await svc.dispatch(procurement, {
      transitionId: 't_rfq_publish', entity: 'rfq', entityId: id,
    });
    expect(published.status, published.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Open');
    // B, still holding its stale read, cancels — and today this SUCCEEDS.
    const cancelled = await svc.dispatch(procurement, {
      transitionId: 't_rfq_cancel', entity: 'rfq', entityId: id,
    });
    expect(cancelled.status, cancelled.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Cancelled');
  });

  it('✅ THE FIX — the same race, with the state B actually read, is REFUSED', async () => {
    const id = draftRfq().id;
    await svc.dispatch(procurement, { transitionId: 't_rfq_publish', entity: 'rfq', entityId: id });
    expect(rfqStore.get(id)!.status).toBe('Open');

    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_cancel', entity: 'rfq', entityId: id,
      expectedState: 'Draft', // what B read, before A moved it
    });
    expect(res.status).toBe('failed');
    expect(kindOf(res.reason)).toBe('STALE_STATE');
    // the detail is expected->actual, in that order
    expect(res.reason).toBe('STALE_STATE:Draft->Open');
    // and NOTHING was changed
    expect(rfqStore.get(id)!.status).toBe('Open');
  });

  it('a MATCHING expectedState passes straight through', async () => {
    const id = draftRfq().id;
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_cancel', entity: 'rfq', entityId: id, expectedState: 'Draft',
    });
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Cancelled');
  });

  it('and it works on a second lane — a requisition read as Draft, submitted under you', async () => {
    const pr = purchaseRequisitionStore.all().find((r) => r.status === 'Draft')!;
    await svc.dispatch(requisitioner, {
      transitionId: 't_pr_submit', entity: 'purchaseRequisition', entityId: pr.id,
    });
    expect(purchaseRequisitionStore.get(pr.id)!.status).toBe('Pending Approval');
    const res = await svc.dispatch(procurement, {
      transitionId: 't_pr_approve', entity: 'purchaseRequisition', entityId: pr.id,
      expectedState: 'Draft',
    });
    expect(kindOf(res.reason)).toBe('STALE_STATE');
    expect(purchaseRequisitionStore.get(pr.id)!.status).toBe('Pending Approval');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PRECEDENCE — after the role gate, before legality, and both matter', () => {
  it('AFTER role: a seat without the atom learns NOTHING about the state', async () => {
    const id = rfqStore.all().find((r) => r.status === 'Draft')!.id;
    const res = await svc.dispatch(roleless, {
      transitionId: 't_rfq_cancel', entity: 'rfq', entityId: id,
      expectedState: 'this-is-not-a-state',
    });
    expect(kindOf(res.reason)).toBe('ROLE_NOT_PERMITTED');
    // the actual state is nowhere in the wire value
    expect(res.reason).not.toContain('Draft');
  });

  it('BEFORE legality: a stale caller is told WHY, not merely that it is illegal', async () => {
    // An Awarded RFQ cannot be cancelled at all — so legality would refuse this
    // anyway. The caller's real problem is that it read `Open`, and that is the
    // more useful answer: it points at re-reading rather than at the verb.
    const awarded = rfqStore.all().find((r) => r.status === 'Awarded')!;
    expect(getFlow('rfq')!.transitions.find((t) => t.id === 't_rfq_cancel')!.from)
      .not.toContain('Awarded');
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_cancel', entity: 'rfq', entityId: awarded.id, expectedState: 'Open',
    });
    expect(kindOf(res.reason)).toBe('STALE_STATE');
    // CONTROL — the SAME command without the precondition still gets the old
    // answer, so this spec is measuring precedence and not a replaced refusal.
    const without = await svc.dispatch(procurement, {
      transitionId: 't_rfq_cancel', entity: 'rfq', entityId: awarded.id,
    });
    expect(kindOf(without.reason)).toBe('ILLEGAL_TRANSITION');
  });

  it('the vocabulary position matches the evaluation position', () => {
    const arr = [...COMMAND_REFUSALS] as string[];
    expect(arr.indexOf('STALE_STATE')).toBeGreaterThan(arr.indexOf('ROLE_NOT_PERMITTED'));
    expect(arr.indexOf('STALE_STATE')).toBeLessThan(arr.indexOf('ILLEGAL_TRANSITION'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ZERO CALLERS CHANGE — the half a "refuse unless declared" fix would break', () => {
  // ⚠️ The negative-direction guard. A precondition that refused whenever
  // `expectedState` was ABSENT would satisfy every spec above and break every
  // caller in the tree, because at 1c every caller omits the field.
  it('a non-creation command with NO expectedState behaves exactly as before', async () => {
    const id = rfqStore.all().find((r) => r.status === 'Draft')!.id;
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_publish', entity: 'rfq', entityId: id,
    });
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.status).toBe('Open');
  });

  it('a CREATION command with no expectedState is unaffected — it has no current state', async () => {
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_create', entity: 'rfq',
      payload: { title: 'Race probe', materialCategory: 'Packaging', totalQty: 10 },
    });
    expect(res.status, res.reason).toBe('done');
  });

  it('a CREATION command IGNORES expectedState rather than refusing on it', async () => {
    // There is no entity to compare against, so the precondition must not fire.
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_create', entity: 'rfq',
      expectedState: 'nonsense',
      payload: { title: 'Race probe 2', materialCategory: 'Packaging', totalQty: 10 },
    });
    expect(res.status, res.reason).toBe('done');
  });

  it('and the refusals that already existed still fire unchanged', async () => {
    const id = rfqStore.all().find((r) => r.status === 'Draft')!.id;
    const illegal = await svc.dispatch(procurement, {
      transitionId: 't_rfq_reopen', entity: 'rfq', entityId: id,
    });
    expect(kindOf(illegal.reason)).toBe('ILLEGAL_TRANSITION');
    const norole = await svc.dispatch(roleless, {
      transitionId: 't_rfq_publish', entity: 'rfq', entityId: id,
    });
    expect(kindOf(norole.reason)).toBe('ROLE_NOT_PERMITTED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE HOLE, PINNED OPEN — a statePreserving race passes this gate', () => {
  it('two enforcement recordings race, both declare the state they read, both land', async () => {
    // `t_enforcement_set` is Governed -> Governed. The second caller's premise
    // is stale — the ledger grew under it — and `expectedState` cannot see it,
    // because the STATE did not move. This is not a defect in the gate; it is
    // the boundary of what a state comparison can mean.
    const check = GOVERNED_CHECK_IDS[0];
    const set = (mode: string) =>
      svc.dispatch(procurement, {
        transitionId: 't_enforcement_set', entity: 'enforcement', entityId: check,
        expectedState: 'Governed',
        payload: { mode, setBy: NO_PERSON, reviewBy: mode === 'BLOCK' ? null : '2027-01-31' },
      });
    const first = await set('BLOCK');
    expect(first.status, first.reason).toBe('done');
    const second = await set('BLOCK');
    expect(second.status, second.reason).toBe('done'); // ⚠️ NOT refused
    expect(enforcementSettingStore.all().length).toBe(2);
  });
});
