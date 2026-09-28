// ────────────────────────────────────────────────────────────────────────────
// THE CASCADE — `t_intake_commit` → `t_pr_create`, and the provenance the
// requisition now carries on the DOCUMENT (A2 / A1-R3, C7-FIND-02).
//
// ⚠️ **THE DEFECT THIS CLOSES WAS A FULL ENFORCEMENT CHAIN TERMINATING IN
// NOTHING.** The plan grid REFUSED to dispatch without an override reason, the
// payload CARRIED it, and `purchaseRequisitionTarget.create` read neither it
// nor the line it came from — so the reason survived only on the DR-10 event,
// **and no surface in this tree renders an event.** The flow C6-LOCK calls
// "audited" recorded nothing an approver could read.
//
// ⚠️ **AUDIT ON THE EVENT AND PROVENANCE ON THE DOCUMENT ARE DIFFERENT JOBS.**
// The event answers *what happened, in order, to whom* and is append-only; the
// document answers *what am I looking at* to the one person whose decision
// depends on it. This file asserts both, because a ledger nobody reads is not
// an answer to the second question and a document is not an answer to the first.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from '../data/mock/MockCommandService';
import { intakeLineStore } from '../data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { PR_INTAKE_LINES } from '../data/mock/fixtures/prIntake';
import { CASCADES, cascadesFor } from './cascades';
import { AUTOMATION_ATOMS } from './businessRoles';
import { getTransition } from './registry';
import { parseBucket } from '../planning/bucket';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import type { QueryScope } from '../data/types';

const svc = new MockCommandService();
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
};

// ⚠️ **ONE LINE PER SUCCESSFUL COMMIT, SO EACH LINE'S ASSERTIONS LIVE IN ONE
// SPEC.** The cascade's idempotency key IS the line id and the dispatcher's
// ingress ledger is a module singleton that outlives a store reset — so a
// second spec committing the same line is answered with the FIRST spec's
// result and mints nothing. That is the mechanism working (asserted as the
// subject of `intakeCommitIdempotency.test.ts`), which is why the specs below
// group by line rather than by claim. A REFUSED commit records no key, so the
// refusal specs may share one freely.
const AS_DELIVERED = 'pil-somo-001'; // 12,000 / 12,000, month bucket '2026-09'
const OVERRIDDEN = 'pil-grid-002'; // 80,000 / 90,000, ISO-week bucket '2026-W36'
const REFUSED_SEAT = 'pil-somo-002';

const lineOf = (id: string) => PR_INTAKE_LINES.find((l) => l.id === id)!;

const commit = (lineId: string, qty: number, reason?: string, scope: QueryScope = buyer) =>
  svc.dispatch(scope, {
    transitionId: 't_intake_commit',
    entity: 'intakeLine',
    entityId: lineId,
    payload: {
      acceptedQty: qty,
      acceptedQtyRaw: String(qty),
      ...(reason ? { overrideReason: reason } : {}),
    },
  });

const raisedFrom = (lineId: string) =>
  purchaseRequisitionStore.all().filter((p) => p.intakeLineId === lineId);

beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

describe('the link is declared, and the machine grant can reach its target', () => {
  it('registers `t_intake_commit` → `t_pr_create` on `purchaseRequisition`', () => {
    expect(cascadesFor('t_intake_commit')).toEqual([
      { targetEntity: 'purchaseRequisition', targetTransitionId: 't_pr_create' },
    ]);
  });

  // ⚠️ **THE FAN-OUT RUNS UNDER THE AUTOMATION GRANT, SO EVERY CASCADE TARGET'S
  // ATOM MUST BE IN IT.** Narrowing that grant without re-running this is
  // exactly how a currently-reachable act becomes unreachable — and a cascade
  // refused at the role gate is RECORDED but unsurfaced, so nobody sees it.
  it('grants every cascade target’s atom to the machine, derived from CASCADES', () => {
    for (const [, links] of Object.entries(CASCADES)) {
      for (const link of links) {
        const atom = getTransition(link.targetTransitionId)!.requiredRole;
        expect(AUTOMATION_ATOMS).toContain(atom);
      }
    }
    // Known-true control in the same run: the grant is not simply everything.
    expect(AUTOMATION_ATOMS).not.toContain('pr:approve');
  });
});

