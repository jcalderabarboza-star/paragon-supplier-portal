// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE PSL VERBS, THROUGH THE DISPATCHER — every hook, both ways.
//
// ⚠️ **EVERY SPEC HERE DISPATCHES. NOT ONE CALLS A HOOK DIRECTLY.** A hook body
// invoked in isolation proves the predicate; it proves nothing about whether
// the flow REFERENCES it, whether the dispatcher REACHES it, or whether the
// order it runs in lets an earlier gate answer first. Those are the three ways
// a correct hook ships inert, and the only instrument that sees all three is
// the dispatcher.
//
// ── ⚠️ THE PROBES ARE BILATERAL, WITHOUT EXCEPTION (rule 4) ────────────────
//   *"Assert a known-GOOD input passes before you believe a known-BAD input
//   failed."* A refusal spec alone would ship green against a verb that
//   refuses everything — including the one it is supposed to allow — and that
//   is a guard which is wrong about what it should ACCEPT, which is the shape
//   rule 4 exists for.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { seedPslListings } from './pslSeed';
import { pslStore } from './stores/pslStore';
import { pslCapSettingStore, PSL_DEFAULT_CAP_SETTING_ID } from './stores/pslCapSettingStore';
import { DECLARED_PRESENT } from '../fixturePresent';
import { NO_PERSON } from '../../../context/noPerson';
import {
  PSL_CAP_CEILING_DAYS,
  effectiveCap,
  effectiveValidUntil,
  isPslInForce,
  pslDisplayStatus,
} from '../pslProjection';
import { pslStatusFor } from '../pslSourcingSeam';
import { pslExemptionFor } from '../rfqSourcingGate';
import { pslFlow } from '../../transitions/flows/psl.flow';
import { getTransition } from '../../transitions/registry';
import { isPublished } from '../pslListing';
import type { ActorAttribution } from '../../../lib/enforcement';
import { DataError } from '../types';
import type { CommandResult, QueryScope } from '../types';

const P = DECLARED_PRESENT;

const PROCUREMENT: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON,
};
const COMPLIANCE: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON,
};

let commands: MockCommandService;

/** A well-formed proposal payload, with one field overridable per probe. */
const proposal = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  supplierId: 'sup-002',
  materialCodes: ['RM-PSTN-7150'],
  status: 'Validated',
  validFrom: P,
  validUntil: '2027-01-01',
  justification: 'pre-qualified on quality and lead time',
  reason: 'raised by the sourcing squad',
  ...over,
});

const propose = (over: Record<string, unknown> = {}): Promise<CommandResult> =>
  commands.dispatch(PROCUREMENT, {
    transitionId: 't_psl_propose',
    entity: 'psl',
    payload: proposal(over),
  });

/** Raise a listing and return its id, failing loudly if the raise is refused. */
async function raise(over: Record<string, unknown> = {}): Promise<string> {
  const r = await propose(over);
  expect(r.status, r.reason ?? '').not.toBe('failed');
  return r.entityId!;
}

/** Raise and grant, returning the id. */
async function listed(over: Record<string, unknown> = {}): Promise<string> {
  const id = await raise(over);
  const g = await commands.dispatch(COMPLIANCE, {
    transitionId: 't_psl_grant',
    entity: 'psl',
    entityId: id,
    payload: { reason: 'accepted' },
  });
  expect(g.status, g.reason ?? '').not.toBe('failed');
  return id;
}

