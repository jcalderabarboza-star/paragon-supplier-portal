import { describe, it, expect, beforeEach } from 'vitest';

import { MockCommandService } from '../data/mock/MockCommandService';
import { enforcementSettingStore } from '../data/mock/stores/enforcementSettingStore';
import { overrideCompletes, type ActorAttribution } from '../../lib/enforcement';
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';
import { SAMPLE_ACTORS } from './sampleActors';
import type { QueryScope } from '../data/types';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE TWO LOCKS THAT RUN OPPOSITE TO FOUR-EYES (operator ruling R2).
//
// Every OTHER identity check in this tree gets STRICTER when an actor resolves:
// a four-eyes predicate that admitted everything starts refusing. These two run
// the other way. Both refused every input this tree could construct, and both
// did so SOLELY because nothing could name a person — C10 §2.3 cites
// `overrideCompletes` as its own proof that the attribution window is open.
//
// ⚠️ **SO A ROSTER WOULD HAVE OPENED THEM, SILENTLY, AS A SIDE EFFECT OF A DEMO
// CONVENIENCE** — and the append-only enforcement ledger would then record that
// a `sim-usr-*` person accepted a governance risk. That is C10 §6.3's
// manufactured provenance arriving through the front door, on the two lanes
// whose entire value is accountability.
//
// ⚠️ **PROBED BOTH WAYS, AND THE SECOND WAY IS THE ONE THAT MATTERS HERE.** A
// spec that only proved "a sample actor is refused" would pass identically over
// a lock that refuses EVERYBODY — which would be a regression disguised as
// security, and would silently delete the lane the day F1 lands. So every case
// below is paired with a NON-SAMPLE resolved actor that must still be admitted.
// That actor exists in this spec only: nothing in the product can construct one.
// ─────────────────────────────────────────────────────────────────────────────

/** A REAL person — what F1 will produce. Constructible in a spec, nowhere else. */
const REAL_PERSON: ActorAttribution = { kind: 'RESOLVED', person: { personId: 'usr-014' } };
const NOBODY: ActorAttribution = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' };

const svc = new MockCommandService();
const CHECK = 'halal.certificate';

const scopeOf = (actor: ActorAttribution): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor,
});

/** A LOOSENING: `OBSERVE` is below the `BLOCK` baseline of an unset check. */
const loosen = () => ({
  transitionId: 't_enforcement_set',
  entity: 'enforcement',
  entityId: CHECK,
  payload: { mode: 'OBSERVE', reviewBy: '2027-01-31' },
});

/** A TIGHTENING: always legal, and available to anybody. */
const tighten = () => ({
  transitionId: 't_enforcement_set',
  entity: 'enforcement',
  entityId: CHECK,
  payload: { mode: 'BLOCK' },
});

beforeEach(() => enforcementSettingStore.reset());

describe('⚠️ LOCK 1 — a SAMPLE identity may not loosen a governed check', () => {
  it('CONTROL — the seeds really do carry sample actors, or this proves nothing', () => {
    // §42b / `EMPTY-INPUT-REPORTS-CLEAN-01`: if `SAMPLE_ACTORS` were
    // UNATTRIBUTED, every refusal below would fire for the OLD reason and the
    // new lock would be untested while reading green.
    expect(SAMPLE_ACTORS.procurement1.kind).toBe('RESOLVED');
    expect(SAMPLE_ACTORS.compliance1.kind).toBe('RESOLVED');
  });

  it('a sample actor is REFUSED BY NAME, and the ledger stays empty', async () => {
    const res = await svc.dispatch(scopeOf(SAMPLE_ACTORS.compliance1), loosen());
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
    expect(res.reason).toContain('sim-usr-compliance-1');
    expect(enforcementSettingStore.all()).toEqual([]);
  });

  it('⚠️ A REAL RESOLVED ACTOR IS STILL ADMITTED — the half a one-sided probe misses', async () => {
    // Without this, a lock that refused every resolved actor would look correct.
    const res = await svc.dispatch(scopeOf(REAL_PERSON), loosen());
    expect(res.status, res.reason ?? '').toBe('done');
    expect(enforcementSettingStore.all()).toHaveLength(1);
    expect(enforcementSettingStore.all()[0].mode).toBe('OBSERVE');
  });

  it('an UNATTRIBUTED actor is refused for its OWN reason, not the sample one', async () => {
    // The two refusals must stay distinguishable: "nobody could be named" and
    // "somebody was named and they are not real" are different facts, and
    // collapsing them makes the first look answered.
    const res = await svc.dispatch(scopeOf(NOBODY), loosen());
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('requires a NAMED actor');
    expect(res.reason).not.toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
  });

  it('⚠️ AND A SAMPLE ACTOR MAY STILL TIGHTEN — the safest act needs nobody', async () => {
    // The lock is on LOOSENING. A sample seat that could not take the safest act
    // would be a portal that refuses to protect itself, and the tightening path
    // is available to anybody by ruling.
    const res = await svc.dispatch(scopeOf(SAMPLE_ACTORS.procurement1), tighten());
    expect(res.status, res.reason ?? '').toBe('done');
    expect(enforcementSettingStore.all()[0].mode).toBe('BLOCK');
  });
});

describe('⚠️ LOCK 2 — a SAMPLE identity cannot complete an override', () => {
  const override = (by: ActorAttribution) => ({
    overriddenBy: by,
    reason: 'ACCEPTED_TO_QUARANTINE' as const,
    overriddenVerdict: 'ADVERSE' as const,
    overriddenAt: '2026-09-24T00:00:00.000Z',
  });

  it('a sample person does NOT complete it', () => {
    expect(overrideCompletes(override(SAMPLE_ACTORS.procurement1))).toBe(false);
  });

  it('⚠️ A REAL PERSON DOES — or the lane is deleted rather than guarded', () => {
    // The known-GOOD half. `overrideCompletes` returning `false` for everything
    // would satisfy the case above and quietly remove the override lane the day
    // real identity lands.
    expect(overrideCompletes(override(REAL_PERSON))).toBe(true);
  });

  it('an unattributed override still does not complete — unchanged', () => {
    expect(overrideCompletes(override(NOBODY))).toBe(false);
  });
});
