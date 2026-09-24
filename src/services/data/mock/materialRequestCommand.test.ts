// ─────────────────────────────────────────────────────────────────────────────
// R8 · THE MATERIAL-REQUEST VERBS, END TO END.
//
// ⚠️ **THE STORE SEEDS `[]`, SO EVERY SPEC HERE DISPATCHES FIRST AND ASSERTS
// MEMBERSHIP SECOND, AND THE POPULATION GUARD RUNS FIRST IN THE FILE.** An
// empty population is the `EMPTY-INPUT-REPORTS-CLEAN-01` shape: any assertion
// of the form *"no row is malformed"* passes vacuously over nothing. The guard
// asserts MEMBERSHIP BY NAME, never a count — a count is satisfied by the wrong
// row.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { materialRequestStore } from './stores/materialRequestStore';
import { rfqStore } from './stores/rfqStore';
import { NO_PERSON } from '../../../context/noPerson';
import type { QueryScope } from '../types';
import type { ActorAttribution } from '../../../lib/enforcement';

const PROCUREMENT: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};

const PLANNING: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON,
};

const SUPPLIER: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['commercial', 'fulfilment', 'back_office'],
  actor: NO_PERSON,
};

const GOOD = {
  requestedLabel: 'Amber Dropper 30ml (probe)',
  category: 'Packaging',
  need: 'A probe request — the master carries no 30ml dropper.',
};

let svc: MockCommandService;

const raise = (scope: QueryScope = PROCUREMENT, payload: Record<string, unknown> = GOOD) =>
  svc.dispatch(scope, {
    transitionId: 't_materialrequest_submit',
    entity: 'materialRequest',
    payload,
  });

beforeEach(() => {
  materialRequestStore.reset();
  rfqStore.reset();
  commandAuditSink.clear();
  svc = new MockCommandService();
});

// ── THE POPULATION GUARD — FIRST IN THE FILE, BY MEMBERSHIP ─────────────────
describe('⚠️ POPULATION — the store starts empty and a dispatch is what fills it', () => {
  it('opens on [] — so nothing below may assert over an unseeded store', () => {
    expect(materialRequestStore.all()).toEqual([]);
  });

  it('⚠️ AND A DISPATCH PUTS A NAMED ROW IN IT — membership, never a count', () => {
    return raise().then((r) => {
      expect(r.status).not.toBe('failed');
      const labels = materialRequestStore.all().map((x) => x.requestedLabel);
      // KNOWN-TRUE by name.
      expect(labels).toContain('Amber Dropper 30ml (probe)');
      // KNOWN-FALSE CONTROL: the instrument can say no.
      expect(labels).not.toContain('a row nothing dispatched');
    });
  });
});

describe('the birth', () => {
  it('lands at Submitted with a store-assigned id and number', async () => {
    const r = await raise();
    expect(r.status).not.toBe('failed');
    const row = materialRequestStore.get(r.entityId!)!;
    expect(row.status).toBe('Submitted');
    expect(row.id).toBe('mr-0001');
    expect(row.requestNumber).toBe('MR-2026-0001');
  });

  it('⚠️ `materialCode` IS `null` ON THE STORED ROW — the lane never carries one', async () => {
    const r = await raise();
    expect(materialRequestStore.get(r.entityId!)!.materialCode).toBeNull();
  });

  it('the three instants and the two attributions open in their honest states', async () => {
    const r = await raise();
    const row = materialRequestStore.get(r.entityId!)!;
    expect(row.reviewStartedAt).toBeNull();
    expect(row.decidedAt).toBeNull();
    expect(row.decidedBy).toBeNull();
    expect(row.justification).toBeNull();
    // Always UNATTRIBUTED in this tree, and the type is what keeps it honest.
    expect(row.submittedBy).toEqual(NO_PERSON);
  });

  it('absent optionals store as `null`, never `\'\'` — nobody was asked', async () => {
    const r = await raise();
    const row = materialRequestStore.get(r.entityId!)!;
    expect(row.raisedFromRfqId).toBeNull();
    expect(row.specification).toBeNull();
    expect(row.expectedUom).toBeNull();
    expect(row.catalogReason).toBeNull();
  });

  it('it lands in the DR-10 trail', async () => {
    await raise();
    expect(commandAuditSink.byEvent('t_materialrequest_submit').length).toBe(1);
  });
});

