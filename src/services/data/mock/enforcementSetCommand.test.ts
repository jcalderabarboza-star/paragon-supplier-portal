// ────────────────────────────────────────────────────────────────────────────
// t_enforcement_set — a buyer records how hard a governed check bites
// (CP-3 · E2), through the REAL dispatcher and the REAL store.
//
// Five things are proved here, and they are the five the ruling asked for:
//   • it is a DISPATCHED verb, so every recorded relaxation lands in the DR-10
//     trail — and the trail's `actor` is the PERSONA, which is exactly why the
//     setting carries its own attribution;
//   • it APPENDS — superseding a mode keeps the prior decision, because there is
//     no update path to take it away (D2);
//   • TIGHTENING IS ALWAYS LEGAL, INCLUDING UNATTRIBUTED — the safest act is
//     available to anybody;
//   • LOOSENING REQUIRES `reviewBy` AND A NAMED ACTOR, and today the portal can
//     name nobody, so the relaxation lane is built and refuses;
//   • NOTHING IS SEEDED, and the un-governed state is the SAFE state.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService, commandAuditSink } from './MockCommandService';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import { DataError } from '../types';
import type { QueryScope } from '../types';
import {
  GOVERNED_CHECK_IDS,
  effectiveEnforcement,
  settingHistory,
  settingInForce,
} from '../../../lib/enforcement';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';


