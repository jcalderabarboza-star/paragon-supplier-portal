import { describe, it, expect } from 'vitest';

import {
  SAMPLE_PEOPLE,
  SAMPLE_PERSON_PREFIX,
  isSampleActor,
  resolveSamplePerson,
  samplePeopleFor,
  type SamplePerson,
} from './sampleRoster';
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  type SystemRoleId,
} from '../transitions/businessRoles';
import { ROLE_LABEL_KEY } from '../transitions/handoff';
import { rolesEn } from '../../lib/i18n/roles';

// ─────────────────────────────────────────────────────────────────────────────
// THE SAMPLE ROSTER — its properties, derived rather than restated.
//
// ⚠️ **THE NAME GUARD IS A DERIVED PROPERTY, NOT A WORD LIST** (operator ruling).
// A blocklist of personal names fails on every name not in it, which is every
// name that matters. What is checkable is the opposite shape: a roster label
// must be CONSTRUCTIBLE FROM THE ROLE VOCABULARY THIS PLATFORM ALREADY HAS —
// `ROLE_LABEL_KEY` × an ordinal. "Budi" is rejected because it is not a role
// label, by derivation; and so is "Compliance Reviewer", because that is a
// second vocabulary nobody registered.
// ─────────────────────────────────────────────────────────────────────────────

/** The label a reader sees, built the only way `personLabel` builds it. */
const labelOf = (p: SamplePerson): string => `${rolesEn[ROLE_LABEL_KEY[p.role]]} ${p.ordinal}`;

