import { describe, it, expect } from 'vitest';
// ⚠️ THE BARREL, NOT `./registry` (§42b) — the bare module leaves
// `getKnownFlows()` empty, and every "nothing is unheld" assertion below would
// pass over a population of nothing.
import { getKnownFlows, catalogRoles } from './index';
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  SUPERSET_ROLES,
  TENANCY_ANCHORS,
  atomsFor,
  rolesHolding,
  type SystemRoleId,
} from './businessRoles';
import {
  copyableParentRefusal,
  sideOfSystemRole,
  atomsOfCustomRole,
  atomsOfSide,
  type CustomRoleDefinition,
} from './customRoles';
import { PERSONA_ROLES, personaCan } from './roles';
import { ROLE_LABEL_KEY, ROLE_ORDER } from './handoff';
import i18n from '../../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// THE BUYER TENANCY ANCHOR — the ⊥ of the buyer half of the role lattice.
//
// ⚠️ **WHAT IT FIXES, MEASURED RATHER THAN ASSERTED.** A custom role is
// `{ parent, adds }` and `atomsOfCustomRole` is the UNION — additive only, by
// ruling, with no subtraction anywhere in the tree. So the narrowest child of a
// parent IS the parent, and what a side can express bottoms out at its smallest
// bundle. The supplier side's smallest bundle holds ZERO atoms (`supplier`), so
// every supplier atom-set is exactly constructible. The buyer side's smallest
// held THREE (`finance` and `requisitioner`), so every buyer custom seat carried
// at least three atoms of unrelated authority.
//
// **The wall was never subtraction and never lane granularity** — re-cutting
// lanes finer is role-per-distinction, which C10 §4.1 refuses. It was that this
// side had no bottom. The remedy is one zero-atom parent, and it required no
// change to `copyableParentRefusal`, to the additive-only merge rule, or to any
// lane's membership — asserted below, because "it needed none of those" is the
// whole argument and an unasserted argument is prose.
// ─────────────────────────────────────────────────────────────────────────────

const BUYER_LANES = [
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
] as const;

describe('POPULATION GUARD — the catalog is loaded and the anchor is present', () => {
  it('a known-GOOD atom is present and a known-BAD one is absent', () => {
    const roles = catalogRoles();
    expect(roles).toContain('gr:post');
    expect(roles).toContain('application:review');
    expect(roles).not.toContain('buyer:all');
    expect(getKnownFlows().length).toBeGreaterThan(10);
  });

  it('the six lanes this file names are exactly the buyer lanes on the seat', () => {
    expect([...SEEDED_SEAT_ROLES.buyer].sort()).toEqual([...BUYER_LANES].sort());
  });
});

describe('⚠️ THE ANCHOR HOLDS NOTHING — it names the side, it does not grant', () => {
  it('`buyer` grants zero atoms', () => {
    expect(SYSTEM_ROLES.buyer).toEqual([]);
  });

  it('⚠️ A SEAT HOLDING ONLY THE ANCHOR CAN ACT ON NOTHING — stated, not implied', () => {
    expect(atomsFor(['buyer'])).toEqual([]);
  });

  it('…so `rolesHolding` can never name it, and it is not filtered — it is unreturnable', () => {
    // Distinct from the SUPERSET roles, which ARE filtered: a superset names
    // nothing because it holds everything; an anchor names nothing because it
    // holds nothing. Only the first needs a filter.
    expect(SUPERSET_ROLES.has('buyer')).toBe(false);
    for (const atom of PERSONA_ROLES.buyer) {
      expect(rolesHolding(atom), `named as owner of '${atom}'`).not.toContain('buyer');
    }
    // Known-GOOD control: the lane owners ARE still named, so the sweep above is
    // not passing because `rolesHolding` returns nothing at all (§39).
    expect(rolesHolding('gr:post')).toEqual(['receiving']);
    expect(rolesHolding('invoice:pay')).toEqual(['finance']);
  });

  it('it is one of the declared anchors, and a lane is not', () => {
    expect(TENANCY_ANCHORS.has('buyer')).toBe(true);
    expect(TENANCY_ANCHORS.has('supplier')).toBe(true);
    // Known-BAD control on the same predicate.
    expect(TENANCY_ANCHORS.has('finance')).toBe(false);
  });
});