beforeEach(async () => {
  pslStore.reset();
  pslCapSettingStore.reset();
  expect((await seedPslListings()).status).toBe('seeded');
  commands = new MockCommandService();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the machine is wired, else every spec below is vacuous', () => {
  it('⚠️ `psl` AND `pslCapSetting` ARE WIRED TARGETS', async () => {
    const { WIRED_COMMAND_TARGETS } = await import('./MockCommandService');
    expect(WIRED_COMMAND_TARGETS).toContain('psl');
    expect(WIRED_COMMAND_TARGETS).toContain('pslCapSetting');
    // KNOWN-BAD control: a flow with no target is genuinely absent.
    expect(WIRED_COMMAND_TARGETS).not.toContain('compliance');
  });

  it('the corpus is seeded and reachable by id', () => {
    expect(pslStore.get('psl-001')).toBeDefined();
    expect(pslStore.get('psl-008')?.lifecycle).toBe('Proposed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_psl_propose — the birth edge, and its five hooks', () => {
  it('⚠️ KNOWN-GOOD FIRST — a well-formed proposal is ACCEPTED', async () => {
    const r = await propose();
    expect(r.status, r.reason ?? '').not.toBe('failed');
    const row = pslStore.get(r.entityId!)!;
    expect(row.lifecycle).toBe('Proposed');
    expect(row.decidedBy).toBeNull();
    expect(row.publishedAt).toBeNull();
    expect(row.statusHistory).toHaveLength(1);
  });

  it('PSL_SUPPLIER_RESOLVED — an id the roster does not carry is refused BY NAME', async () => {
    const r = await propose({ supplierId: 'sup-not-a-supplier' });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PSL_SUPPLIER_UNKNOWN/);
  });

  it('PSL_SCOPE_WELL_FORMED — a BLANK scope, and an INVENTED code, are both refused', async () => {
    // ⚠️ **A LITERALLY EMPTY ARRAY NEVER REACHES THE HOOK, AND THAT IS
    // MEASURED RATHER THAN ASSUMED.** The dispatcher's `requiredFields` check
    // answers first with `MISSING_FIELDS:materialCodes` — correct, and it is
    // why the hook's emptiness arm had to be aimed at what the dispatcher
    // CANNOT see.
    const missing = await propose({ materialCodes: [] });
    expect(missing.reason).toMatch(/MISSING_FIELDS:materialCodes/);

    // ⚠️ THE ARM THE HOOK OWNS: a list of BLANKS is present, non-empty, and
    // names no material. Same gap as the whitespace-justification case.
    const blank = await propose({ materialCodes: ['  ', ''] });
    expect(blank.reason).toMatch(/PSL_SCOPE_EMPTY/);

    // ⚠️ MEMBERSHIP, NEVER PRESENCE — the
    // `QUOTATION_SUBMIT_CURRENCY_PERMITTED` lesson. `requiredFields` would
    // admit this list and the listing would cover a code no event can match.
    const bogus = await propose({ materialCodes: ['RM-NOT-A-CODE-9999'] });
    expect(bogus.reason).toMatch(/PSL_SCOPE_UNKNOWN_CODE/);
  });

  it('PSL_STATUS_KNOWN — an off-list designation is refused', async () => {
    const r = await propose({ status: 'Preferred' });
    expect(r.reason).toMatch(/PSL_STATUS_UNKNOWN/);
  });

  it('PSL_VALIDITY_ORDERED — an inverted validity is refused, and an ALREADY-PAST one is NOT', async () => {
    const inverted = await propose({ validFrom: '2027-01-01', validUntil: '2026-01-01' });
    expect(inverted.reason).toMatch(/PSL_VALIDITY_INVERTED/);

    // ⚠️ **THE OTHER DIRECTION, AND IT IS THE LOAD-BEARING HALF.** A verb that
    // refused an already-past validity would put a clock inside a transition
    // (law 0.5) and would refuse the day-one BACKFILL that is how an existing
    // preferred supplier list enters this portal. It must be ACCEPTED.
    const backfill = await propose({ validFrom: '2020-01-01', validUntil: '2021-01-01' });
    expect(backfill.status, backfill.reason ?? '').not.toBe('failed');
  });

  it('PSL_JUSTIFICATION_AUTHORED — blank AND whitespace are both refused', async () => {
    expect((await propose({ justification: '' })).reason).toMatch(/MISSING_FIELDS|PSL_JUSTIFICATION_BLANK/);
    // ⚠️ THE ONE `requiredFields` CANNOT CATCH: the dispatcher's emptiness
    // check admits a string of spaces, which is the whole reason this is a
    // hook. Third verb in this tree to learn it.
    expect((await propose({ justification: '   ' })).reason).toMatch(
      /PSL_JUSTIFICATION_BLANK/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_psl_grant / t_psl_reject — the decision', () => {
  it('⚠️ KNOWN-GOOD — a grant moves the row, writes the decider, appends the ledger', async () => {
    const id = await raise();
    const before = pslStore.get(id)!.statusHistory.length;
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: id,
      payload: { reason: 'evidence accepted' },
    });
    expect(r.status, r.reason ?? '').not.toBe('failed');
    const row = pslStore.get(id)!;
    expect(row.lifecycle).toBe('Listed');
    expect(row.decidedBy).not.toBeNull();
    expect(row.statusHistory.length).toBe(before + 1);
    expect(row.statusHistory[before].reason).toBe('evidence accepted');
  });

  it('PSL_DECISION_AUTHORED — a whitespace reason is refused on grant AND on reject', async () => {
    const a = await raise();
    expect(
      (
        await commands.dispatch(COMPLIANCE, {
          transitionId: 't_psl_grant',
          entity: 'psl',
          entityId: a,
          payload: { reason: '  ' },
        })
      ).reason,
    ).toMatch(/PSL_DECISION_BLANK/);

    const b = await raise();
    expect(
      (
        await commands.dispatch(COMPLIANCE, {
          transitionId: 't_psl_reject',
          entity: 'psl',
          entityId: b,
          payload: { reason: '\t' },
        })
      ).reason,
    ).toMatch(/PSL_DECISION_BLANK/);
  });

  it('⚠️ BOTH ENDINGS ARE TERMINAL — a rejected listing cannot be granted later', async () => {
    const id = await raise();
    const rejected = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_reject',
      entity: 'psl',
      entityId: id,
      payload: { reason: 'a second qualified source exists' },
    });
    expect(rejected.status, rejected.reason ?? '').not.toBe('failed');

    // Ruling (f): a second attempt is a NEW record through `t_psl_propose`.
    const again = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: id,
      payload: { reason: 'changed my mind' },
    });
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/ILLEGAL_TRANSITION/);

    // And a WITHDRAWN one likewise.
    const w = await listed();
    await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_withdraw',
      entity: 'psl',
      entityId: w,
      payload: { reason: 'tooling change not re-qualified' },
    });
    const revive = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_change_status',
      entity: 'psl',
      entityId: w,
      payload: { status: 'Mandatory', reason: 'revive' },
    });
    expect(revive.status).toBe('failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ FOUR-EYES — BUILT, TYPED FOR, AND UNABLE TO FIRE TODAY', () => {
  it('⚠️ IT ADMITS ON THE REAL TREE — and its green is NOT a working check', async () => {
    // Every actor is `UNATTRIBUTED: NO_PERSON_IN_SESSION`, so `isAttributed` is
    // false on both sides, the comparison never happens and the hook returns
    // ok. That direction is CORRECT — an unattributed act is not evidence of
    // self-approval — and this assertion exists to record that the green means
    // exactly that and nothing more.
    const id = await raise();
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: id,
      payload: { reason: 'accepted' },
    });
    expect(r.status, r.reason ?? '').not.toBe('failed');
    expect(pslStore.get(id)!.proposedBy.kind).toBe('UNATTRIBUTED');
  });

  it('⚠️ AND IT REFUSES A SYNTHETIC RESOLVED PAIR, BY NAME — the half that proves it can fire', async () => {
    // ⚠️ **A ONE-SIDED PROBE OVER A POPULATION WHERE A HOOK CANNOT FIRE PROVES
    // NOTHING** (rule 4). The predicate is exercised here against an actor this
    // tree cannot yet construct in shipped code, which is what says the hook is
    // in place and waiting rather than merely syntactically present.
    const person: ActorAttribution = {
      kind: 'RESOLVED',
      person: { personId: 'p-1', displayName: 'A Person' },
    } as ActorAttribution;
    const resolvedScope: QueryScope = { ...PROCUREMENT, actor: person };
    const r1 = await commands.dispatch(resolvedScope, {
      transitionId: 't_psl_propose',
      entity: 'psl',
      payload: proposal(),
    });
    expect(r1.status, r1.reason ?? '').not.toBe('failed');
    const id = r1.entityId!;
    expect(pslStore.get(id)!.proposedBy.kind).toBe('RESOLVED');

    // The SAME person decides, from the deciding lane.
    const same = await commands.dispatch(
      { ...COMPLIANCE, actor: person },
      { transitionId: 't_psl_grant', entity: 'psl', entityId: id, payload: { reason: 'mine' } },
    );
    expect(same.status).toBe('failed');
    expect(same.reason).toMatch(/PSL_DECIDER_IS_PROPOSER/);

    // ⚠️ KNOWN-GOOD: a DIFFERENT resolved person is admitted, so the refusal
    // above is about identity rather than about being resolved at all.
    const other: ActorAttribution = {
      kind: 'RESOLVED',
      person: { personId: 'p-2', displayName: 'Another Person' },
    } as ActorAttribution;
    const ok = await commands.dispatch(
      { ...COMPLIANCE, actor: other },
      { transitionId: 't_psl_grant', entity: 'psl', entityId: id, payload: { reason: 'theirs' } },
    );
    expect(ok.status, ok.reason ?? '').not.toBe('failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_psl_change_status and t_psl_renew — the appends on Listed', () => {
  it('⚠️ KNOWN-GOOD — a change moves the designation and appends `from → to`', async () => {
    const id = await listed();
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_change_status',
      entity: 'psl',
      entityId: id,
      payload: { status: 'Mandatory', reason: 'strategy approved' },
    });
    expect(r.status, r.reason ?? '').not.toBe('failed');
    const row = pslStore.get(id)!;
    expect(row.status).toBe('Mandatory');
    expect(row.lifecycle).toBe('Listed');
    const last = row.statusHistory[row.statusHistory.length - 1];
    expect(last.from).toBe('Validated');
    expect(last.to).toBe('Mandatory');
  });

  it('PSL_STATUS_ACTUALLY_CHANGES — a no-op change is refused', async () => {
    const id = await listed();
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_change_status',
      entity: 'psl',
      entityId: id,
      payload: { status: 'Validated', reason: 'no change' },
    });
    expect(r.reason).toMatch(/PSL_STATUS_UNCHANGED/);
  });

  it('⚠️ A STATUS CHANGE DOES NOT TOUCH `publishedAt` (operator ruling c)', async () => {
    const id = await listed();
    await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: id,
      payload: {},
    });
    const publishedAt = pslStore.get(id)!.publishedAt;
    expect(publishedAt).not.toBeNull();

    await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_change_status',
      entity: 'psl',
      entityId: id,
      payload: { status: 'Mandatory', reason: 'strategy approved' },
    });
    // Once published, the supplier sees the CURRENT status: the team controls
    // the FIRST disclosure and after that the truth propagates. Clearing the
    // instant would be an unpublish under another name, which ruling (b)
    // refuses — and there would then be no record of when they were told.
    expect(pslStore.get(id)!.publishedAt).toBe(publishedAt);
    expect(pslStore.get(id)!.status).toBe('Mandatory');
  });

  it('PSL_RENEWAL_EXTENDS — a shorter end date is refused; a later one is accepted', async () => {
    const id = await listed({ validFrom: P, validUntil: '2026-10-01' });
    const current = effectiveValidUntil(pslStore.get(id)!)!;

    const backwards = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: id,
      payload: { validUntil: '2026-09-01', reason: 'shorten' },
    });
    expect(backwards.reason).toMatch(/PSL_RENEWAL_DOES_NOT_EXTEND/);

    // KNOWN-GOOD, and INSIDE the cap so the other hook does not answer first.
    const forward = new Date(Date.parse(current) + 10 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const ok = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: id,
      payload: { validUntil: forward, reason: 'extended for the next campaign' },
    });
    expect(ok.status, ok.reason ?? '').not.toBe('failed');
    expect(pslStore.get(id)!.validUntil).toBe(forward);
  });

  it('⚠️ PSL_RENEWAL_WITHIN_CAP — an over-cap renewal is REFUSED, never silently bounded', async () => {
    // Operator ruling (e). `effectiveValidUntil` would clamp it quietly, so a
    // person would record two more years, the record would say two years and
    // the surface would say one.
    const id = await listed({ validFrom: P, validUntil: '2026-10-01' });
    const cap = effectiveCap(pslStore.get(id)!);
    const beyond = new Date(Date.parse(P) + (cap.days + 30) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: id,
      payload: { validUntil: beyond, reason: 'a long term' },
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PSL_RENEWAL_EXCEEDS_CAP/);
    // ⚠️ AND NOTHING MOVED — a refusal that left the row half-written would be
    // worse than the clamp it replaced.
    expect(pslStore.get(id)!.validUntil).toBe('2026-10-01');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_psl_publish — the disclosure', () => {
  it('⚠️ KNOWN-GOOD — it writes BOTH fields, from the store and the session', async () => {
    const id = await listed();
    const r = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: id,
      payload: {},
    });
    expect(r.status, r.reason ?? '').not.toBe('failed');
    const row = pslStore.get(id)!;
    expect(isPublished(row)).toBe(true);
    expect(row.publishedBy).not.toBeNull();
    // ⚠️ NEITHER IS A PAYLOAD FIELD: `publishedAt` is store-assigned (a caller
    // that could set it could backdate a disclosure) and `publishedBy` comes
    // from the session (C10 §6.2).
    expect(row.publishedAt!.length).toBeGreaterThan(10);
  });

  it('⚠️ IT APPENDS NO LEDGER ENTRY — a publication is not a designation', async () => {
    const id = await listed();
    const before = pslStore.get(id)!.statusHistory.length;
    await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: id,
      payload: {},
    });
    expect(pslStore.get(id)!.statusHistory.length).toBe(before);
  });

  it('PSL_NOT_ALREADY_PUBLISHED — the second publish is refused, and the instant is kept', async () => {
    const id = await listed();
    await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: id,
      payload: {},
    });
    const first = pslStore.get(id)!.publishedAt;
    const again = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: id,
      payload: {},
    });
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/PSL_ALREADY_PUBLISHED/);
    expect(pslStore.get(id)!.publishedAt).toBe(first);
  });

  it('⚠️ A `Proposed` LISTING CANNOT BE PUBLISHED — nothing has been decided to disclose', async () => {
    const id = await raise();
    const r = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: id,
      payload: {},
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('⚠️ THERE IS NO UNPUBLISH VERB — ruling (b), asserted against the registry', async () => {
    const { getKnownFlows } = await import('../../transitions/registry');
    const psl = getKnownFlows().find((f) => f.entity === 'psl')!;
    const ids = psl.transitions.map((t) => t.id);
    expect(ids).toContain('t_psl_publish');
    expect(ids.some((i) => /unpublish|retract|conceal/i.test(i))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_psl_cap_override — the per-listing cap, and the ceiling BOTH WAYS', () => {
  it('⚠️ KNOWN-GOOD FIRST — 730 is ACCEPTED and writes all four fields', async () => {
    // Rule 4, in the order it prescribes: believe the refusal only after the
    // acceptance. A verb that refused everything would pass a refusal-only
    // probe.
    const id = await listed({ validUntil: '2099-01-01' });
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_cap_override',
      entity: 'psl',
      entityId: id,
      payload: {
        capDaysOverride: PSL_CAP_CEILING_DAYS,
        capJustification: 'the full term the ceiling allows',
      },
    });
    expect(r.status, r.reason ?? '').not.toBe('failed');
    const row = pslStore.get(id)!;
    expect(row.capDaysOverride).toBe(PSL_CAP_CEILING_DAYS);
    expect(row.capJustification).not.toBeNull();
    expect(row.capDecidedBy).not.toBeNull();
    expect(row.capDecidedAt).not.toBeNull();
    expect(effectiveCap(row).source).toBe('LISTING_OVERRIDE');
  });

  it('⚠️ AND 731 IS REFUSED BY NAME — one day over the ceiling', async () => {
    const id = await listed({ validUntil: '2099-01-01' });
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_cap_override',
      entity: 'psl',
      entityId: id,
      payload: {
        capDaysOverride: PSL_CAP_CEILING_DAYS + 1,
        capJustification: 'one day too long',
      },
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/PSL_CAP_ABOVE_CEILING/);
    // ⚠️ THE REFUSAL STATES THE NUMBER — which is what stopped 730 being a
    // placeholder (ruling i).
    expect(r.reason).toMatch(new RegExp(String(PSL_CAP_CEILING_DAYS)));
    // NOTHING WAS WRITTEN — the quartet is not half-filled by a refusal.
    expect(pslStore.get(id)!.capDaysOverride).toBeNull();
  });

  it('PSL_CAP_NOT_A_DURATION — zero, negative and fractional are all refused', async () => {
    const id = await listed();
    for (const days of [0, -5, 12.5]) {
      const r = await commands.dispatch(COMPLIANCE, {
        transitionId: 't_psl_cap_override',
        entity: 'psl',
        entityId: id,
        payload: { capDaysOverride: days, capJustification: 'x' },
      });
      expect(r.reason, String(days)).toMatch(/PSL_CAP_NOT_A_DURATION/);
    }
  });

  it('PSL_CAP_JUSTIFICATION_AUTHORED — whitespace is refused', async () => {
    const id = await listed();
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_cap_override',
      entity: 'psl',
      entityId: id,
      payload: { capDaysOverride: 90, capJustification: '   ' },
    });
    expect(r.reason).toMatch(/PSL_CAP_JUSTIFICATION_BLANK/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('t_psl_cap_set — the PORTAL DEFAULT, and what it makes true', () => {
  const setting = (days: number): Promise<CommandResult> =>
    commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_cap_set',
      entity: 'pslCapSetting',
      entityId: PSL_DEFAULT_CAP_SETTING_ID,
      payload: { days, setBy: NO_PERSON },
    });

  it('⚠️ KNOWN-GOOD FIRST — a cap within the ceiling is recorded on the ledger', async () => {
    const r = await setting(200);
    expect(r.status, r.reason ?? '').not.toBe('failed');
    expect(pslCapSettingStore.all()).toHaveLength(1);
    expect(pslCapSettingStore.all()[0].days).toBe(200);
    expect(pslCapSettingStore.all()[0].setAt.length).toBeGreaterThan(10);
  });

  it('⚠️ AND IT MAKES `NO_SETTING_RECORDED` MEAN WHAT IT SAYS — the whole point of P3', async () => {
    const id = await listed();
    // Before: nothing has been decided.
    expect(effectiveCap(pslStore.get(id)!).source).toBe('NO_SETTING_RECORDED');
    await setting(200);
    // After: somebody chose this. A different sentence, and an operator acts
    // on the difference — `EnforcementModeSource`'s rule, one lane over.
    expect(effectiveCap(pslStore.get(id)!).source).toBe('PORTAL_DEFAULT');
    expect(effectiveCap(pslStore.get(id)!).days).toBe(200);
  });

  it('PSL_DEFAULT_CAP_WITHIN_CEILING — over the ceiling is refused, at the ceiling is accepted', async () => {
    expect((await setting(PSL_CAP_CEILING_DAYS + 1)).reason).toMatch(
      /PSL_DEFAULT_CAP_ABOVE_CEILING/,
    );
    expect(pslCapSettingStore.all()).toEqual([]);
    const ok = await setting(PSL_CAP_CEILING_DAYS);
    expect(ok.status, ok.reason ?? '').not.toBe('failed');
  });

  it('⚠️ AN UNKNOWN SETTING KEY IS `NOT_FOUND`, never a silently created one', async () => {
    // ⚠️ **THROWN, NOT RETURNED.** `NOT_FOUND` and `SCOPE_DENIED` are the only
    // two dispatcher exits that throw a `DataError`; everything else resolves
    // carrying `{status:'failed'}`. A spec that read `result.status` here would
    // never run its assertion and would pass on the rejection.
    let code = 'NOT_REFUSED';
    try {
      await commands.dispatch(COMPLIANCE, {
        transitionId: 't_psl_cap_set',
        entity: 'pslCapSetting',
        entityId: 'psl.not_a_setting',
        payload: { days: 100, setBy: NO_PERSON },
      });
    } catch (e) {
      code = e instanceof DataError ? e.code : `THREW_${String(e)}`;
    }
    expect(code).toBe('NOT_FOUND');
    expect(pslCapSettingStore.all()).toEqual([]);
  });

  it('⚠️ `procurement` MUST NOT HOLD IT — the `role:grant` ruling, transferred', async () => {
    // Whoever sets the portal cap can extend every designation they proposed.
    const r = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_cap_set',
      entity: 'pslCapSetting',
      entityId: PSL_DEFAULT_CAP_SETTING_ID,
      payload: { days: 200, setBy: NO_PERSON },
    });
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE LANE GATE — a seat without the atom is refused at the ROLE gate', () => {
  it('procurement cannot decide, and compliance cannot publish', async () => {
    const id = await raise();
    const wrongDecide = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_grant',
      entity: 'psl',
      entityId: id,
      payload: { reason: 'x' },
    });
    expect(wrongDecide.reason).toMatch(/ROLE_NOT_PERMITTED/);

    const listedId = await listed();
    const wrongPublish = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: listedId,
      payload: {},
    });
    expect(wrongPublish.reason).toMatch(/ROLE_NOT_PERMITTED/);

    // ⚠️ KNOWN-GOOD both ways, so the refusals above are about the ATOM and not
    // about the lanes being broken.
    const rightPublish = await commands.dispatch(PROCUREMENT, {
      transitionId: 't_psl_publish',
      entity: 'psl',
      entityId: listedId,
      payload: {},
    });
    expect(rightPublish.status, rightPublish.reason ?? '').not.toBe('failed');
  });

  it('⚠️ A SCOPE WITH NO `businessRoles` IS REFUSED — there is no persona fallback', async () => {
    const id = await raise();
    const r = await commands.dispatch(
      { personaType: 'buyer', supplierId: null, actor: NO_PERSON },
      { transitionId: 't_psl_grant', entity: 'psl', entityId: id, payload: { reason: 'x' } },
    );
    expect(r.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE PROBES — each aimed at a defect this tree really had', () => {
  it('⚠️ THE `Scheduled` PROBE — a renewal must not reopen the START boundary', async () => {
    // ── ⚠️ THE DEFECT THIS FIRES AT IS IN THIS LANE'S OWN HISTORY ─────────
    // `pslProjection.ts` records it: *"the first version read only the END of
    // the validity, so a listing granted today and effective NEXT QUARTER was
    // in force immediately — and a `Sole Source` row dated to start later would
    // have suspended competitive bidding from the day it was typed."* A probe
    // convicted that draft; `Scheduled` is what it bought.
    //
    // A renewal moves `validUntil`. If anything ever moved `validFrom` with it,
    // or if the projection regressed to reading one end, a SCHEDULED listing
    // would become in force the moment somebody renewed it. That is the exact
    // shape the original defect had, arriving through a verb instead of a
    // fixture.
    const future = new Date(Date.parse(P) + 120 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.parse(P) + 300 * 86_400_000).toISOString().slice(0, 10);
    const id = await listed({ validFrom: future, validUntil: end, status: 'Sole Source' });

    // Before: SCHEDULED, and it grants nothing.
    expect(pslDisplayStatus(pslStore.get(id)!, P)).toBe('Scheduled');
    expect(isPslInForce(pslStore.get(id)!, P)).toBe(false);
    expect(pslStatusFor('sup-002', { materialCode: 'RM-PSTN-7150' }, P).kind).not.toBe(
      'NOT_LISTED',
    );

    // Renew it — a legitimate act on a Listed row.
    const later = new Date(Date.parse(P) + 400 * 86_400_000).toISOString().slice(0, 10);
    const r = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: id,
      payload: { validUntil: later, reason: 'extended before it opens' },
    });
    expect(r.status, r.reason ?? '').not.toBe('failed');

    // ⚠️ AFTER: STILL SCHEDULED. The end moved; the start did not.
    const row = pslStore.get(id)!;
    expect(row.validFrom.slice(0, 10)).toBe(future);
    expect(row.validUntil).toBe(later);
    expect(pslDisplayStatus(row, P)).toBe('Scheduled');
    expect(isPslInForce(row, P)).toBe(false);

    // ⚠️ AND THE CONSEQUENCE THE DEFECT WOULD HAVE HAD: the sourcing gate must
    // not exempt an event on a designation that has not opened.
    const exemption = pslExemptionFor(['sup-002'], ['RM-PSTN-7150'], P);
    expect(
      exemption.kind === 'EXEMPT' && exemption.listingId === id,
      'a Scheduled listing exempted an event',
    ).toBe(false);

    // ⚠️ KNOWN-GOOD CONTROL, so "not in force" is not true of everything: read
    // the SAME row from inside its own window and it IS in force.
    const inside = new Date(Date.parse(P) + 200 * 86_400_000).toISOString();
    expect(isPslInForce(row, inside)).toBe(true);
  });

  it('⚠️ THE LEAD CHECK FIRES ON RENEW TOO — extending an exemption is granting one', async () => {
    // Operator ruling (e). Asserted at the DISPATCHER, not only on the surface:
    // a rule enforced by a panel is a rule a second caller routes around.
    const id = await listed({ status: 'Mandatory', validUntil: '2026-10-01' });
    const later = new Date(Date.parse(P) + 60 * 86_400_000).toISOString().slice(0, 10);
    const WIDE: QueryScope = {
      ...COMPLIANCE,
      businessRoles: ['procurement', 'compliance'],
    };
    const refused = await commands.dispatch(WIDE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: id,
      payload: { validUntil: later, reason: 'another term' },
    });
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/PSL_SEAT_HOLDS_BOTH_AUTHORITIES/);

    // ⚠️ KNOWN-GOOD: the narrow deciding seat renews the same row.
    const ok = await commands.dispatch(COMPLIANCE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: id,
      payload: { validUntil: later, reason: 'another term' },
    });
    expect(ok.status, ok.reason ?? '').not.toBe('failed');

    // ⚠️ AND A `Validated` ROW IS RENEWABLE BY THE WIDE SEAT — the check is
    // about restrictive designations, not about renewal.
    const mild = await listed({ status: 'Validated', validUntil: '2026-10-01' });
    const mildOk = await commands.dispatch(WIDE, {
      transitionId: 't_psl_renew',
      entity: 'psl',
      entityId: mild,
      payload: { validUntil: later, reason: 'another term' },
    });
    expect(mildOk.status, mildOk.reason ?? '').not.toBe('failed');
  });

  it('⚠️ THE VALUE-PINNED CORPUS CONTROL — a NAMED MEMBER, reached through a VALUE', () => {
    // ── ⚠️ `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01` ────────────
    // *"An instrument whose population is DATA must pin a NAMED MEMBER or a
    // NAMED VALUE. A row count or an id is not a pin."* The failure mode is
    // exact: a replacement keeps ids and changes values, so an id-only control
    // is precisely the control a replacement walks through — and #319 did that
    // to four corpora with nine instruments green.
    //
    // This batch REPLACED the PSL corpus wholesale (fixture → seed) with every
    // id preserved, which is that shape exactly. So the pin is a VALUE.
    //
    // The specimen copied is `supplierDocumentRefusal.test.ts`:
    //   `expect(refused.map((d) => d.id)).toEqual(['doc-012'])`
    // ⚠️ **P4 GREW THIS SET FROM ONE TO THREE, AND THE PIN IS EXTENDED RATHER
    // THAN RELAXED — it is still an exact set of NAMED MEMBERS.** `psl-011` is
    // the PUBLISHED-then-withdrawn row operator ruling R5(b) requires the
    // supplier view to have a sentence for; `psl-012` restores the LAPSED
    // Directory cell that P4's expiring row took away. Replacing this with a
    // `.length` or a `toContain` is what this spec exists to refuse.
    const withdrawn = pslStore.all().filter((r) => r.lifecycle === 'Withdrawn');
    expect(withdrawn.map((r) => r.id)).toEqual(['psl-006', 'psl-011', 'psl-012']);

    const rejected = pslStore.all().filter((r) => r.lifecycle === 'Rejected');
    expect(rejected.map((r) => r.id)).toEqual(['psl-007']);

    const capped = pslStore.all().filter((r) => r.capDaysOverride !== null);
    expect(capped.map((r) => r.id)).toEqual(['psl-004']);
    expect(pslStore.get('psl-004')!.capDaysOverride).toBe(150);

    const published = pslStore.all().filter((r) => r.publishedAt !== null);
    // P4 published two more, both on sup-007 — the default supplier seat, which
    // held NONE before and would have opened the new supplier view on an empty
    // page. Extended, not relaxed: still an exact set of named members.
    expect(published.map((r) => r.id)).toEqual([
      'psl-001',
      'psl-003',
      'psl-004',
      'psl-010',
      'psl-011',
    ]);

    // ⚠️ **AND THE COUNTER-RULE IS HONOURED: THIS FILE'S CLAIM DEPENDS ON
    // THESE VALUES.** `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01` also
    // says *do not pin values on an instrument that is CORRECTLY insensitive to
    // a shift* — pinning them there reddens an improving tree on every
    // legitimate re-anchor. Nothing pinned above is a DATE; every one is a
    // lifecycle, a cap or a publication state, none of which a re-anchor moves.
  });

  it('⚠️ A COMMENT-ONLY CONTROL — a verb NAMED in prose is not a verb dispatched', () => {
    // ⚠️ **`RESOLVE-NON-LITERAL-IDS-01`'s cousin, and the reason it is here:**
    // this lane's comments name every transition id repeatedly, and a census
    // that grepped for `t_psl_publish` in source would count them. The
    // instrument that matters is the REGISTRY, which only a registered flow
    // can populate.
    const ids = pslFlow.transitions.map((t) => t.id);
    // KNOWN-GOOD: a verb this file dispatches is in the registry.
    expect(ids).toContain('t_psl_publish');
    // KNOWN-BAD: a verb NAMED in a comment in this very file is not.
    expect(ids).not.toContain('t_psl_unpublish');
    expect(getTransition('t_psl_unpublish')).toBeUndefined();
    expect(getTransition('t_psl_publish')).toBeDefined();
  });
});