describe('POPULATION GUARD — the roster is real', () => {
  it('holds people on both sides, and resolves each of them', () => {
    // Membership, never a bare count (§42b).
    expect(SAMPLE_PEOPLE.length).toBeGreaterThan(5);
    expect(samplePeopleFor('buyer').length).toBeGreaterThan(3);
    expect(samplePeopleFor('supplier').length).toBeGreaterThan(0);
    expect(resolveSamplePerson('sim-usr-procurement-1')).toBeDefined();
    // Known-FALSE control: an id shaped like a roster id but not on it.
    expect(resolveSamplePerson('sim-usr-not-a-person')).toBeUndefined();
  });

  it('every personId is unique', () => {
    const ids = SAMPLE_PEOPLE.map((p) => p.personId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('`samplePeopleFor` partitions the roster — no row is on both sides or neither', () => {
    const buyer = samplePeopleFor('buyer');
    const supplier = samplePeopleFor('supplier');
    expect(buyer.length + supplier.length).toBe(SAMPLE_PEOPLE.length);
    expect(buyer.every((p) => p.personaType === 'buyer')).toBe(true);
    expect(supplier.every((p) => p.personaType === 'supplier')).toBe(true);
  });
});

describe('⚠️ THE NAME GUARD — no personal name can be on this roster', () => {
  it('every label is ROLE VOCABULARY × ORDINAL, derived from ROLE_LABEL_KEY', () => {
    const permitted = new Set(
      (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).map((r) => rolesEn[ROLE_LABEL_KEY[r]]),
    );
    expect(permitted.size, 'the role vocabulary must be non-empty').toBeGreaterThan(5);
    for (const p of SAMPLE_PEOPLE) {
      const label = labelOf(p);
      const m = /^(.+) (\d+)$/.exec(label);
      expect(m, `${p.personId}: "${label}" is not <role> <ordinal>`).not.toBeNull();
      expect(permitted.has(m![1]), `${p.personId}: "${m![1]}" is not a registered role name`).toBe(
        true,
      );
      expect(Number(m![2])).toBeGreaterThan(0);
    }
  });

  it('⚠️ REJECTED CONTROLS — a personal name, and an unregistered role name', () => {
    // ⚠️ **PROBE THE GUARD BOTH WAYS (rule 4).** Without these the assertion
    // above would pass over a permitted-set that happened to contain everything,
    // and a guard that is wrong about what it should REJECT ships looking like a
    // working guard.
    const permitted = new Set(
      (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).map((r) => rolesEn[ROLE_LABEL_KEY[r]]),
    );
    const shaped = (label: string) => {
      const m = /^(.+) (\d+)$/.exec(label);
      return m !== null && permitted.has(m[1]);
    };
    // A personal name.
    expect(shaped('Budi 1')).toBe(false);
    // A name with no ordinal — indistinguishable from the role itself.
    expect(shaped('Compliance')).toBe(false);
    // ⚠️ A SECOND VOCABULARY. "Compliance Reviewer" reads like a role and is
    // not one: `ROLE_LABEL_KEY.compliance` is "Compliance". Inventing a prettier
    // name here is exactly `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`.
    expect(shaped('Compliance Reviewer 1')).toBe(false);
    // And the known-GOOD half, so the predicate is not simply `false`.
    expect(shaped('Compliance 1')).toBe(true);
  });

  it('every id is <prefix><role-ish>-<ordinal>, and carries the namespace', () => {
    for (const p of SAMPLE_PEOPLE) {
      expect(p.personId.startsWith(SAMPLE_PERSON_PREFIX), p.personId).toBe(true);
      expect(p.personId, p.personId).toMatch(/^sim-usr-[a-z_]+(-[a-z_]+)*-\d+$/);
      expect(isSampleActor(p.personId)).toBe(true);
    }
  });
});

describe('⚠️ THE ROSTER NAMES ROLES — it does not mint them', () => {
  it('every role a row holds is a real SystemRoleId this persona may hold', () => {
    for (const p of SAMPLE_PEOPLE) {
      const allowed = PERSONA_SYSTEM_ROLES[p.personaType] as readonly string[];
      expect(p.roles.length, p.personId).toBeGreaterThan(0);
      for (const r of p.roles) {
        expect(SYSTEM_ROLES[r], `${p.personId}: ${r} is not a system role`).toBeDefined();
        expect(allowed.includes(r), `${p.personId}: ${r} is cross-persona`).toBe(true);
      }
      // The NAMING role must also be one this side can hold, or the label claims
      // an authority the seat could never be granted.
      expect(allowed.includes(p.role), `${p.personId}: named for a role it cannot hold`).toBe(true);
    }
  });

  it('a buyer row is NAMED FOR A ROLE IT HOLDS — the label cannot overstate', () => {
    for (const p of samplePeopleFor('buyer')) {
      expect(p.roles.includes(p.role), `${p.personId}: named "${p.role}" but does not hold it`).toBe(
        true,
      );
    }
  });

  it('a supplier row carries its tenant; a buyer row carries none', () => {
    for (const p of samplePeopleFor('supplier')) expect(p.supplierId).toBeTruthy();
    // A buyer seat reads the cross-supplier superset BY CONSTRUCTION, so a
    // tenant on one would narrow it — the opposite of the scoping contract.
    for (const p of samplePeopleFor('buyer')) expect(p.supplierId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE PROPERTY THE ROSTER WAS SIZED FOR — and it is DERIVED from the atom
// bundles, so moving an atom between lanes cannot silently strand a check.
// ─────────────────────────────────────────────────────────────────────────────

/** Which sample people hold this atom, through any role they hold? */
const holdersOf = (atom: string): readonly SamplePerson[] =>
  SAMPLE_PEOPLE.filter((p) => p.roles.some((r) => (SYSTEM_ROLES[r] as readonly string[]).includes(atom)));

describe('⚠️ BOTH DIRECTIONS OF BOTH FOUR-EYES CHECKS ARE REACHABLE', () => {
  const PAIRS: readonly { name: string; raise: string; decide: string }[] = [
    { name: 'PSL_DECIDER_NOT_PROPOSER', raise: 'psl:propose', decide: 'psl:decide' },
    {
      name: 'MATERIALREQUEST_DECIDER_NOT_REQUESTER',
      raise: 'materialrequest:submit',
      decide: 'materialrequest:decide',
    },
  ];

  it('CONTROL — both atoms of both pairs exist in the catalogue', () => {
    // Without this, a renamed atom would make every assertion below vacuous:
    // `holdersOf('typo')` is empty, and "nobody holds both" would read as a pass
    // for the refused direction and a fail for the admitted one, which is a
    // confusing way to learn a string changed.
    const all = new Set(Object.values(SYSTEM_ROLES).flat() as readonly string[]);
    for (const p of PAIRS) {
      expect(all.has(p.raise), `${p.name}: '${p.raise}' is not an atom`).toBe(true);
      expect(all.has(p.decide), `${p.name}: '${p.decide}' is not an atom`).toBe(true);
    }
  });

  it.each(PAIRS)(
    '$name — REFUSED is reachable: some ONE person holds both sides',
    ({ name, raise, decide }) => {
      // The refused direction needs a seat that can raise AND decide. That is
      // what makes `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` demonstrable rather
      // than only filed — and what the four-eyes check exists to refuse.
      const both = holdersOf(raise).filter((p) =>
        holdersOf(decide).some((q) => q.personId === p.personId),
      );
      expect(
        both.map((p) => p.personId),
        `${name}: no sample person holds both '${raise}' and '${decide}', so the ` +
          'REFUSED direction cannot be reached from the roster',
      ).not.toEqual([]);
    },
  );

  it.each(PAIRS)(
    '$name — ADMITTED is reachable: two DIFFERENT people split the sides',
    ({ name, raise, decide }) => {
      const raisers = holdersOf(raise);
      const deciders = holdersOf(decide);
      const distinct = raisers.some((r) => deciders.some((d) => d.personId !== r.personId));
      expect(
        distinct,
        `${name}: every holder of '${decide}' is also the only holder of '${raise}', so ` +
          'the ADMITTED direction cannot be reached',
      ).toBe(true);
    },
  );
});