describe('⚠️ IT MIRRORS THE SUPPLIER ANCHOR — same shape, not a new invention', () => {
  it('both anchors hold nothing, sit on their own side, and are copyable', () => {
    for (const [anchor, side] of [
      ['buyer', 'buyer'],
      ['supplier', 'supplier'],
    ] as const) {
      expect(SYSTEM_ROLES[anchor], `${anchor} holds atoms`).toEqual([]);
      expect(sideOfSystemRole(anchor), `${anchor} side`).toBe(side);
      expect(copyableParentRefusal(anchor), `${anchor} refused as parent`).toBeNull();
    }
    // Known-BAD control, same instrument, same run: the role on NO side is still
    // refused as a parent, so "copyable" above is a real answer rather than a
    // predicate that returns null for everything.
    expect(copyableParentRefusal('admin')).toContain('spans both tenancies');
    expect(sideOfSystemRole('admin')).toBeNull();
  });

  it('the handoff record stays total over the union, in both directions', () => {
    expect(ROLE_LABEL_KEY.buyer).toBe('roles.owner.buyer');
    expect(ROLE_ORDER).toContain('buyer');
    expect([...ROLE_ORDER].sort()).toEqual(
      (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).sort(),
    );
  });
});

describe('⚠️ THE TENANCY ANSWERS ARE UNCHANGED — the anchor adds no atom', () => {
  it('`PERSONA_ROLES.buyer` is identical with and without it', () => {
    const withAnchor = new Set(atomsFor(PERSONA_SYSTEM_ROLES.buyer));
    const lanesOnly = new Set(atomsFor(SEEDED_SEAT_ROLES.buyer));
    expect(withAnchor).toEqual(lanesOnly);
    expect(personaCan('buyer', 'gr:post')).toBe(true); // known-GOOD
    expect(personaCan('buyer', 'po:confirm')).toBe(false); // still a supplier act
  });

  it('it reaches no supplier atom — the tenancy line, asserted at the bundle', () => {
    const supplier = new Set<string>(atomsOfSide('supplier'));
    expect(SYSTEM_ROLES.buyer.filter((a) => supplier.has(a))).toEqual([]);
    // …and the filter means something only because the other side is non-empty.
    expect(supplier.size).toBeGreaterThan(0);
  });
});

