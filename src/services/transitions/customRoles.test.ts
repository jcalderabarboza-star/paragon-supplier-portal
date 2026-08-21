// ────────────────────────────────────────────────────────────────────────────
// DUPLICATE-AND-NARROW — the merge rule, the drift exception, and the tenancy
// boundary, as PROPERTIES rather than as a worked example.
//
// ⚠️ **EVERY POPULATION HERE IS DERIVED AND EVERY GUARD IS PROBED BOTH WAYS.**
// A test that only asserts the bad input fails would pass over a predicate that
// refuses everything, and a derivation over an empty set reports clean. Both
// have shipped in this tree; neither can here.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import '../transitions';
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  atomsFor,
  type SystemRoleId,
} from './businessRoles';
import { catalogRoles } from './roles';
import {
  addableAtomRefusal,
  atomsForSeat,
  atomsOfCustomRole,
  atomsOfSide,
  copyableParentRefusal,
  customRoleStore,
  grantableIdRefusal,
  retainedFromParent,
  sideOfSystemRole,
  type CustomRoleDefinition,
} from './customRoles';

const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

const def = (over: Partial<CustomRoleDefinition> = {}): CustomRoleDefinition => ({
  id: 'jakarta-night-shift',
  parent: 'receiving',
  displayName: 'Jakarta Night Shift',
  description: 'The dock, after hours.',
  adds: ['invoice:dispute'],
  parentAtomsAtGrant: [...SYSTEM_ROLES.receiving],
  grantedBy: NOBODY,
  grantedAt: '2026-08-21T00:00:00.000Z',
  ...over,
});

beforeEach(() => customRoleStore.reset());

describe('POPULATION GUARD — the instrument is looking at the shipped tree', () => {
  it('the catalog is seeded and names the atoms these tests reason about', () => {
    // §42b — a derivation over an EMPTY population reports clean on every
    // question anybody asks it. This is the first assertion in the file for that
    // reason, and it asserts MEMBERSHIP, never a count.
    const catalog = catalogRoles();
    expect(catalog).toContain('gr:post');
    expect(catalog).toContain('role:grant');
    expect(catalog).not.toContain('buyer:all');
    expect(Object.keys(SYSTEM_ROLES)).toContain('compliance');
  });

  it('the store ships EMPTY — a grant is an act, never a seed', () => {
    expect(customRoleStore.all()).toEqual([]);
  });
});

describe('⚠️ THE MERGE RULE IS THE UNION, AND THE PARENT IS READ LIVE (D1)', () => {
  it('a child holds every atom its parent holds, plus its additions', () => {
    const atoms = atomsOfCustomRole(def());
    for (const a of SYSTEM_ROLES.receiving) {
      expect(atoms, `child lost parent atom '${a}'`).toContain(a);
    }
    expect(atoms).toContain('invoice:dispute');
    expect(atoms.length).toBe(SYSTEM_ROLES.receiving.length + 1);
  });

  it('the merge of an empty addition set is exactly the parent', () => {
    // The MERGE RULE handles this cleanly. THE VERB DOES NOT PRODUCE IT: the
    // dispatcher's `isEmpty` treats `[]` as an absent field, so an addition-less
    // grant is refused `MISSING_FIELDS:adds` (pinned in `roleGrantCommand`).
    // Duplicate-and-NARROW is an act that adds something.
    expect([...atomsOfCustomRole(def({ adds: [] }))].sort()).toEqual(
      [...SYSTEM_ROLES.receiving].sort(),
    );
  });

  it('⚠️ IT CANNOT SUBTRACT — no arrangement of a definition removes a parent atom', () => {
    // The operator's ruling, as a property over EVERY parent rather than one:
    // a role that only ever adds cannot silently drop a permission the system
    // role was relied on to carry.
    const parents = Object.keys(SYSTEM_ROLES).filter(
      (id) => sideOfSystemRole(id as SystemRoleId) !== null,
    ) as SystemRoleId[];
    expect(parents.length).toBeGreaterThan(0); // population guard
    for (const parent of parents) {
      const atoms = new Set(atomsOfCustomRole(def({ parent, adds: [], parentAtomsAtGrant: [] })));
      for (const a of SYSTEM_ROLES[parent]) {
        expect(atoms.has(a), `'${parent}' child lost '${a}'`).toBe(true);
      }
    }
  });

  it('⚠️ A SNAPSHOT WOULD NOT HAVE THIS PROPERTY — the parent moves, the child follows', () => {
    // The distinguishing case, stated as the thing a snapshot gets wrong: the
    // definition names atoms the parent gained AFTER the grant, and the child
    // holds them because the parent is read at resolution rather than copied at
    // grant. `parentAtomsAtGrant` is deliberately a SUBSET of today's parent
    // here — the shape a grant taken before a lane widened would have.
    const stale = def({ parentAtomsAtGrant: [SYSTEM_ROLES.receiving[0]] });
    for (const a of SYSTEM_ROLES.receiving) {
      expect(atomsOfCustomRole(stale)).toContain(a);
    }
    expect(retainedFromParent(stale)).toEqual([]);
  });
});

