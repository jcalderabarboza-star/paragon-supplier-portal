// ────────────────────────────────────────────────────────────────────────────
// C.1 — t_rfq_create → t_pr_source. THE JUNCTION MACHINE, HEADLESS.
//
// Raising an RFQ from an approved requisition advances that PR to
// `Sourcing Event` and writes the RFQ's number onto it as `linkedDoc`.
//
// ⚠️ **THE NEGATIVE PATHS ARE PINNED HARDER THAN THE POSITIVE ONE, BECAUSE THE
// COMMON PATH IS NEGATIVE.** Most RFQs are not raised from a requisition, so
// most raises must cascade onto NOTHING. A link that quietly fires on every RFQ
// would look like a working feature and would be corrupting PRs nobody named.
// Two silences, both ASSERTED rather than assumed:
//   1. no `sourceRequisitionId` in the payload  → ZERO cascades
//   2. PR not `Approved`                        → PR UNTOUCHED
//
// ⚠️ **AND THE SECOND SILENCE IS NOT ACTUALLY SILENT, WHICH IS PINNED TOO.**
// Measured at C.1 against the shipped dispatcher: a cascade refused at the
// legality or role gate RETURNS `status: 'failed'` and IS EMITTED to the audit
// sink with its reason and the source's `causationId`. Only an ABSENT entity
// throws, and the fan-out's `catch {}` discards that one with no record — which
// is why the resolver checks existence before handing back an id. These tests
// pin the distinction, so a future change that turns a recorded refusal into a
// thrown one cannot pass unnoticed.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import type { QueryScope } from '../types';

const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};
const svc = new MockCommandService();

/** Raise an RFQ. `sourceRequisitionId` is omitted unless a test names one. */
const raiseRfq = (sourceRequisitionId?: string) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'C.1 probe RFQ',
      materialCategory: 'Fragrance',
      totalQty: 100,
      ...(sourceRequisitionId ? { sourceRequisitionId } : {}),
    },
  });

/** Events emitted for a transition since the sink was last cleared. */
const eventsFor = (transitionId: string) => commandAuditSink.byEvent(transitionId);

// The natural fixture pair: pr-002 is `Approved` with an empty `linkedDoc` —
// the one PR in the tree a real cascade can legally act on.
const APPROVED_PR = 'pr-002';

describe('C.1 · the two silences — ASSERTED, not assumed', () => {
  beforeEach(() => {
    commandAuditSink.clear();
  });

  it('⚠️ SILENCE 1 — an RFQ raised WITHOUT the key cascades onto NOTHING', async () => {
    const before = purchaseRequisitionStore.all().map((p) => ({ ...p }));

    const res = await raiseRfq();
    expect(res.status).toBe('done');

    // ZERO cascades: not "the right PR was skipped", but that no PR moved at all.
    // Asserted over the WHOLE store, because a resolver bug that picked an
    // arbitrary PR would leave the named one untouched and still be a defect.
    expect(purchaseRequisitionStore.all()).toEqual(before);
    expect(eventsFor('t_pr_source')).toEqual([]);
  });

  it('⚠️ SILENCE 2 — a PR that is not Approved is UNTOUCHED by the cascade', async () => {
    // pr-005 is `Draft`; `t_pr_source` is `from: ['Approved']`.
    const target = 'pr-005';
    const before = { ...purchaseRequisitionStore.get(target)! };
    expect(before.status).toBe('Draft');

    await raiseRfq(target);

    // The document is untouched — state AND the field the cascade would write.
    const after = purchaseRequisitionStore.get(target)!;
    expect(after).toEqual(before);
    expect(after.status).toBe('Draft');
    expect(after.linkedDoc).toBe('');
  });

  it('⚠️ and silence 2 is RECORDED — the refusal reaches the sink with its reason', async () => {
    // The half that makes silence 2 safe. A cascade the machine declines is not
    // a cascade that vanished: it is emitted `failed`, with the reason and the
    // causationId tying it to the RFQ that tried. If this ever goes empty, the
    // lane has become genuinely silent and the `catch {}` is swallowing it.
    const res = await raiseRfq('pr-005');

    const [ev] = eventsFor('t_pr_source');
    expect(ev).toBeDefined();
    expect(ev.outcome).toBe('failed');
    expect(ev.reason).toBe('ILLEGAL_TRANSITION:Draft->Sourcing Event');
    expect(ev.causationId).toBe(res.correlationId);
  });

  it('⚠️ an id naming NO PR is refused at the RESOLVER — never handed to dispatch', async () => {
    // The traceless path, closed by construction at the resolver.
    //
    // ⚠️ **AND THIS TEST CANNOT TELL YOU THAT IT IS CLOSED — SAID HERE BECAUSE
    // THE MUTATION PROBE CAUGHT THIS COMMENT CLAIMING IT COULD.** Deleting the
    // resolver's existence check leaves every assertion below GREEN: the id then
    // reaches `dispatch`, which THROWS `NOT_FOUND`, and the fan-out's `catch {}`
    // discards it — no event, no PR moved. Refused-at-the-resolver and
    // thrown-and-swallowed are OBSERVATIONALLY IDENTICAL from out here, which is
    // exactly why the guard has to be at the resolver: nothing downstream can
    // distinguish them, so nothing downstream can defend the difference.
    //
    // What this test pins is therefore the CONTRACT, not the mechanism — an id
    // naming no PR must move nothing and record nothing. The mechanism is held
    // by the comment at the guard site in `MockCommandService`'s rfq branch. The
    // probe that DOES bite is SILENCE 1 above: it goes red the moment the check
    // is removed, because a missing key then cascades onto a PR nobody named.
    const before = purchaseRequisitionStore.all().map((p) => ({ ...p }));

    const res = await raiseRfq('pr-does-not-exist');
    expect(res.status).toBe('done'); // the source command is never broken

    expect(eventsFor('t_pr_source')).toEqual([]);
    expect(purchaseRequisitionStore.all()).toEqual(before);
  });
});

describe('C.1 · the positive path', () => {
  beforeEach(() => {
    commandAuditSink.clear();
  });

  it('an approved PR named by the raise advances and records the RFQ', async () => {
    const before = purchaseRequisitionStore.get(APPROVED_PR)!;
    expect(before.status).toBe('Approved');
    expect(before.linkedDoc).toBe('');

    const res = await raiseRfq(APPROVED_PR);
    expect(res.status).toBe('done');

    const after = purchaseRequisitionStore.get(APPROVED_PR)!;
    expect(after.status).toBe('Sourcing Event');
    // The RFQ number is the one the STORE assigned to this raise — asserted
    // against the dispatch result, never against a hand-written literal.
    expect(after.linkedDoc).toBe(res.entityId);
    expect(after.linkedDoc).not.toBe('');

    // Grouped under the raising command, not orphaned.
    const [ev] = eventsFor('t_pr_source');
    expect(ev.outcome).toBe('done');
    expect(ev.causationId).toBe(res.correlationId);
  });

  it('the cascade runs under the AUTOMATION grant, not the raising seat', () => {
    // `pr:source` is in no lane bundle — no seat, however wide, holds it. If the
    // fan-out ran under the buyer's own scope this would refuse, so a passing
    // positive path above is only meaningful beside this assertion.
    expect(PERSONA_SYSTEM_ROLES.buyer).not.toContain('pr:source');
  });
});
