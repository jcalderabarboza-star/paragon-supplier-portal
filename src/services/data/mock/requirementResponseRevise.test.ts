// ────────────────────────────────────────────────────────────────────────────
// A3 · SUPPLIER ANSWERS STAY HONEST (Design 2 §4 / §10, batch B3).
//
// R2 §8 measured two holes and an ordering defect, with the supplier's ONLY
// move after a buyer's decision being a fresh creation:
//
//   PROBE A — re-submitting over a Disputed rr-0002 left the dispute `Disputed`
//             in the store, listed by no surface, never answered; the line read
//             `confirmed-full` off a NEW v1 row.
//   PROBE B — re-submitting 100 over an Accepted 6 000 read as plain `short`,
//             with no mark that an accepted commitment had been cut.
//   SDC-R6  — `submissionVersion` restarted per publication, and "latest" was
//             decided by the store prepending.
//
// Both probes are re-run here THROUGH THE MACHINE — every state is reached by
// dispatching the real verbs, never by writing a status into the store — and
// each refusal is asserted BY NAME, beside a known-good twin that must pass.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { DataError } from '../types';
import type { QueryScope } from '../types';
import { SAMPLE_PEOPLE } from '../../identity/sampleRoster';
import { PERSONA_SYSTEM_ROLES, AUTOMATION_ATOMS } from '../../transitions/businessRoles';
import { getFlow, personaCan } from '../../transitions';
import {
  FORECAST_PUBLICATIONS,
  chaseList,
  consolidationRows,
  currentPublication,
  sdcClock,
  type RequirementResponse,
} from '../../sdc';
import { severityOf } from '../../chase/unifiedChase';

// SDC-3 · operator ruling: accept and dispute require an ATTRIBUTED actor, so the seat
// that takes them names the planning sample person. The assertions are unchanged;
// the refusal of an unattributed seat is pinned in `sdc3RevisionOnSend.test.ts`.
const PLANNING_PERSON = {
  kind: 'RESOLVED' as const,
  person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'planning' && p.ordinal === 1)!.personId },
};
const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: PLANNING_PERSON };
const SUP002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const SUP005: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const SUP007: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const svc = new MockCommandService();

const buyerAct = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(BUYER, { transitionId, entity: 'requirementResponse', entityId, payload });

const revise = (scope: QueryScope, entityId: string, payload: Record<string, unknown>) =>
  svc.dispatch(scope, {
    transitionId: 't_requirementresponse_revise',
    entity: 'requirementResponse',
    entityId,
    payload,
  });

const promote = (scope: QueryScope, entityId: string) =>
  svc.dispatch(scope, { transitionId: 't_requirementresponse_promote', entity: 'requirementResponse', entityId });

/** The revision minted for `priorId` — found by the link, never by position. */
const revisionOf = (priorId: string): RequirementResponse | undefined =>
  requirementResponseStore.all().find((r) => r.supersedes === priorId);

const rowFor = (key: string) =>
  consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all()).find((r) => r.id === key)!;

beforeEach(() => {
  requirementResponseStore.reset();
  sdcClock.reset();
});

describe('A3 · the registry says what the machine does', () => {
  const flow = getFlow('requirementResponse')!;

  it('initial is `Draft` (SDC-R13) — the commitment verb births there', () => {
    expect(flow.initial).toBe('Draft');
    expect(flow.transitions.find((t) => t.id === 't_requirementresponse_submit')!.to).toBe('Draft');
  });

  it('`Superseded` is the terminal; `Accepted` is not — it has a supplier exit', () => {
    expect(flow.terminals).toEqual(['Superseded']);
    expect(flow.transitions.some((t) => t.from.includes('Accepted'))).toBe(true);
  });

  it('revise is the SUPPLIER\'s commercial atom; supersede belongs to no person', () => {
    const rv = flow.transitions.find((t) => t.id === 't_requirementresponse_revise')!;
    expect(rv.from).toEqual(['Disputed', 'Accepted']);
    expect(personaCan('supplier', rv.requiredRole)).toBe(true);
    expect(personaCan('buyer', rv.requiredRole)).toBe(false);
    const ss = flow.transitions.find((t) => t.id === 't_requirementresponse_supersede')!;
    expect(ss.trigger).toBe('cascade');
    expect(ss.surfaceable.surfaced).toBe(false);
    expect(AUTOMATION_ATOMS).toContain(ss.requiredRole);
    expect(personaCan('supplier', ss.requiredRole)).toBe(false);
    expect(personaCan('buyer', ss.requiredRole)).toBe(false);
  });
});