describe('the requisition carries its origin on the DOCUMENT (A1-R3)', () => {
  it('an accept-as-delivered commit writes the line id and the MONTH bucket, and no decision', async () => {
    const line = lineOf(AS_DELIVERED);
    expect(line.periodBucket).toBe('2026-09');
    const r = await commit(AS_DELIVERED, line.acceptedQty);
    expect(r.status).not.toBe('failed');

    const [pr] = raisedFrom(AS_DELIVERED);
    expect(pr).toBeDefined();
    expect(pr.intakeLineId).toBe(AS_DELIVERED);
    expect(pr.periodBucket).toBe('2026-09');
    expect(pr.quantity).toBe(line.acceptedQty);
    // Nobody overrode anything. An absent `decision` says exactly that — never
    // "the override was unexplained".
    expect(pr.decision).toBeUndefined();

    // ⚠️ **AND NO FABRICATED DAY** (A1-R1). `t_pr_create` used to read
    // `requiredDate: str('requiredDate') || str('period')`, so a date-typed,
    // date-named field held a planning grain — and a MONTH is the one form
    // `Date` happily parses, so THIS row's `'2026-09'` rendered as
    // **`01 Sept 2026`, a day nobody entered.** An unparseable bucket renders
    // as visibly absent; a fabricated day reads as an answer, which is worse,
    // and it is why the month row is the specimen here.
    expect(pr.requiredDate).toBe('');
    // What DID land is a bucket the one discriminator accepts — with its
    // bilateral control in the same run, so `ok: true` is evidence rather than
    // a parser that says yes to everything.
    expect(parseBucket(pr.periodBucket!).ok).toBe(true);
    expect(parseBucket('2026-Q3').ok).toBe(false);
  });
});

describe('the governed decision — derived at dispatch, never authored (A1-R2a)', () => {
  it('records from/to/reason with `wasAdjusted` derived, on the document AND the event', async () => {
    const line = lineOf(OVERRIDDEN);
    // An ISO-WEEK row, and one the producer adjusted UPWARD — so neither the
    // grain nor the direction is the one a month-and-a-trim would exercise.
    expect(line.periodBucket).toBe('2026-W36');
    expect([line.suggestedQty, line.acceptedQty]).toEqual([80_000, 90_000]);

    await commit(OVERRIDDEN, 85_000, '  line yield revised  ');
    const [pr] = raisedFrom(OVERRIDDEN);
    expect(pr.periodBucket).toBe('2026-W36');
    expect(pr.decision).toEqual({
      field: 'acceptedQty',
      from: 90_000,
      to: 85_000,
      reason: 'line yield revised',
      wasAdjusted: true,
    });
    // ⚠️ **THE BASELINE, PINNED.** `from` is the PRODUCER's DELIVERED quantity,
    // never its suggestion — derived from the wrong operand, `wasAdjusted` would
    // faithfully compute the wrong fact in the one place nobody can correct it.
    expect(pr.decision!.from).toBe(line.acceptedQty);
    expect(pr.decision!.from).not.toBe(line.suggestedQty);

    // The SAME decision on the DR-10 event: the ledger and the document agree,
    // because both are stamped from the one value the dispatcher derived.
    const withDecision = commandAuditSink
      .all()
      .filter((e) => e.event === 't_pr_create' && e.decision !== undefined);
    expect(withDecision.length).toBeGreaterThan(0);
    const last = withDecision[withDecision.length - 1];
    expect(last.decision).toEqual(pr.decision);
    // The fan-out groups under the source command's correlationId (DR-10), so
    // the commit and the requisition it minted are one story in the trail.
    expect(typeof last.causationId).toBe('string');
  });
});

describe('what the cascade does NOT do', () => {
  it('raises nothing when the source verb is refused — no half-commit', async () => {
    const financeOnly: QueryScope = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: ['finance'],
    };
    const r = await commit(REFUSED_SEAT, 4_500, undefined, financeOnly);
    expect(r.status).toBe('failed');
    expect(raisedFrom(REFUSED_SEAT)).toEqual([]);
    expect(intakeLineStore.stateOf(REFUSED_SEAT)).toBe('Pending');
  });

  it('raises nothing when a policy hook refuses — the gates run before the fan-out', async () => {
    const r = await commit(REFUSED_SEAT, 4_200); // an override with no reason
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/INTAKE_OVERRIDE_REASONED/);
    expect(raisedFrom(REFUSED_SEAT)).toEqual([]);
  });
});