describe("⚠️ D1'S EXCEPTION — a removed parent atom is RETAINED, never quietly dropped", () => {
  it('an atom the parent held at grant and holds no longer stays with the child', () => {
    // `RETIRED-ATOM` stands for an atom the parent has since lost. It is
    // deliberately not a real atom: the point is that the child keeps whatever
    // it was granted, and a retired atom no transition requires is inert rather
    // than dangerous.
    const drifted = def({ parentAtomsAtGrant: [...SYSTEM_ROLES.receiving, 'RETIRED-ATOM'] });
    expect(retainedFromParent(drifted)).toEqual(['RETIRED-ATOM']);
    expect(atomsOfCustomRole(drifted)).toContain('RETIRED-ATOM');
  });

  it('and it is NAMED — the difference is reportable, not merely survived', () => {
    // A silent retention would be the mirror of a silent drop. What makes this
    // a VISIBLE DECISION is that the set is derivable and non-empty.
    const drifted = def({ parentAtomsAtGrant: [...SYSTEM_ROLES.receiving, 'RETIRED-ATOM'] });
    expect(retainedFromParent(drifted).length).toBe(1);
    // KNOWN-GOOD half: an undrifted grant reports nothing, so a non-empty set
    // means drift rather than meaning the function always answers.
    expect(retainedFromParent(def())).toEqual([]);
  });
});

describe('⚠️ TENANCY — A CUSTOM ROLE MAY NOT SPAN TENANCIES', () => {
  it('the two sides are DISJOINT — the invariant the rule protects', () => {
    const buyer = new Set(atomsOfSide('buyer'));
    const supplier = new Set(atomsOfSide('supplier'));
    expect(buyer.size).toBeGreaterThan(0);
    expect(supplier.size).toBeGreaterThan(0);
    expect([...buyer].filter((a) => supplier.has(a))).toEqual([]);
  });

  it('a supplier atom cannot be added to a buyer child, and the refusal NAMES it', () => {
    const refusal = addableAtomRefusal('receiving', 'po:confirm', catalogRoles());
    expect(refusal).toContain('po:confirm');
    expect(refusal).toContain('supplier-side');
    expect(refusal).toContain('may not span tenancies');
  });

  it('a buyer atom cannot be added to a supplier child either — both directions', () => {
    const refusal = addableAtomRefusal('supplier', 'gr:post', catalogRoles());
    expect(refusal).toContain('gr:post');
    expect(refusal).toContain('buyer-side');
  });

  it('⚠️ AND A SAME-SIDE ATOM PASSES — the known-GOOD half of the guard', () => {
    // Without this, a predicate that refused EVERYTHING would look like a
    // working tenancy gate. §39.
    expect(addableAtomRefusal('receiving', 'invoice:dispute', catalogRoles())).toBeNull();
    expect(addableAtomRefusal('supplier', 'asn:create', catalogRoles())).toBeNull();
  });

  it('a machine-only atom is refused — a custom role is not the door back in', () => {
    // `po:issue` is in the automation grant and in no assignable bundle. A super
    // admin cannot fire it; nor may a child of any role.
    const refusal = addableAtomRefusal('receiving', 'po:issue', catalogRoles());
    expect(refusal).toContain('no human owner');
  });

  it('an atom no transition requires is refused', () => {
    expect(addableAtomRefusal('receiving', 'not:an-atom', catalogRoles())).toContain(
      'not a permission',
    );
  });

  it('⚠️ `admin` CANNOT BE A PARENT — a copy of it would span by construction', () => {
    const refusal = copyableParentRefusal('admin');
    expect(refusal).toContain('spans both tenancies');
    expect(sideOfSystemRole('admin')).toBeNull();
    // Known-good: every other system role IS copyable.
    for (const id of Object.keys(SYSTEM_ROLES).filter((r) => r !== 'admin')) {
      expect(copyableParentRefusal(id), `'${id}' should be copyable`).toBeNull();
    }
  });

  it('a parent that is not a system role at all is refused', () => {
    expect(copyableParentRefusal('jakarta-night-shift')).toContain('is not a system role');
  });
});