describe('PROBE A re-run — a supplier answers a dispute by REVISING it', () => {
  it('CONTROL: the seed puts rr-0002 in `Disputed` with a raised entry, and nothing supersedes it', () => {
    const rr = requirementResponseStore.get('rr-0002')!;
    expect(rr.status).toBe('Disputed');
    expect(rr.disputeResponse?.map((e) => e.kind)).toEqual(['raised']);
    expect(revisionOf('rr-0002')).toBeUndefined();
  });

  it('the plain submit Probe A used is REFUSED BY NAME, and names the answer it would bury', async () => {
    const before = requirementResponseStore.all().length;
    const res = await svc.dispatch(SUP005, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: {
        publicationId: 'PUB-2026-08-RM-R2',
        planVersion: 'PV-2026-08.2',
        materialCode: 'RM-EMUL-3310',
        periodBucket: '2026-08',
        supplierId: 'sup-005',
        confirmedQty: 3500,
        confirmedQtyRaw: '3500',
      },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/^POLICY_REJECTED:rr_submit_no_open_sibling:/);
    expect(res.reason).toMatch(/rr-0002 v1 Disputed/);
    expect(requirementResponseStore.all().length).toBe(before);
  });

  // ⚠️ RE-PINNED BY SDC-3 (R-SDC P0 #4). This read "revise → the dispute is retired", and that was
  // the defect: an unsent DRAFT retired the dispute, so it left the buyer's queue and the line read
  // awaiting before the supplier had sent anything. The retirement now happens when the revision is
  // SENT; every assertion the old case made is kept, after the send, and the draft-time half is new.
  it('revise DRAFTS the answer and retires nothing; SENDING it retires the dispute, ANSWERED BY THE SUPPLIER', async () => {
    const res = await revise(SUP005, 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    expect(res.status).toBe('done');
    // the draft answers nothing yet: the dispute stands, its ledger untouched
    expect(requirementResponseStore.get('rr-0002')!.status).toBe('Disputed');
    expect(requirementResponseStore.get('rr-0002')!.disputeResponse?.map((e) => e.kind)).toEqual(['raised']);
    expect(requirementResponseStore.get('rr-0002')!.supersededFrom).toBeUndefined();
    expect((await promote(SUP005, revisionOf('rr-0002')!.id)).status).toBe('done');

    const prior = requirementResponseStore.get('rr-0002')!;
    expect(prior.status).toBe('Superseded');
    expect(prior.supersededFrom).toBe('Disputed');
    // The ledger keeps the raise and gains the supplier's answer — never a
    // buyer `resolved`, and never text the supplier did not write.
    expect(prior.disputeResponse?.map((e) => e.kind)).toEqual(['raised', 'superseded-by-revision']);
    expect(prior.disputeResponse?.[1].text).toBe('');

    const next = revisionOf('rr-0002')!;
    expect(next.status).toBe('Submitted');
    expect(next.submittedAt).toBe(sdcClock.now());
    expect(next.supplierId).toBe('sup-005');
    expect(next.forecastConfirmation?.confirmedQty).toBe(3500);
    // SDC-R6: the thread spans publications — v2, not a second v1 — and the
    // revision answers the CURRENT publication, not the one the prior bound.
    expect(next.submissionVersion).toBe(2);
    expect(prior.publicationId).toBe('PUB-2026-08-RM');
    expect(next.publicationId).toBe(currentPublication(FORECAST_PUBLICATIONS, 'month')!.publicationId);
  });

  it('once promoted, the buyer\'s row reads the revision AS an answer to the dispute', async () => {
    await revise(SUP005, 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    const next = revisionOf('rr-0002')!;
    expect((await promote(SUP005, next.id)).status).toBe('done');

    const row = rowFor('sup-005|RM-EMUL-3310|2026-08');
    expect(row.state.kind).toBe('confirmed-full');
    expect('response' in row.state && row.state.response.id).toBe(next.id);
    expect(row.revisionOf).toBe('Disputed');
    // Nothing is orphaned: no Disputed response is left on the key.
    expect(
      requirementResponseStore.forResponseKey('sup-005', 'RM-EMUL-3310', '2026-08').map((r) => r.status),
    ).not.toContain('Disputed');
  });

  // ⚠️ RE-PINNED BY SDC-3 (R-SDC P0 #4). This asserted `awaiting` — the line forgot the dispute
  // the moment a draft existed. The last SUBMITTED answer is still rr-0002, and it is still disputed.
  it('with the revision still a draft, the buyer reads the LAST SUBMITTED answer — the disputed one, never the draft', async () => {
    await revise(SUP005, 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    const row = rowFor('sup-005|RM-EMUL-3310|2026-08');
    expect('response' in row.state && row.state.response.id).toBe('rr-0002');
    expect('response' in row.state && row.state.response.status).toBe('Disputed');
    expect(row.state.kind).not.toBe('awaiting');
  });

  // ⚠️ EXTENDED BY SDC-3: the prior now stays open while its revision is a draft, so a second
  // revise BEFORE the send is refused by name (one draft answers it); AFTER the send it is
  // illegal exactly as before — `Superseded` is an ending.
  it('a second revise is refused while the first is a draft, and ILLEGAL once it is sent', async () => {
    await revise(SUP005, 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '3500' });
    const draft = revisionOf('rr-0002')!;
    const early = await revise(SUP005, 'rr-0002', { confirmedQty: 3400, confirmedQtyRaw: '3400' });
    expect(early.status).toBe('failed');
    expect(early.reason).toMatch(/^POLICY_REJECTED:rr_revise_no_open_draft:RR_REVISION_ALREADY_DRAFTED: rr-0002 is already answered by draft /);
    expect(early.reason).toContain(draft.id);
    await promote(SUP005, draft.id);
    const again = await revise(SUP005, 'rr-0002', { confirmedQty: 3400, confirmedQtyRaw: '3400' });
    expect(again.status).toBe('failed');
    expect(again.reason).toBe('ILLEGAL_TRANSITION:Superseded->Draft');
  });
});

describe('PROBE B re-run — an ACCEPTED commitment is not cut silently', () => {
  const acceptRr0001 = async () => {
    expect((await buyerAct('t_requirementresponse_review', 'rr-0001')).status).toBe('done');
    expect((await buyerAct('t_requirementresponse_accept', 'rr-0001')).status).toBe('done');
    expect(requirementResponseStore.get('rr-0001')!.status).toBe('Accepted');
  };

  it('6 000 → 100 WITHOUT a root cause is refused by name; nothing is minted and nothing retires', async () => {
    await acceptRr0001();
    const before = requirementResponseStore.all().length;
    const res = await revise(SUP002, 'rr-0001', { confirmedQty: 100, confirmedQtyRaw: '100' });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/^POLICY_REJECTED:rr_revise_root_cause_when_cut:/);
    expect(res.reason).toMatch(/accepted 6000 down to 100/);
    expect(requirementResponseStore.all().length).toBe(before);
    expect(requirementResponseStore.get('rr-0001')!.status).toBe('Accepted');
  });

  it('a BLANK root cause is not a root cause (the space-bar lesson)', async () => {
    await acceptRr0001();
    const res = await revise(SUP002, 'rr-0001', {
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      rootCause: { level1: '   ' },
    });
    expect(res.reason).toMatch(/^POLICY_REJECTED:rr_revise_root_cause_when_cut:/);
  });

  it('WITH one → the cut derives `revised-after-accept` and is chased HARD, first', async () => {
    await acceptRr0001();
    const res = await revise(SUP002, 'rr-0001', {
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      rootCause: { level1: 'capacity', note: 'Line down for retooling.' },
    });
    expect(res.status).toBe('done');
    // ⚠️ RE-PINNED BY SDC-3 (R-SDC P0 #4): while the cut is a DRAFT the accepted figure stands —
    // the buyer is still planning on 6 000 until the supplier SENDS the cut.
    expect(requirementResponseStore.get('rr-0001')!.status).toBe('Accepted');
    const next = revisionOf('rr-0001')!;
    expect(next.rootCause).toEqual({ level1: 'capacity', note: 'Line down for retooling.' });
    await promote(SUP002, next.id);
    const prior = requirementResponseStore.get('rr-0001')!;
    expect(prior.status).toBe('Superseded');
    expect(prior.supersededFrom).toBe('Accepted');
    // An Accepted prior had no dispute: its ledger stays untouched.
    expect(prior.disputeResponse).toBeUndefined();

    const row = rowFor('sup-002|RM-EMUL-3310|2026-08');
    expect(row.state).toMatchObject({ kind: 'revised-after-accept', acceptedQty: 6000, cutQty: 5900 });
    expect(row.revisionOf).toBe('Accepted');

    const pub = currentPublication(FORECAST_PUBLICATIONS, 'month')!;
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    const chase = chaseList(pub, rows, sdcClock.now());
    expect(chase[0]).toMatchObject({ supplierId: 'sup-002', reason: 'revised-after-accept' });
    // "Hard" is the unified chase's own word for it.
    expect(severityOf({ dataReasons: ['revised-after-accept'], commitmentEntries: [] })).toBe('hard');
    expect(severityOf({ dataReasons: ['overdue'], commitmentEntries: [] })).toBe('soft');
  });

  it('KNOWN-GOOD: revising an accepted figure UP owes no root cause', async () => {
    await acceptRr0001();
    const res = await revise(SUP002, 'rr-0001', { confirmedQty: 6500, confirmedQtyRaw: '6500' });
    expect(res.status).toBe('done');
    await promote(SUP002, revisionOf('rr-0001')!.id);
    expect(rowFor('sup-002|RM-EMUL-3310|2026-08').state.kind).toBe('confirmed-full');
  });

  it('KNOWN-GOOD: cutting a DISPUTED figure owes no root cause here — nothing was accepted', async () => {
    const res = await revise(SUP005, 'rr-0002', { confirmedQty: 100, confirmedQtyRaw: '100' });
    expect(res.status).toBe('done');
  });

  it('once the buyer ACCEPTS the cut, it stops being chased — the new number is the plan', async () => {
    await acceptRr0001();
    await revise(SUP002, 'rr-0001', {
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      rootCause: { level1: 'capacity' },
    });
    const next = revisionOf('rr-0001')!;
    await promote(SUP002, next.id);
    await buyerAct('t_requirementresponse_review', next.id);
    await buyerAct('t_requirementresponse_accept', next.id);
    expect(rowFor('sup-002|RM-EMUL-3310|2026-08').state.kind).toBe('short');
  });
});

describe('A3 · the revise verb refuses what it must, by name', () => {
  it('from `Submitted` (the buyer has not decided) → ILLEGAL_TRANSITION', async () => {
    const res = await revise(SUP002, 'rr-0001', { confirmedQty: 5000, confirmedQtyRaw: '5000' });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ILLEGAL_TRANSITION:Submitted->Draft');
  });

  it('another supplier\'s response → SCOPE_DENIED (thrown, before anything is read)', async () => {
    await expect(
      revise(SUP002, 'rr-0002', { confirmedQty: 1, confirmedQtyRaw: '1' }),
    ).rejects.toBeInstanceOf(DataError);
  });

  it('a buyer → ROLE_NOT_PERMITTED — revising is the supplier\'s answer', async () => {
    const res = await buyerAct('t_requirementresponse_revise', 'rr-0002', {
      confirmedQty: 1,
      confirmedQtyRaw: '1',
    });
    expect(res.reason).toBe('ROLE_NOT_PERMITTED:requirementresponse:submit');
  });

  it('an ACKNOWLEDGMENT is not revised into a commitment (rr_revise_commitment_only)', async () => {
    await buyerAct('t_requirementresponse_review', 'rr-0005');
    await buyerAct('t_requirementresponse_accept', 'rr-0005');
    const res = await revise(SUP007, 'rr-0005', { confirmedQty: 800, confirmedQtyRaw: '800' });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/^POLICY_REJECTED:rr_revise_commitment_only:/);
  });

  it('the number must agree with its token, exactly as on submit (rr_submit_qty_agrees)', async () => {
    const res = await revise(SUP005, 'rr-0002', { confirmedQty: 3500, confirmedQtyRaw: '350' });
    expect(res.reason).toMatch(/^POLICY_REJECTED:rr_submit_qty_agrees:/);
  });

  it('a negative quantity is refused by the floor (rr_submit_qty_floor)', async () => {
    const res = await revise(SUP005, 'rr-0002', { confirmedQty: -1, confirmedQtyRaw: '-1' });
    expect(res.reason).toMatch(/^POLICY_REJECTED:rr_submit_qty_floor:/);
  });

  it('the supersede cannot be fired by a person — not the supplier, not the buyer', async () => {
    const asSupplier = await svc.dispatch(SUP005, {
      transitionId: 't_requirementresponse_supersede',
      entity: 'requirementResponse',
      entityId: 'rr-0002',
    });
    expect(asSupplier.reason).toBe('ROLE_NOT_PERMITTED:requirementresponse:supersede');
    const asBuyer = await buyerAct('t_requirementresponse_supersede', 'rr-0002');
    expect(asBuyer.reason).toBe('ROLE_NOT_PERMITTED:requirementresponse:supersede');
    expect(requirementResponseStore.get('rr-0002')!.status).toBe('Disputed');
  });

  it('KNOWN-GOOD: a plain submit on a line with NO answer still lands', async () => {
    const res = await svc.dispatch(SUP007, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: {
        publicationId: 'PUB-2026-08-RM-R2',
        planVersion: 'PV-2026-08.2',
        materialCode: 'PK-CAPF-8820',
        periodBucket: '2026-09',
        supplierId: 'sup-007',
        confirmedQty: 60000,
        confirmedQtyRaw: '60000',
      },
    });
    expect(res.status).toBe('done');
  });
});

