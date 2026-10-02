// ────────────────────────────────────────────────────────────────────────────
// ONE INTAKE LINE → AT MOST ONE REQUISITION (A2 / C7-FIND-05).
//
// ⚠️ **TWO MECHANISMS ANSWER TWO DIFFERENT CALLERS, AND EACH SPEC NAMES WHICH
// ONE ANSWERED IT.** Design 1 §11 asks for exactly that: *"the second attempt
// returns the first result (replay) or `ILLEGAL_TRANSITION` (Committed), and
// the test names which."* Asserting only that the count is one would pass while
// one of the two mechanisms was missing entirely.
//
//   · **LEGALITY** — `t_intake_commit` is `from: ['Pending']` and `Committed`
//     is terminal, so a HUMAN pressing commit twice is REFUSED and told. That
//     is the right answer for a person: somebody who clicked twice must learn
//     the second click did nothing.
//
//   · **REPLAY** — the cascade carries `idempotencyKey = the line id`, so a
//     TRANSPORT that never intended a second act (F2's Event Mesh is
//     at-least-once) is answered with the FIRST result rather than a refusal.
//     Refusing a replay would convert one duplicate into an unbounded retry
//     loop, because the correct response of an at-least-once transport to a
//     failure is to redeliver.
//
// ⚠️ **AND THE DEFECT THIS CLOSES NEEDED NO TRANSPORT AT ALL, WHICH IS WHY THE
// FIRST SPEC BELOW IS THE RELOAD ONE.** Measured before the machine existed:
// Accept → reload → the row was PLANNED again with its requisition still in the
// store, so three Drafts for one requirement was one click away.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from '../data/mock/MockCommandService';
import { MockProcurementService } from '../data/mock/MockProcurementService';
import { intakeLineStore } from '../data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import type { QueryScope } from '../data/types';

const commands = new MockCommandService();
const reads = new MockProcurementService();

/** Two DIFFERENT buyer seats. Same tenancy, so the replay namespace is shared. */
const seatA: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};
// PLN-3 (R1) · seat B holds the PLANNING lane: the intake verbs moved there
// from `requisitioner`, and this file's subject is a seat that holds the verb
// meeting the machine — a seat without it would be refused by ROLE first.
const seatB: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
};

// ⚠️ **ONE LINE PER SPEC, AND THE REASON IS THE SUBJECT OF THIS FILE.** The
// replay ledger is a module singleton that OUTLIVES a store reset — it is the
// dispatcher's ingress record, not the entity's. Re-using a line across specs
// would make the second spec's "one PR" true for the first spec's reason.
const LINE_RELOAD = 'pil-somo-001';
const LINE_SEAT = 'pil-somo-002';
const LINE_RETRY = 'pil-grid-001';
const LINE_LEGAL = 'pil-grid-002';

const commit = (scope: QueryScope, lineId: string, qty: number, reason?: string) =>
  commands.dispatch(scope, {
    transitionId: 't_intake_commit',
    entity: 'intakeLine',
    entityId: lineId,
    payload: {
      acceptedQty: qty,
      acceptedQtyRaw: String(qty),
      ...(reason ? { overrideReason: reason } : {}),
    },
  });

/** The requisitions raised FROM a given line — the relation, not a count. */
const raisedFrom = (lineId: string) =>
  purchaseRequisitionStore.all().filter((p) => p.intakeLineId === lineId);

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

describe('the duplicate that needed no transport — Accept, reload, Accept', () => {
  it('a reload finds the line Committed, so the second Accept is never offered', async () => {
    const first = await commit(seatA, LINE_RELOAD, 12_000);
    expect(first.status).not.toBe('failed');
    expect(raisedFrom(LINE_RELOAD)).toHaveLength(1);

    // Drop the in-memory copy WITHOUT touching storage — what a reload does.
    // Before A2 the triage lived in a page's `useState`, so this is exactly the
    // step at which the line came back PLANNED with its PR still in the store.
    intakeLineStore.rehydrate();

    const afterReload = (await reads.getIntakeLines(seatA)).items.find(
      (l) => l.id === LINE_RELOAD,
    )!;
    expect(afterReload.state).toBe('Committed');
    expect(afterReload.planState).toBe('committed');
    // And the requisition is found by DERIVATION, through the PR that names the
    // line — so the two can never disagree about which document this produced.
    expect(afterReload.prNumber).toBe(raisedFrom(LINE_RELOAD)[0].prNumber);
  });
});