describe('the atoms, each refused BY NAME', () => {
  it('a seat without `materialrequest:submit` cannot raise one', async () => {
    const r = await raise(PLANNING);
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('ROLE_NOT_PERMITTED');
  });

  it('⚠️ A SUPPLIER SEAT IS REFUSED AT SCOPE, NOT AT ROLE, AND NOTHING IS MINTED', async () => {
    // `readScopeOwner` returns null, which DENIES every supplier scope — it does
    // NOT mean "nothing to compare". The refusal KIND matters because it used to
    // be an existence oracle across a tenancy boundary (§86).
    await expect(raise(SUPPLIER)).rejects.toThrow(/SCOPE_DENIED|denied/i);
    expect(materialRequestStore.all()).toEqual([]);
  });

  it('⚠️ THE EXISTENCE-ORACLE CLOSURE — a supplier is refused IDENTICALLY on a row that exists and one that does not', async () => {
    // §86's defect, asserted rather than assumed inherited: while the dispatcher
    // guarded its supplier arm with `owner !== null &&`, an owner-less target
    // gave `ROLE_NOT_PERMITTED` for a row that EXISTS and `SCOPE_DENIED` for one
    // that does not — so the refusal KIND answered a question the caller may not
    // ask. Both messages must be the same, on a new target, or this lane has
    // re-opened it.
    const real = await raise();
    const onReal = await svc
      .dispatch(SUPPLIER, {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: real.entityId!,
        payload: {},
      })
      .then(() => 'NO-REFUSAL')
      .catch((e: Error) => e.message);
    const onGhost = await svc
      .dispatch(SUPPLIER, {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: 'mr-9999',
        payload: {},
      })
      .then(() => 'NO-REFUSAL')
      .catch((e: Error) => e.message);
    expect(onReal).toMatch(/denied for scope/);
    expect(onGhost).toMatch(/denied for scope/);
    // ⚠️ THE LOAD-BEARING ASSERTION, AND MY FIRST VERSION OF IT WAS WRONG IN A
    // WAY WORTH RECORDING: it compared the two messages RAW and failed, because
    // each echoes the id the caller itself supplied (`mr-0001` vs `mr-9999`).
    // **That is not a leak** — the caller already knows what it asked about. The
    // property §86 is actually about is that nothing BEYOND the caller's own
    // input differs, so the caller's id is normalised out and the remainder must
    // be identical. Asserting the raw equality would have been a stronger claim
    // that is not the invariant, and it would have reddened on a correct tree.
    const shapeOf = (m: string, id: string) => m.split(id).join('<ID>');
    expect(shapeOf(onReal, real.entityId!)).toBe(shapeOf(onGhost, 'mr-9999'));
    // And the anti-vacuity half: the normaliser really did remove something, so
    // the equality above is not comparing two untouched strings by luck.
    expect(shapeOf(onReal, real.entityId!)).toContain('<ID>');
    // And the row a supplier could not touch is untouched.
    expect(materialRequestStore.get(real.entityId!)!.status).toBe('Submitted');
  });

  it('a procurement seat cannot START REVIEW — that atom is planning’s', async () => {
    const created = await raise();
    const r = await svc.dispatch(PROCUREMENT, {
      transitionId: 't_materialrequest_start_review',
      entity: 'materialRequest',
      entityId: created.entityId!,
      payload: {},
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('ROLE_NOT_PERMITTED');
  });

  it('⚠️ AND A PROCUREMENT SEAT CANNOT DECIDE ONE EITHER — both endings', async () => {
    const created = await raise();
    await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_start_review',
      entity: 'materialRequest',
      entityId: created.entityId!,
      payload: {},
    });
    for (const verb of ['t_materialrequest_approve', 't_materialrequest_reject']) {
      const r = await svc.dispatch(PROCUREMENT, {
        transitionId: verb,
        entity: 'materialRequest',
        entityId: created.entityId!,
        payload: { justification: 'x' },
      });
      expect(r.status).toBe('failed');
      expect(r.reason).toContain('ROLE_NOT_PERMITTED');
    }
  });

  it('⚠️ AND A PLANNING SEAT CAN — so the refusals above are not a broken gate', async () => {
    // Rule 4: assert a known-GOOD input passes before believing a known-BAD one
    // failed. Without this, every refusal above is indistinguishable from a
    // dispatcher that refuses everything.
    const created = await raise();
    const review = await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_start_review',
      entity: 'materialRequest',
      entityId: created.entityId!,
      payload: {},
    });
    expect(review.status).not.toBe('failed');
    expect(materialRequestStore.get(created.entityId!)!.status).toBe('Under Review');
  });
});

describe('MATERIALREQUEST_CATEGORY_KNOWN — membership, both fields', () => {
  it('an off-list category is refused by name', async () => {
    const r = await raise(PROCUREMENT, { ...GOOD, category: 'Widgets' });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('Widgets');
  });

  it('a known category passes — the hook is not refusing everything', async () => {
    const r = await raise(PROCUREMENT, { ...GOOD, category: 'Fragrance' });
    expect(r.status).not.toBe('failed');
  });

  it('an off-list catalogReason is refused; an absent one is legal', async () => {
    const bad = await raise(PROCUREMENT, { ...GOOD, catalogReason: 'BECAUSE' });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toContain('BECAUSE');
    materialRequestStore.reset();
    const good = await raise(PROCUREMENT, { ...GOOD, catalogReason: 'NO_MASTER_TARGET' });
    expect(good.status).not.toBe('failed');
    expect(materialRequestStore.get(good.entityId!)!.catalogReason).toBe('NO_MASTER_TARGET');
  });
});