describe('⚠️ HOLDABLE, AND NOT SEEDED — §76d is the operator’s, not this batch’s', () => {
  it('the panel OFFERS it', () => {
    expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).toContain('buyer');
  });

  it('⚠️ THE SEAT DOES NOT OPEN HOLDING IT, and still opens holding all six lanes', () => {
    expect(SEEDED_SEAT_ROLES.buyer as readonly string[]).not.toContain('buyer');
    // The seed collapse is a ruling this batch must not pre-empt: the demo buyer
    // seat opens with every lane, exactly as it did before.
    expect([...SEEDED_SEAT_ROLES.buyer].sort()).toEqual([...BUYER_LANES].sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ WHAT IT UNBLOCKS — the measurement, not the claim.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EVERY BUYER ATOM-SET IS NOW EXACTLY CONSTRUCTIBLE', () => {
  const grant = (
    parent: SystemRoleId,
    adds: readonly string[],
  ): CustomRoleDefinition =>
    ({
      id: 'probe',
      parent,
      adds,
      displayName: 'Probe',
      description: 'Probe',
      parentAtomsAtGrant: [...SYSTEM_ROLES[parent]],
      grantedBy: 'UNATTRIBUTED: NO_PERSON_IN_SESSION',
      grantedAt: '2026-09-03T00:00:00.000Z',
    }) as unknown as CustomRoleDefinition;

  // The seats measured inexpressible before the anchor.
  const SEATS: readonly { name: string; adds: readonly string[] }[] = [
    { name: 'review an application, never decide it (B2)', adds: ['application:review'] },
    { name: 'receive and inspect goods, never post to SAP', adds: ['gr:receive', 'gr:inspect'] },
    { name: 'dispute an invoice, never release payment', adds: ['invoice:dispute'] },
  ];

  it.each(SEATS)('$name resolves to EXACTLY its adds', ({ adds }) => {
    expect([...atomsOfCustomRole(grant('buyer', adds))].sort()).toEqual([...adds].sort());
  });

  it('⚠️ AND NONE OF THEM WAS EXPRESSIBLE BEFORE — the anchor is load-bearing', () => {
    // For each seat, every OTHER legal buyer parent forces at least one atom the
    // seat must not hold. Without this the batch would be shipping a capability
    // nobody needed; with it, the three seats above are new reach.
    const otherParents = (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).filter(
      (r) => sideOfSystemRole(r) === 'buyer' && r !== 'buyer',
    );
    expect(otherParents.length, 'no rival parents — the probe is vacuous').toBeGreaterThan(0);
    for (const { name, adds } of SEATS) {
      const want = new Set<string>(adds);
      for (const p of otherParents) {
        const forced = SYSTEM_ROLES[p].filter((a) => !want.has(a));
        expect(
          forced.length,
          `'${p}' would have expressed "${name}" exactly — the anchor is not needed for it`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('the additive-only rule is untouched — a child is still a superset of its parent', () => {
    // The anchor introduces no subtraction; it makes the parent's contribution
    // EMPTY, which is a different thing, and is why no rule had to move.
    for (const parent of ['buyer', 'finance'] as const) {
      const child = new Set(atomsOfCustomRole(grant(parent, ['application:review'])));
      for (const a of SYSTEM_ROLES[parent]) {
        expect(child.has(a), `child of '${parent}' dropped '${a}'`).toBe(true);
      }
      expect(child.has('application:review')).toBe(true);
    }
  });
});

describe('⚠️ THE COPY — EN AND ID, AND THE ANCHOR MUST NOT CLAIM TO BE A GATE', () => {
  it.each(['en', 'id'])('%s names it and describes it, never a raw key', async (lng) => {
    await i18n.changeLanguage(lng);
    const name = i18n.t('roles.owner.buyer');
    const desc = i18n.t('roles.desc.buyer');
    expect(name, `name unresolved in ${lng}`).not.toMatch(/^roles\./);
    expect(desc, `description unresolved in ${lng}`).not.toMatch(/^roles\./);
    expect(desc.length, `description too thin in ${lng}`).toBeGreaterThan(80);
    await i18n.changeLanguage('en');
  });

  it('⚠️ it says it grants NOTHING and does not enforce tenancy', async () => {
    await i18n.changeLanguage('en');
    const d = i18n.t('roles.desc.buyer');
    expect(d).toMatch(/grants nothing/i);
    expect(d).toMatch(/not enforced by this role/i);
    // …and it points at where the acts are, or a reader meets a stripped role.
    for (const lane of [
      'Procurement',
      'Receiving',
      'Finance',
      'Compliance',
      'Planning',
      'Requisitioner',
    ]) {
      expect(d).toContain(lane);
    }
  });

  it('⚠️ THE TWO LOCALES ARE GENUINELY DIFFERENT TEXT — so the probe can fail', async () => {
    // A key spelled identically in both locales makes an assertion that cannot
    // fail. `Buyer` / `Pembeli` diverge, so this comparison is a real one.
    await i18n.changeLanguage('id');
    const idName = i18n.t('roles.owner.buyer');
    await i18n.changeLanguage('en');
    const enName = i18n.t('roles.owner.buyer');
    expect(idName).not.toBe(enName);
    expect(enName).toBe('Buyer');
    expect(idName).toBe('Pembeli');
  });
});