describe('SDC-R6 — the latest pick is ORDERED, never decided by insertion', () => {
  // Probe A's tie: two `v1` rows on ONE line, one answering the old publication
  // and one the current. Built as plain data and fed in BOTH insertion orders —
  // the pure selector is the subject, so no dispatch is needed to reach it.
  const base = requirementResponseStore.get('rr-0002')!;
  const oldV1: RequirementResponse = { ...base, id: 'rr-tie-old', status: 'Submitted', submittedAt: '2026-08-10T00:00:00.000Z', disputeResponse: undefined };
  const newV1: RequirementResponse = {
    ...oldV1,
    id: 'rr-tie-new',
    publicationId: 'PUB-2026-08-RM-R2',
    planVersion: 'PV-2026-08.2',
    submittedAt: '2026-08-05T00:00:00.000Z', // EARLIER instant: publishedAt must outrank it
    forecastConfirmation: { ...base.forecastConfirmation!, confirmedQty: 3500 },
  };
  const pick = (responses: readonly RequirementResponse[]) => {
    const row = consolidationRows(FORECAST_PUBLICATIONS, responses).find(
      (r) => r.id === 'sup-005|RM-EMUL-3310|2026-08',
    )!;
    return 'response' in row.state ? row.state.response.id : null;
  };

  it('the answer to the LATER publication wins, whichever row was inserted first', () => {
    expect(pick([oldV1, newV1])).toBe('rr-tie-new');
    expect(pick([newV1, oldV1])).toBe('rr-tie-new');
  });

  it('within one publication, the higher version wins in both orders', () => {
    const v2 = { ...newV1, id: 'rr-tie-v2', submissionVersion: 2, submittedAt: '2026-08-01T00:00:00.000Z' };
    expect(pick([newV1, v2])).toBe('rr-tie-v2');
    expect(pick([v2, newV1])).toBe('rr-tie-v2');
  });

  it('a `Superseded` row is never the answer, even when it is the newest', () => {
    const retired = { ...newV1, id: 'rr-tie-retired', submissionVersion: 9, status: 'Superseded' as const };
    expect(pick([oldV1, retired])).toBe('rr-tie-old');
  });
});
