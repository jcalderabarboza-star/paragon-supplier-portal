// ────────────────────────────────────────────────────────────────────────────
// CP-3 · E4 — THE OPENING ACT, proved through the REAL dispatcher and store.
//
// Six things are proved, and they are the six the ruling and the settled fences
// between them require:
//   • TWO ROWS, and `halal.certificate` is deliberately not one of them;
//   • the mode is the RAMP'S CEILING, never the literal `'BLOCK'`;
//   • it goes through the DISPATCHED VERB, so it lands in the DR-10 trail and
//     passes the same policy every later act does;
//   • the actor is `UNATTRIBUTED` and the act is still legal, because an
//     opening act at full rigour is not a loosening;
//   • it NEVER SUPERSEDES a recorded act — running it again records nothing;
//   • ⚠️ AND IT CHANGES NO CONSEQUENCE. Seeded and unseeded derive the same
//     `BLOCK`; only the SOURCE moves, from `NO_SETTING_RECORDED` to `AS_RECORDED`.
//     That is the entire behavioural content of this batch's seed half.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import { seedEnforcementLedger, SEEDED_CHECKS } from './enforcementSeed';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import type { QueryScope } from '../types';
import {
  ENFORCEMENT_MODES,
  GOVERNED_CHECK_IDS,
  MAXIMUM_RIGOUR,
  blocks,
  effectiveEnforcement,
  isAttributed,
} from '../../../lib/enforcement';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const svc = new MockCommandService();
const NAMED = { kind: 'RESOLVED', person: { personId: 'usr-014', displayName: 'Rina Wijaya' } };
const AT = '2026-08-10T08:00:00.000Z';

beforeEach(() => {
  enforcementSettingStore.reset();
  commandAuditSink.clear();
});

describe('E4 seed — ⚠️ TWO ROWS, and the third was a miscount in the ruling', () => {
  it('⚠️ SEEDS `halal.seal` AND `bpom.lot`, AND NOTHING ELSE', async () => {
    const outcomes = await seedEnforcementLedger();
    expect(outcomes.map((o) => [o.checkId, o.status])).toEqual([
      ['halal.seal', 'recorded'],
      ['bpom.lot', 'recorded'],
    ]);
    expect(enforcementSettingStore.all().map((s) => s.checkId)).toEqual([
      'halal.seal',
      'bpom.lot',
    ]);
  });

  it('⚠️ `halal.certificate` IS NOT SEEDED — it runs nowhere, so it has no shipped behaviour', async () => {
    // The ruling listed three rows and the third — "the unanswered-required
    // clause" — is not a check at all; it is the SHARED SHAPE of the two
    // clauses at `qualityValid`. `halal.certificate` is authored at H3
    // (`verifyHalalAtReceipt`) and wired nowhere, so a `BLOCK` row for it would
    // put a decision on the record that nobody took — the exact thing E2
    // refused to do. Its empty entry already says the true thing.
    await seedEnforcementLedger();
    expect(GOVERNED_CHECK_IDS).toContain('halal.certificate');
    expect(SEEDED_CHECKS).not.toContain('halal.certificate');
    expect(enforcementSettingStore.forCheck('halal.certificate')).toEqual([]);
    expect(effectiveEnforcement(enforcementSettingStore.all(), 'halal.certificate', AT)).toEqual({
      mode: 'BLOCK',
      source: 'NO_SETTING_RECORDED',
    });
  });

  it('⚠️ THE SEED LIST IS NOT `GOVERNED_CHECK_IDS` — a new check does not acquire a decision', () => {
    // Deriving the seed from the vocabulary is where the miscount came from.
    // The vocabulary names every check a mode MAY govern; the seed names the
    // ones that HAVE a shipped behaviour to open at. A check authored tomorrow
    // must be placed here consciously rather than inherit a recorded act by
    // joining a union.
    expect(SEEDED_CHECKS.length).toBeLessThan(GOVERNED_CHECK_IDS.length);
    for (const checkId of SEEDED_CHECKS) expect(GOVERNED_CHECK_IDS).toContain(checkId);
  });
});