describe('MATERIALREQUEST_NEED_AUTHORED — substance, not presence', () => {
  it('a blank need is refused, and spaces are blank', async () => {
    for (const need of ['', '   ']) {
      materialRequestStore.reset();
      const r = await raise(PROCUREMENT, { ...GOOD, need });
      expect(r.status).toBe('failed');
      // `requiredFields` catches `''`; only the hook catches '   '.
      expect(r.reason).toBeTruthy();
    }
  });

  it('⚠️ AND `\'   \'` IS SPECIFICALLY THE HOOK’S CATCH, not requiredFields’', async () => {
    const r = await raise(PROCUREMENT, { ...GOOD, need: '   ' });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('need is blank');
  });

  it('authored text passes', async () => {
    const r = await raise(PROCUREMENT, { ...GOOD, need: 'a real reason' });
    expect(r.status).not.toBe('failed');
  });
});

describe('MATERIALREQUEST_RFQ_RESOLVED — resolved, never echoed', () => {
  it('an unknown RFQ id is refused by name', async () => {
    const r = await raise(PROCUREMENT, { ...GOOD, raisedFromRfqId: 'rfq-does-not-exist' });
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('rfq-does-not-exist');
  });

  it('⚠️ A REAL RFQ RESOLVES, AND THE STORED VALUE IS THE ID — not the payload', async () => {
    // The payload names the RFQ by its NUMBER; the stored field is the ID. That
    // is the difference between a resolution and an echo, made visible.
    const real = rfqStore.all()[0];
    const r = await raise(PROCUREMENT, { ...GOOD, raisedFromRfqId: real.rfqNumber });
    expect(r.status).not.toBe('failed');
    expect(materialRequestStore.get(r.entityId!)!.raisedFromRfqId).toBe(real.id);
    expect(materialRequestStore.get(r.entityId!)!.raisedFromRfqId).not.toBe(real.rfqNumber);
  });

  it('absent is legal — the standalone entrance names no event', async () => {
    const r = await raise(PROCUREMENT, GOOD);
    expect(r.status).not.toBe('failed');
    expect(materialRequestStore.get(r.entityId!)!.raisedFromRfqId).toBeNull();
  });
});

describe('the decisions', () => {
  const walkToReview = async () => {
    const created = await raise();
    await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_start_review',
      entity: 'materialRequest',
      entityId: created.entityId!,
      payload: {},
    });
    return created.entityId!;
  };

  it('start review stamps `reviewStartedAt` and nothing else', async () => {
    const id = await walkToReview();
    const row = materialRequestStore.get(id)!;
    expect(row.reviewStartedAt).not.toBeNull();
    expect(row.decidedAt).toBeNull();
    expect(row.decidedBy).toBeNull();
  });

  it('⚠️ APPROVE RECORDS A DECISION AND MINTS NOTHING', async () => {
    const id = await walkToReview();
    const before = rfqStore.all().length;
    const r = await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_approve',
      entity: 'materialRequest',
      entityId: id,
      payload: {},
    });
    expect(r.status).not.toBe('failed');
    const row = materialRequestStore.get(id)!;
    expect(row.status).toBe('Approved');
    expect(row.decidedAt).not.toBeNull();
    expect(row.decidedBy).toEqual(NO_PERSON);
    // NOTHING ELSE MOVED: no code on the row, no RFQ created or changed, and no
    // cascade fanned out.
    expect(row.materialCode).toBeNull();
    expect(row.justification).toBeNull();
    expect(rfqStore.all().length).toBe(before);
    expect(commandAuditSink.byEvent('t_rfq_create')).toHaveLength(0);
  });

  it('reject requires a justification, and spaces are not one', async () => {
    const id = await walkToReview();
    const blank = await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_reject',
      entity: 'materialRequest',
      entityId: id,
      payload: { justification: '   ' },
    });
    expect(blank.status).toBe('failed');
    expect(blank.reason).toContain('justification is blank');
    expect(materialRequestStore.get(id)!.status).toBe('Under Review');

    const ok = await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_reject',
      entity: 'materialRequest',
      entityId: id,
      payload: { justification: '  Already in the master as PET-100 bottle.  ' },
    });
    expect(ok.status).not.toBe('failed');
    const row = materialRequestStore.get(id)!;
    expect(row.status).toBe('Rejected');
    expect(row.justification).toBe('Already in the master as PET-100 bottle.');
  });

  it('⚠️ BOTH ENDINGS ARE TERMINAL AT THE DISPATCHER, not only in the table', async () => {
    const id = await walkToReview();
    await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_approve',
      entity: 'materialRequest',
      entityId: id,
      payload: {},
    });
    // No verb takes it anywhere, including back to review.
    for (const verb of [
      't_materialrequest_start_review',
      't_materialrequest_approve',
      't_materialrequest_reject',
    ]) {
      const r = await svc.dispatch(PLANNING, {
        transitionId: verb,
        entity: 'materialRequest',
        entityId: id,
        payload: { justification: 'x' },
      });
      expect(r.status).toBe('failed');
    }
    expect(materialRequestStore.get(id)!.status).toBe('Approved');
  });

  it('a decision cannot be taken on a Submitted row — legality holds', async () => {
    const created = await raise();
    const r = await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_approve',
      entity: 'materialRequest',
      entityId: created.entityId!,
      payload: {},
    });
    expect(r.status).toBe('failed');
  });
});