// ⚠️ **THE ATTRIBUTION MOVED FROM THE PAYLOAD TO THE SCOPE (C10 §6.2 / §8.3).**
// These specs used to pass `setBy` as a payload field, which is the seam §6.2
// names ATTRIBUTION BY ASSERTION — *"the caller states who acted, and the
// platform records the statement"*. The dispatcher now refuses that key
// (`ACTOR_IN_PAYLOAD`), so the actor rides the SCOPE, which is where a session
// actor comes from. **NO ASSERTION BELOW WAS WEAKENED** — every one still
// requires the same recorded value; only the door it arrives through moved.
const actingAs = <S extends object>(scope: S, actor: unknown): S =>
  ({ ...scope, actor }) as S;
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplier: QueryScope = { personaType: 'supplier', supplierId: 'sup-005', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

const svc = new MockCommandService();
const CHECK = 'halal.certificate';

// ⚠️ **A NON-SAMPLE NAMED PERSON, AND `displayName` IS GONE (C10 §8.2 /
// D-ID-7).** A stamp carries the `personId` alone; the label is resolved at read
// from the person registry. `usr-014` is deliberately NOT a `sim-usr-*` id — it
// is the control that proves the accountability lanes still ADMIT a real
// resolved actor, which is the direction a sample-only probe cannot see.
const NAMED = { kind: 'RESOLVED', person: { personId: 'usr-014' } };
/** What E3 WOULD be able to produce, and it is an explicit absence. */
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' };

const NOW = () => new Date().toISOString();

const set = (payload: Record<string, unknown>, entityId: string = CHECK) => ({
  transitionId: 't_enforcement_set',
  entity: 'enforcement',
  entityId,
  payload,
});

beforeEach(() => {
  enforcementSettingStore.reset();
  commandAuditSink.clear();
});

describe('t_enforcement_set — NOTHING IS SEEDED, and that is the safe state', () => {
  it('⚠️ the ledger ships EMPTY — D-ENF-4 is unruled, so nothing relaxes', () => {
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  it('⚠️ and every governed check therefore derives MAXIMUM RIGOUR, honestly sourced', () => {
    // Absence of a decision is not absence of enforcement. Nor is it dressed as
    // one: `NO_SETTING_RECORDED` says nobody has ruled, which is a different
    // sentence from "somebody chose full rigour".
    for (const checkId of GOVERNED_CHECK_IDS) {
      expect(effectiveEnforcement(enforcementSettingStore.all(), checkId, NOW())).toEqual({
        mode: 'BLOCK',
        source: 'NO_SETTING_RECORDED',
      });
    }
  });

  it('the store has NO update path, and there is never going to be one (D2)', () => {
    // Superseding on an append-only ledger means appending. A mutable current-
    // setting record would make the ratchet unauditable: it tightens against a
    // `reviewBy`, and an overwrite takes that date away.
    expect(Object.keys(enforcementSettingStore).sort()).toEqual([
      'all',
      'append',
      'forCheck',
      'reset',
    ]);
  });
});

describe('t_enforcement_set — the recorded act', () => {
  it('THE LOCK — a buyer records a mode and it lands on the ledger', async () => {
    const res = await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'OBSERVE', reviewBy: '2027-01-31'}),
    );
    expect(res.status).toBe('done');

    const ledger = enforcementSettingStore.all();
    expect(ledger).toHaveLength(1);
    expect(ledger[0].checkId).toBe(CHECK);
    expect(ledger[0].mode).toBe('OBSERVE');
    expect(ledger[0].reviewBy).toBe('2027-01-31');
    expect(ledger[0].setBy).toEqual(NAMED);
  });

  it('the checkId comes from the ENTITY, so the two can never disagree', async () => {
    // There is no `checkId` payload field. A verb that took one could be
    // dispatched against `halal.seal` while recording a setting for `bpom.lot`.
    await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'OBSERVE', reviewBy: '2027-01-31', checkId: 'bpom.lot' }),
    );
    expect(enforcementSettingStore.all()[0].checkId).toBe(CHECK);
    expect(enforcementSettingStore.forCheck('bpom.lot')).toEqual([]);
  });

  it('stamps setAt ITSELF — a caller cannot backdate its own audit entry', async () => {
    // The `pinnedAt` discipline, and it is load-bearing here: `setAt` is the
    // ledger's ORDERING key, so a forgeable one would let a caller insert itself
    // ahead of a decision it did not know about.
    const before = NOW();
    await svc.dispatch(actingAs(buyer, NAMED),
      set({
        mode: 'BLOCK',
        setAt: '1999-01-01T00:00:00.000Z' }),
    );
    const [row] = enforcementSettingStore.all();
    expect(row.setAt).not.toBe('1999-01-01T00:00:00.000Z');
    expect(row.setAt >= before).toBe(true);
  });

  it('a BLOCK keeps a null reviewBy rather than inventing one', async () => {
    // Full rigour is not a relaxation, so there is nothing to renew. Absence
    // stays absence.
    await svc.dispatch(actingAs(buyer, NOBODY), set({ mode: 'BLOCK'}));
    expect(enforcementSettingStore.all()[0].reviewBy).toBeNull();
  });

  it('is a BUYER verb — a supplier cannot decide how hard its own check bites', async () => {
    // ⚠️ **REFUSED AT SCOPE NOW, AND THE OLD COMMENT NAMED THE DEFECT WHILE
    // DESCRIBING IT AS THE DESIGN.** An enforcement setting has no supplier owner
    // (`readScopeOwner` is null) — and the dispatcher used to read that as
    // *nothing to deny*, so a supplier reached the role gate on a GOVERNED check
    // and was denied at scope on an unrecognised one. The refusal kind answered
    // "is this check id in the vocabulary?" to a caller entitled to neither
    // answer. Scope denies both identically now.
    await expect(
      svc.dispatch(actingAs(supplier, NAMED), set({ mode: 'BLOCK'})),
    ).rejects.toThrow(/denied for scope/);
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  it('an UNKNOWN CHECK is NOT_FOUND — it is not silently created', async () => {
    // `readState` answers null for anything outside `GOVERNED_CHECK_IDS`, so a
    // setting cannot be hung on a check the vocabulary does not name.
    await expect(
      svc.dispatch(actingAs(buyer, NAMED), set({ mode: 'BLOCK'}, 'halal.vibes')),
    ).rejects.toBeInstanceOf(DataError);
    expect(enforcementSettingStore.all()).toEqual([]);
  });
});