describe('a SECOND SEAT committing the same line', () => {
  it('is refused by LEGALITY, and raises no second requisition', async () => {
    const first = await commit(seatA, LINE_SEAT, 4_500);
    expect(first.status).not.toBe('failed');
    const prNumber = raisedFrom(LINE_SEAT)[0].prNumber;

    const second = await commit(seatB, LINE_SEAT, 4_500);
    // NAMED: this one is legality, not replay. The source verb carries no key —
    // `idempotencyKey.test.ts` holds that no user surface passes one — so the
    // second seat meets the machine, and the machine tells it the truth.
    expect(second.status).toBe('failed');
    expect(second.reason).toMatch(/ILLEGAL_TRANSITION/);

    expect(raisedFrom(LINE_SEAT)).toHaveLength(1);
    expect(raisedFrom(LINE_SEAT)[0].prNumber).toBe(prNumber);

    // And a DIFFERENT quantity gets no further: the refusal is about the state,
    // so there is no payload a second seat can present that reaches the store.
    const third = await commit(seatB, LINE_SEAT, 9_999, 'a much larger order');
    expect(third.status).toBe('failed');
    expect(raisedFrom(LINE_SEAT)).toHaveLength(1);
    expect(raisedFrom(LINE_SEAT)[0].quantity).toBe(4_500);
  });
});

describe('a REDELIVERED commit — the transport that never intended a second act', () => {
  // The cascade is what carries the key, so the way to exercise REPLAY rather
  // than legality is to present the cascade's own command again: the same
  // `t_pr_create`, under the same tenancy, with the same key. That is precisely
  // what an at-least-once redelivery of the producer's event would produce.
  it('is answered with the FIRST result and mints nothing — named: replay, not legality', async () => {
    const first = await commit(seatA, LINE_RETRY, 200_000);
    expect(first.status).not.toBe('failed');
    const original = raisedFrom(LINE_RETRY)[0];
    expect(original).toBeDefined();

    const redelivered = await commands.dispatch(seatA, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      idempotencyKey: LINE_RETRY,
      payload: {
        material: original.material,
        quantity: original.quantity,
        intakeLineId: LINE_RETRY,
      },
    });

    // NAMED: a REPLAY returns a RESULT, not a refusal — and it is the FIRST
    // command's result, which is what lets the caller still settle it.
    expect(redelivered.status).not.toBe('failed');
    expect(redelivered.entityId).toBe(original.prNumber);
    expect(raisedFrom(LINE_RETRY)).toHaveLength(1);

    // ⚠️ **THE BILATERAL CONTROL, IN THE SAME RUN ON THE SAME LINE.** Without
    // it, "one requisition" above is equally satisfied by a dispatcher that had
    // simply stopped minting them — which is rule 4 aimed at the one instrument
    // whose success signal is an ABSENCE. The identical command WITHOUT the key
    // must mint a second, and it does.
    const unkeyed = await commands.dispatch(seatA, {
      transitionId: 't_pr_create',
      entity: 'purchaseRequisition',
      payload: {
        material: original.material,
        quantity: original.quantity,
        intakeLineId: LINE_RETRY,
      },
    });
    expect(unkeyed.status).not.toBe('failed');
    expect(unkeyed.entityId).not.toBe(original.prNumber);
    expect(raisedFrom(LINE_RETRY)).toHaveLength(2);
  });
});

describe('the retry — the same seat pressing commit twice', () => {
  it('is refused by LEGALITY on the source, before the cascade can run again', async () => {
    const first = await commit(seatA, LINE_LEGAL, 90_000);
    expect(first.status).not.toBe('failed');

    const again = await commit(seatA, LINE_LEGAL, 90_000);
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/ILLEGAL_TRANSITION/);
    expect(raisedFrom(LINE_LEGAL)).toHaveLength(1);
    // The stored record is untouched by the refused attempt.
    expect(intakeLineStore.get(LINE_LEGAL)?.committedQty).toBe(90_000);
  });
});