describe('E4 seed — ⚠️ FULL RIGOUR, TAKEN FROM THE RAMP', () => {
  it('records the CEILING, and the ceiling is derived, not the literal `BLOCK`', async () => {
    // A hard-coded `'BLOCK'` is the fail-open shape here: append a stricter mode
    // to `ENFORCEMENT_MODES` and the seed would silently ship one notch below
    // the ceiling — a relaxation recorded as a deliberate act, on nobody's
    // authority. Asserted against the ramp's last element, not against a string.
    await seedEnforcementLedger();
    const ceiling = ENFORCEMENT_MODES[ENFORCEMENT_MODES.length - 1];
    for (const s of enforcementSettingStore.all()) {
      expect(s.mode).toBe(ceiling);
      expect(s.mode).toBe(MAXIMUM_RIGOUR);
    }
  });

  it('⚠️ AND NO MODE IS WRITTEN AS A LITERAL ANYWHERE IN THE MODULE — measured, not claimed', () => {
    // ⚠️ THIS SPEC EXISTS BECAUSE THE ONE ABOVE IS BLIND, AND THE BLINDNESS WAS
    // MEASURED RATHER THAN REASONED ABOUT. Mutating the seed to a hard-coded
    // `'BLOCK'` left the whole suite green: `MAXIMUM_RIGOUR === 'BLOCK'` today,
    // so a value comparison cannot tell a derived ceiling from a literal that
    // happens to equal it. The property is about the FORM of the code, so it
    // has to be asserted over the code.
    //
    // Comment lines are exempt — the header DISCUSSES the literal it refuses to
    // use, and a census that could not tell code from record would force
    // deleting the explanation along with the defect (the `enforcement.test.ts`
    // precedent).
    const module = (
      import.meta.glob('/src/services/data/mock/enforcementSeed.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['/src/services/data/mock/enforcementSeed.ts'];
    expect(module).toBeDefined();
    const code = module
      .split('\n')
      .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
      .join('\n');
    for (const mode of ENFORCEMENT_MODES) {
      expect(code).not.toContain(`'${mode}'`);
    }
    expect(code).toContain('mode: MAXIMUM_RIGOUR');
  });

  it('keeps `reviewBy` NULL — full rigour is not a relaxation, so nothing renews', async () => {
    await seedEnforcementLedger();
    for (const s of enforcementSettingStore.all()) expect(s.reviewBy).toBeNull();
  });

  it('⚠️ AND THEREFORE NOTHING RATCHETS — `AS_RECORDED` at ten years past, never tightened', async () => {
    await seedEnforcementLedger();
    for (const instant of ['2020-01-01T00:00:00.000Z', AT, '2099-01-01T00:00:00.000Z']) {
      for (const checkId of SEEDED_CHECKS) {
        expect(effectiveEnforcement(enforcementSettingStore.all(), checkId, instant)).toEqual({
          mode: 'BLOCK',
          source: 'AS_RECORDED',
        });
      }
    }
  });
});

describe('E4 seed — ⚠️ A DISPATCHED ACT, NOT A STORE WRITE', () => {
  it('⚠️ EVERY SEEDED ROW EMITS A DR-10 EVENT', async () => {
    // A seed written straight to the store would be the one recorded decision
    // the audit could not see — and it would be the FIRST one.
    await seedEnforcementLedger();
    const events = commandAuditSink.byEvent('t_enforcement_set');
    expect(events).toHaveLength(SEEDED_CHECKS.length);
    expect(events.every((e) => e.outcome === 'done')).toBe(true);
  });

  it('`setAt` is STORE-ASSIGNED — the seed cannot backdate its own audit entry', async () => {
    const before = '2026-08-10T00:00:00.000Z';
    await seedEnforcementLedger();
    for (const s of enforcementSettingStore.all()) {
      expect(s.setAt > before).toBe(true);
    }
  });
});

describe('E4 seed — ⚠️ UNATTRIBUTED, AND THAT IS THE HONEST FORM', () => {
  it('⚠️ THE ACTOR NAMES NO HUMAN, AND SAYS WHY', async () => {
    // "A NAMED RECORDED ACT" means the ACT is named on the record — verb, trail,
    // ledger row. It does not mean a human is named, because nothing in this
    // system can name one (`ENF-NO-PERSON-IN-IDENTITY-01`). Inventing a
    // `personId` to seed with would be manufactured provenance one layer down.
    await seedEnforcementLedger();
    for (const s of enforcementSettingStore.all()) {
      expect(isAttributed(s.setBy)).toBe(false);
      expect(s.setBy).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
    }
  });

  it('⚠️ AND IT IS LEGAL BECAUSE IT IS NOT A LOOSENING — the safest act needs nobody', async () => {
    // The baseline for an unset check is `MAXIMUM_RIGOUR`, so an opening act AT
    // the ceiling is a no-op in the strict direction and the direction rule lets
    // it through unattributed. The alternative to running it is not "no row";
    // it is a forged one.
    const outcomes = await seedEnforcementLedger();
    expect(outcomes.every((o) => o.status === 'recorded')).toBe(true);
  });
});

describe('E4 seed — ⚠️ IT OPENS A LEDGER, IT DOES NOT CLOSE ONE', () => {
  it('⚠️ RUNNING IT TWICE RECORDS NOTHING THE SECOND TIME', async () => {
    await seedEnforcementLedger();
    const second = await seedEnforcementLedger();
    expect(second.every((o) => o.status === 'already-recorded')).toBe(true);
    expect(enforcementSettingStore.all()).toHaveLength(SEEDED_CHECKS.length);
  });

  it('⚠️ AND IT NEVER SUPERSEDES A REAL ACT — a recorded relaxation survives a re-seed', async () => {
    // The append-only ledger means the seed could not overwrite; it could do
    // something worse — append a LATER row that supersedes an operator's own
    // decision with a boot-time default. It does not.
    await svc.dispatch(buyer, {
      transitionId: 't_enforcement_set',
      entity: 'enforcement',
      entityId: 'bpom.lot',
      payload: { mode: 'OBSERVE', reviewBy: '2099-12-31', setBy: NAMED },
    });
    const outcomes = await seedEnforcementLedger();
    expect(outcomes).toEqual([
      { checkId: 'halal.seal', status: 'recorded' },
      { checkId: 'bpom.lot', status: 'already-recorded' },
    ]);
    expect(effectiveEnforcement(enforcementSettingStore.all(), 'bpom.lot', AT)).toEqual({
      mode: 'OBSERVE',
      source: 'AS_RECORDED',
    });
  });
});

describe('E4 seed — ⚠️ THE CONSEQUENCE IS UNCHANGED. ONLY THE PROVENANCE MOVES.', () => {
  it('⚠️ THE DELTA — seeded and unseeded BLOCK identically', async () => {
    // The whole behavioural claim of the seed, in one comparison. Before: no
    // row, `BLOCK / NO_SETTING_RECORDED`. After: a row, `BLOCK / AS_RECORDED`. The
    // mode is the same, so `blocks()` is the same, so every gate that reads it
    // does the same thing. What changed is that the record now says a decision
    // was taken, because one was.
    const before = SEEDED_CHECKS.map((checkId) =>
      effectiveEnforcement(enforcementSettingStore.all(), checkId, AT),
    );
    await seedEnforcementLedger();
    const after = SEEDED_CHECKS.map((checkId) =>
      effectiveEnforcement(enforcementSettingStore.all(), checkId, AT),
    );

    expect(before.map((e) => e.mode)).toEqual(after.map((e) => e.mode));
    expect(before.map((e) => blocks(e.mode))).toEqual(after.map((e) => blocks(e.mode)));
    expect(before.map((e) => e.source)).toEqual(['NO_SETTING_RECORDED', 'NO_SETTING_RECORDED']);
    expect(after.map((e) => e.source)).toEqual(['AS_RECORDED', 'AS_RECORDED']);
  });
});