describe('t_enforcement_set — the D2 freeze is APPEND-ONLY', () => {
  const record = (mode: string, reviewBy: string | null = '2027-01-31') =>
    svc.dispatch(actingAs(buyer, NAMED), set({ mode, reviewBy}));

  it('THE FREEZE — superseding a mode KEEPS the prior decision', async () => {
    await record('OBSERVE');
    await record('BLOCK_OVERRIDABLE');

    const history = settingHistory(enforcementSettingStore.all(), CHECK);
    // TWO entries, not one replaced. The decision an earlier receipt was judged
    // under is still readable — which is the whole of D2.
    expect(history).toHaveLength(2);
    expect(history.map((s) => s.mode)).toEqual(['OBSERVE', 'BLOCK_OVERRIDABLE']);
  });

  it('and the mode IN FORCE is the last one — derived, never stored', async () => {
    await record('OBSERVE');
    await record('BLOCK_OVERRIDABLE');
    expect(settingInForce(enforcementSettingStore.all(), CHECK)?.mode).toBe('BLOCK_OVERRIDABLE');
    // "Which mode is current" cannot drift from the acts that justify it,
    // because there is no stored `current` to drift.
    expect(enforcementSettingStore.all().some((s) => 'current' in s)).toBe(false);
  });

  it('keeps each check`s ledger to itself — the key is checkId (D1)', async () => {
    await record('OBSERVE');
    await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'BLOCK', reviewBy: null}, 'bpom.lot'),
    );
    expect(enforcementSettingStore.forCheck(CHECK)).toHaveLength(1);
    expect(enforcementSettingStore.forCheck('bpom.lot')).toHaveLength(1);
    expect(enforcementSettingStore.forCheck('halal.seal')).toHaveLength(0);
  });
});

describe('t_enforcement_set — ⚠️ TIGHTENING IS ALWAYS LEGAL', () => {
  it('⚠️ THE SAFEST ACT NEEDS NOBODY — full rigour, unattributed, no review date', async () => {
    // Read the asymmetry the right way round. This is not "loosening needs
    // paperwork"; it is that setting a check to BLOCK is available to anyone,
    // with no resolved identity and no argument. Failing in the strict direction
    // costs a blocked dock; failing the other way costs an anonymous unlock.
    const res = await svc.dispatch(actingAs(buyer, NOBODY), set({ mode: 'BLOCK'}));
    expect(res.status).toBe('done');
    expect(enforcementSettingStore.all()[0].mode).toBe('BLOCK');
  });

  it('a tightening WITHIN the relaxed range is legal unattributed — but still needs a review date', async () => {
    await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'OBSERVE', reviewBy: '2027-01-31'}),
    );
    // OBSERVE → BLOCK_OVERRIDABLE is a tightening, so no named actor is needed…
    const res = await svc.dispatch(actingAs(buyer, NOBODY),
      set({ mode: 'BLOCK_OVERRIDABLE', reviewBy: '2027-06-30'}),
    );
    expect(res.status).toBe('done');
    // …but it is still BELOW full rigour, so `reviewBy` is required. "Always
    // legal" is about the DIRECTION, never about well-formedness: the type makes
    // a relaxation without a review date unrepresentable, and this is the
    // runtime half of that, because the payload crosses a seam.
    const refused = await svc.dispatch(actingAs(buyer, NOBODY),
      set({ mode: 'BLOCK_OVERRIDABLE'}),
    );
    expect(refused.status).toBe('failed');
    expect(refused.reason).toContain('requires reviewBy');
  });
});