// ── FOUR-EYES: PROBED BOTH WAYS, BECAUSE IT CANNOT FIRE ON THE REAL TREE ────
//
// ⚠️ **A ONE-SIDED PROBE OVER A POPULATION WHERE THE GUARD CANNOT FIRE PROVES
// NOTHING** (rule 4, and `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`'s neighbour:
// a clean reading taken where the defect is structurally absent is a report
// about the absence, not about the guard). So: the real-tree run proving it
// ADMITS, and a synthetic RESOLVED pair proving it FIRES, in the same file.
describe('⚠️ MATERIALREQUEST_DECIDER_NOT_REQUESTER — built, and unable to fire today', () => {
  // No `displayName` — a stamp carries the `personId` alone (C10 §8.2).
  const RESOLVED = (personId: string): ActorAttribution => ({
    kind: 'RESOLVED',
    person: { personId },
  });

  it('THE REAL TREE: both actors UNATTRIBUTED → the hook ADMITS', async () => {
    // And this is the honest direction: an unattributed act is not evidence of
    // self-approval. The green here proves the lane WORKS, not that four-eyes
    // is enforced — which is why the next test exists.
    const created = await raise();
    expect(created.status).not.toBe('failed');
    expect(materialRequestStore.get(created.entityId!)!.submittedBy.kind).toBe('UNATTRIBUTED');
    const review = await svc.dispatch(PLANNING, {
      transitionId: 't_materialrequest_start_review',
      entity: 'materialRequest',
      entityId: created.entityId!,
      payload: {},
    });
    expect(review.status).not.toBe('failed');
  });

  it('⚠️ THE SYNTHETIC PAIR: SAME personId → REFUSED BY NAME, so the hook can fire', async () => {
    const alice = RESOLVED('p-alice');
    const created = await raise({ ...PROCUREMENT, actor: alice });
    expect(created.status).not.toBe('failed');
    const r = await svc.dispatch(
      { ...PLANNING, actor: alice },
      {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: created.entityId!,
        payload: {},
      },
    );
    expect(r.status).toBe('failed');
    expect(r.reason).toContain('may not also decide');
    // ⚠️ **THE REFUSAL NAMES THE `personId`, NOT A LABEL (C10 §8.2 / D-ID-7).**
    // It used to interpolate `person.displayName`, which no longer exists on a
    // record — and naming the stable identifier is the stronger assertion: a
    // label is resolved at read and can change, an id is permanent (D-ID-1).
    expect(r.reason).toContain('p-alice');
  });

  it('⚠️ AND A DIFFERENT personId PASSES — the guard is not refusing every resolved act', async () => {
    const created = await raise({ ...PROCUREMENT, actor: RESOLVED('p-alice') });
    const r = await svc.dispatch(
      { ...PLANNING, actor: RESOLVED('p-bob') },
      {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: created.entityId!,
        payload: {},
      },
    );
    expect(r.status).not.toBe('failed');
  });

  it('…and it guards BOTH decisions, not only the review edge', async () => {
    const alice = RESOLVED('p-alice');
    const created = await raise({ ...PROCUREMENT, actor: alice });
    await svc.dispatch(
      { ...PLANNING, actor: RESOLVED('p-bob') },
      {
        transitionId: 't_materialrequest_start_review',
        entity: 'materialRequest',
        entityId: created.entityId!,
        payload: {},
      },
    );
    for (const verb of ['t_materialrequest_approve', 't_materialrequest_reject']) {
      const r = await svc.dispatch(
        { ...PLANNING, actor: alice },
        {
          transitionId: verb,
          entity: 'materialRequest',
          entityId: created.entityId!,
          payload: { justification: 'x' },
        },
      );
      expect(r.status).toBe('failed');
      expect(r.reason).toContain('may not also decide');
    }
  });
});