describe('THE ID — distinguishable from a system role at the record level', () => {
  it('refuses a system role id, the machine grant, and a malformed slug', () => {
    expect(grantableIdRefusal('finance')).toContain('already a system role');
    expect(grantableIdRefusal('automation')).toContain('never assignable');
    expect(grantableIdRefusal('Jakarta Night')).toContain('is not a role id');
    expect(grantableIdRefusal('a')).toContain('is not a role id');
  });

  it('accepts a well-formed new id — the known-GOOD half', () => {
    expect(grantableIdRefusal('jakarta-night-shift')).toBeNull();
  });

  it('refuses an id already granted', () => {
    customRoleStore.append(def());
    expect(grantableIdRefusal('jakarta-night-shift')).toContain('already been granted');
  });
});

describe('⚠️ SEAT RESOLUTION — `atomsForSeat`, and the silent zero it prevents', () => {
  it('resolves a granted custom role to its union', () => {
    customRoleStore.append(def());
    const atoms = atomsForSeat(['jakarta-night-shift']);
    expect(atoms).toContain('gr:post');
    expect(atoms).toContain('invoice:dispute');
  });

  it('⚠️ `atomsFor` RESOLVES THE SAME SEAT TO NOTHING — this is the defect, pinned', () => {
    // Not a criticism of `atomsFor`: it answers a question about the SYSTEM
    // vocabulary and answers it correctly. The pin is that the two functions
    // genuinely differ, so a call site that reaches for the wrong one is a real
    // failure rather than a stylistic one — an empty grant is refused
    // `ROLE_NOT_PERMITTED` on every act with nothing to say the role existed.
    customRoleStore.append(def());
    expect(atomsFor(['jakarta-night-shift'])).toEqual([]);
    expect(atomsForSeat(['jakarta-night-shift']).length).toBeGreaterThan(0);
  });

  it('an UNGRANTED id still resolves to nothing — a name is not a grant', () => {
    expect(atomsForSeat(['jakarta-night-shift'])).toEqual([]);
  });

  it('mixes system and custom roles on one seat', () => {
    customRoleStore.append(def());
    const atoms = atomsForSeat(['finance', 'jakarta-night-shift']);
    expect(atoms).toContain('invoice:pay');
    expect(atoms).toContain('gr:post');
  });

  it('⚠️ A CUSTOM ROLE NEVER WIDENS A PERSONA — tenancy is not a seat property', () => {
    // `PERSONA_ROLES` answers "could anybody on this side ever fire this?" and
    // is derived from the SYSTEM bundles alone. A grant must not move it, or the
    // next-actor line and the per-persona surfaceable invariant would start
    // reading a session's contents as a fact about a side.
    const before = [...atomsFor(PERSONA_SYSTEM_ROLES.buyer)].sort();
    customRoleStore.append(def());
    expect([...atomsFor(PERSONA_SYSTEM_ROLES.buyer)].sort()).toEqual(before);
  });
});

describe('⚠️ THE SESSION IS THE LIFETIME (D2)', () => {
  it('a reset — which is what a reload is — takes every grant with it', () => {
    customRoleStore.append(def());
    expect(customRoleStore.byId('jakarta-night-shift')).toBeDefined();
    customRoleStore.reset();
    expect(customRoleStore.byId('jakarta-night-shift')).toBeUndefined();
    expect(atomsForSeat(['jakarta-night-shift'])).toEqual([]);
  });

  it('⚠️ NOTHING IS WRITTEN TO PERSISTENT STORAGE — the page says so, and it is true', () => {
    // The marker claims a grant is "never written to disk". This is that claim,
    // asserted against the only durable channel in the tree.
    const writes: string[] = [];
    const real = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = (k: string, v: string) => {
      writes.push(k);
      real(k, v);
    };
    try {
      customRoleStore.append(def());
      atomsForSeat(['jakarta-night-shift']);
    } finally {
      window.localStorage.setItem = real;
    }
    expect(writes).toEqual([]);
  });
});