describe('t_enforcement_set — ⚠️ LOOSENING REQUIRES reviewBy AND A NAMED ACTOR', () => {
  it('⚠️ THE FIRST EVER RELAXATION IS A LOOSENING — the baseline is full rigour', async () => {
    // An un-governed check baselines at MAXIMUM_RIGOUR, so the first setting
    // below it is a relaxation and must be named. Otherwise the very first act
    // on every check would slip through unattributed.
    const res = await svc.dispatch(actingAs(buyer, NOBODY),
      set({ mode: 'OBSERVE', reviewBy: '2027-01-31'}),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('requires a NAMED actor');
    expect(res.reason).toContain('NO_PERSON_IN_SESSION');
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  it('and the SAME act with a named person is recorded', async () => {
    const res = await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'OBSERVE', reviewBy: '2027-01-31'}),
    );
    expect(res.status).toBe('done');
  });

  it('⚠️ THE BASELINE IS THE LAST RECORDED MODE, NOT THE RATCHETED ONE', () => {
    // A lapse is a CONSEQUENCE, not a decision. If the direction were judged
    // against the effective (ratcheted) mode, the calendar would silently
    // re-classify an unchanged decision as a relaxation — and legality would
    // depend on WHEN the command was dispatched, which is a clock deciding a
    // transition by another route.
    //
    // Asserted structurally: the policy reads `settingInForce`, which takes no
    // instant, and `effectiveEnforcement` (which does) is not in the hook.
    const policies = Object.entries(
      import.meta.glob('/src/services/transitions/policies.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0][1];
    const hook = policies.slice(policies.indexOf('const enforcementSetGoverned'));
    expect(hook).toContain('settingInForce(');
    expect(hook).not.toContain('effectiveEnforcement(');
  });

  it('refuses an unrecognised MODE by name — an authoring typo is told, not maximised', () => {
    // Note the direction. Reading RANKS an unknown mode at the ceiling (the
    // class rule); WRITING refuses it. A stored typo must not relax anything,
    // and an authoring typo must not become a block nobody asked for.
    return svc
      .dispatch(actingAs(buyer, NAMED), set({ mode: 'OFF', reviewBy: '2027-01-31' }))
      .then((res) => {
        expect(res.status).toBe('failed');
        expect(res.reason).toContain("'OFF'");
        expect(res.reason).toContain('OBSERVE, BLOCK_OVERRIDABLE, BLOCK');
        expect(enforcementSettingStore.all()).toEqual([]);
      });
  });

  it.each([
    ['2026-02-30', 'a day February does not have — Date.parse rolls it over'],
    ['last Tuesday', 'not a date'],
    ['2027-01-31T00:00:00.000Z', 'an instant, not a day'],
  ])('refuses a relaxation whose reviewBy is %o (%s)', async (reviewBy) => {
    const res = await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'OBSERVE', reviewBy}),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('reviewBy');
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  it.each<[unknown, string]>([
    [{ personId: 'usr-014', displayName: 'Rina' }, 'a person with no discriminant'],
    ['Rina Wijaya', 'a bare typed name — forgeable, and worse than nothing'],
    [{ kind: 'UNATTRIBUTED', reason: 'BECAUSE' }, 'an off-list absence'],
    [{ kind: 'SYSTEM' }, 'the comfortable third arm'],
  ])('refuses a malformed actor %o (%s) — never coerces it to UNATTRIBUTED', async (actor) => {
    // ⚠️ **THE DOOR MOVED; THE PROPERTY DID NOT.** These cases used to arrive as
    // a `setBy` PAYLOAD field. C10 §6.2's seam flip took that door away — the
    // dispatcher refuses the key outright — so a malformed actor now reaches the
    // policy the only way an actor can: through the SESSION. What is still
    // asserted is exactly what was asserted before, and it is the load-bearing
    // half: **a malformed actor is REFUSED, never coerced into `UNATTRIBUTED`**.
    // Coercing would give every typo a legitimate-looking absence to hide in.
    const res = await svc.dispatch(actingAs(buyer, actor), set({ mode: 'BLOCK' }));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('the commanding scope carries no actor');
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  // ⚠️ **PROBE THE GUARD BOTH WAYS (rule 4), AND THIS CASE CHANGED SIDES.**
  // `{ kind: 'RESOLVED', person: { personId } }` sat in the MALFORMED list above
  // labelled *"a person with no name"* — it was refused because `displayName`
  // was required. C10 §8.2 / D-ID-7 deleted that field, so the very same value
  // is now the CANONICAL shape of a resolved actor. It moved from the rejected
  // list to this accepted one rather than being quietly dropped, because a
  // guard that is wrong about what it should ACCEPT ships looking like a
  // working guard, and a one-sided probe would never have said so.
  it('⚠️ ACCEPTS a resolved actor carrying ONLY a personId — the canonical shape', async () => {
    const res = await svc.dispatch(
      actingAs(buyer, { kind: 'RESOLVED', person: { personId: 'usr-014' } }),
      set({ mode: 'BLOCK' }),
    );
    expect(res.status).toBe('done');
    expect(enforcementSettingStore.all()[0].setBy).toEqual({
      kind: 'RESOLVED',
      person: { personId: 'usr-014' },
    });
  });

  // ⚠️ **AND THE OTHER HALF OF THE SEAM FLIP, WHICH IS A STRENGTHENING RATHER
  // THAN A MIGRATION** (C10 §6.2 second half, R-PAYLOAD). A caller may no longer
  // state who acted AT ALL. Refused BY KEY, not by value-shape: a well-formed
  // actor and a malformed one are refused identically, because refusing only the
  // well-formed one would let the other through to be dropped silently — the
  // same silent correction wearing a type error.
  it.each<[unknown, string]>([
    [NAMED, 'a WELL-FORMED resolved actor'],
    [NOBODY, 'a well-formed UNATTRIBUTED one'],
    ['Rina Wijaya', 'a bare typed name'],
    [undefined, 'the key present and undefined'],
  ])('⚠️ REFUSES setBy IN THE PAYLOAD (%o — %s) — an actor never arrives that way', async (setBy) => {
    const res = await svc.dispatch(
      actingAs(buyer, NAMED),
      set({ mode: 'BLOCK', setBy }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('ACTOR_IN_PAYLOAD');
    expect(res.reason).toContain('setBy');
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  // ⚠️ **`setBy` LEFT THIS LIST AND THE CASE WAS RETIRED, NOT WEAKENED.** It
  // read `it.each(['mode', 'setBy'])`. `setBy` is no longer a `requiredField` —
  // it is no longer a payload field at all (C10 §6.2 / §8.3) — so asserting
  // that its ABSENCE is refused would assert the opposite of the ruling. The
  // replacement is the case directly above, which refuses its PRESENCE, and
  // that is a strictly stronger claim than the one retired here.
  it.each(['mode'])('requires %s — the field gate, before the policy', async (field) => {
    const payload: Record<string, unknown> = { mode: 'BLOCK' };
    delete payload[field];
    const res = await svc.dispatch(actingAs(buyer, NAMED), set(payload));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('MISSING_FIELDS');
    expect(res.reason).toContain(field);
  });
});

describe('t_enforcement_set — ⚠️ EVERY CHANGE EMITS A DR-10 EVENT', () => {
  it('a recorded setting lands in the audit sink', async () => {
    const res = await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'BLOCK'}),
    );
    const events = commandAuditSink.byEvent('t_enforcement_set');
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe('done');
    expect(events[0].correlationId).toBe(res.correlationId);
  });

  it('⚠️ A REFUSED SETTING IS AUDITED TOO — the attempt is on the record', async () => {
    // "Somebody tried to relax the halal certificate check and could not be
    // named" is exactly the kind of thing an audit should be able to see. The
    // ledger stays untouched; the trail does not.
    await svc.dispatch(actingAs(buyer, NOBODY), set({ mode: 'OBSERVE', reviewBy: '2027-01-31'}));
    const events = commandAuditSink.byEvent('t_enforcement_set');
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe('failed');
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  it('⚠️ THE EVENT ACTOR IS THE PERSONA, WHICH IS WHY setBy EXISTS AT ALL', async () => {
    // `actorKey` answers `buyer:all` — a persona and a tenant, no human. The
    // DR-10 trail therefore CANNOT substitute for attribution, and an override
    // that leaned on it would be recording "a buyer did this" as though it were
    // "this person accepted this risk". `ENF-NO-PERSON-IN-IDENTITY-01`, visible
    // in the one place it would otherwise hide.
    await svc.dispatch(actingAs(buyer, NAMED), set({ mode: 'BLOCK'}));
    const [event] = commandAuditSink.byEvent('t_enforcement_set');
    expect(event.actor).toBe('buyer:all');
    expect(event.actor).not.toContain('usr-014');
    expect(enforcementSettingStore.all()[0].setBy).toEqual(NAMED);
  });
});


describe('⚠️ H4 — THE CEILING IS IDENTITY, AND IT IS NOT ONLY `BLOCK_OVERRIDABLE`', () => {
  // ── THE FINDING THIS BATCH MEASURED, PINNED SO IT CANNOT BE RE-DISCOVERED ──
  //
  // The operator ruled `halal.certificate = BLOCK_OVERRIDABLE`, then — on the
  // finding that an override cannot COMPLETE without a named person and would
  // therefore degrade to `BLOCK` — re-ruled it to `OBSERVE`, "one line, and it
  // reaches the clerk today".
  //
  // ⚠️ **MEASURED: `OBSERVE` IS REFUSED BY THE SAME CLAUSE, WITH THE SAME
  // MESSAGE, FOR THE SAME REASON.** The direction rule baselines an unset check
  // at `MAXIMUM_RIGOUR`, so EVERY mode below `BLOCK` is a loosening, and a
  // loosening needs an actor the portal cannot produce
  // (`ENF-NO-PERSON-IN-IDENTITY-01`). The ceiling is not a property of the
  // override lane; it is a property of the LEDGER, and it applies to the whole
  // ramp at once.
  //
  // Filed at full weight as `HALAL-ENFORCEMENT-CEILING-IS-IDENTITY-01`
  // (`docs/findings.md` §63). NOTHING BELOW IS A COMPLAINT ABOUT THE RULE — the
  // rule is correct and the operator wrote it. What is recorded is that the
  // October mandate arrives before the identity spine does on current
  // sequencing, and that is an operator decision, not a code change.

  it('⚠️ PROBED BOTH WAYS — the TIGHTENING is accepted, so the refusal is about the DIRECTION', async () => {
    // THE KNOWN-GOOD HALF FIRST. Without it, "the dispatch failed" is not
    // evidence that the direction rule fired — it is equally consistent with a
    // broken harness, an unregistered flow, or a role gate. §39's reflex.
    const ok = await svc.dispatch(actingAs(buyer, NOBODY), set({ mode: 'BLOCK'}));
    expect(ok.status).toBe('done');
    expect(enforcementSettingStore.forCheck(CHECK)).toHaveLength(1);
  });

  it('⚠️ `OBSERVE` — THE OPERATOR\'S H4 RULING — CANNOT BE RECORDED TODAY', async () => {
    const res = await svc.dispatch(actingAs(buyer, NOBODY),
      set({ mode: 'OBSERVE', reviewBy: '2027-06-30'}),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('requires a NAMED actor');
    expect(res.reason).toContain('NO_PERSON_IN_SESSION');
    // AND THE LEDGER IS UNTOUCHED — the un-governed state is the safe state, so
    // a refused relaxation costs provenance and never enforcement.
    expect(enforcementSettingStore.forCheck(CHECK)).toHaveLength(0);
  });

  it('⚠️ AND SO DOES `BLOCK_OVERRIDABLE` — the same clause, the same sentence', async () => {
    // The two modes the operator considered are refused IDENTICALLY. That is
    // the whole finding: choosing between them was never the decision that
    // mattered, because neither is reachable.
    const observe = await svc.dispatch(actingAs(buyer, NOBODY),
      set({ mode: 'OBSERVE', reviewBy: '2027-06-30'}),
    );
    const overridable = await svc.dispatch(actingAs(buyer, NOBODY),
      set({ mode: 'BLOCK_OVERRIDABLE', reviewBy: '2027-06-30'}),
    );
    expect(observe.status).toBe('failed');
    expect(overridable.status).toBe('failed');
    // Same shape, differing only in the mode each names.
    expect(observe.reason!.replace('OBSERVE', 'X')).toBe(
      overridable.reason!.replace('BLOCK_OVERRIDABLE', 'X'),
    );
  });

  it('⚠️ A NAMED ACTOR RECORDS IT INSTANTLY — the gap is identity, nothing else', async () => {
    // The proof that the refusal is not about the mode, the check, the payload
    // or the verb. Hand it a person and the operator's ruling lands. This is
    // what "the ceiling is identity" means, stated as an experiment rather than
    // as an opinion.
    const res = await svc.dispatch(actingAs(buyer, NAMED),
      set({ mode: 'OBSERVE', reviewBy: '2027-06-30'}),
    );
    expect(res.status).toBe('done');
    expect(enforcementSettingStore.forCheck(CHECK)[0].mode).toBe('OBSERVE');
  });

  it('⚠️ AND THE LEDGER CANNOT CARRY THE RULING\'S REASON — reported, not written', async () => {
    // The operator asked for the seed to be recorded "AS A DECISION WITH ITS
    // AUTHOR AND ITS REASON", and to be told before one was written if the
    // ledger could not hold it. IT CANNOT: an `EnforcementSetting` is
    // `{ checkId, setBy, setAt, mode, reviewBy }` and `applyTransition`
    // constructs it field by field, so a rationale in the payload is DROPPED
    // rather than stored. Asserted here so the absence is a fact in the suite
    // and not a claim in a report.
    const res = await svc.dispatch(actingAs(buyer, NAMED),
      set({
        mode: 'OBSERVE',
        reviewBy: '2027-06-30',
        // A rationale, offered the only way a caller could offer one.
        rationale: 'the clerk must be told so the renewal can be chased' }),
    );
    expect(res.status).toBe('done');
    const row = enforcementSettingStore.forCheck(CHECK)[0] as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual([
      'checkId',
      'mode',
      'reviewBy',
      'setAt',
      'setBy',
    ]);
    expect(row.rationale).toBeUndefined();
  });
});
