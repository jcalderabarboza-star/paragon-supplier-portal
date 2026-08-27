import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  SUPERSET_ROLES,
  AUTOMATION_ATOMS,
  atomsFor,
  rolesHolding,
  isSystemRole,
  type SystemRoleId,
} from './businessRoles';
import { sideOfSystemRole, atomsOfSide, copyableParentRefusal } from './customRoles';
import { ROLE_LABEL_KEY, ROLE_ORDER } from './handoff';
import { personaCan } from './roles';
import i18n from '../../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// `buyer_all` — THE MANAGER'S SEAT.
//
// ⚠️ **IT IS NOT A SMALLER `admin`, AND EVERY ASSERTION HERE IS ABOUT THAT
// DISTINCTION.** `admin` is the IT seat: both tenancies, plus authority over the
// role system itself. `buyer_all` is the manager's seat: one side, no authority
// over roles. *A department head who can do everything their team does is not an
// IT administrator who can do everything anyone does.*
//
// ⚠️ **AND IT IS NOT JUSTIFIED BY duplicate-and-narrow.** That justification was
// measured ARITHMETICALLY IMPOSSIBLE (§77f) and is not revived by this file: the
// custom-role mechanism is additive-only, so the widest role on a side is the
// one parent from which no child can ever be minted. The role stands on the
// separation of jobs, which the measurement does not touch — and the dead end is
// asserted below rather than hidden, so nobody re-derives it as a defect.
// ─────────────────────────────────────────────────────────────────────────────

const BUYER_LANES: readonly SystemRoleId[] = [
  'procurement',
  'receiving',
  'finance',
  'compliance',
  'planning',
  'requisitioner',
];

describe('POPULATION GUARD — the instrument sees the tree', () => {
  it('the role exists, is a system role, and an invented neighbour is not', () => {
    // Both directions. `buyer_all` returning true is only evidence once a
    // plausible non-member returns false: a predicate that says yes to
    // everything would pass the first assertion alone.
    expect(isSystemRole('buyer_all')).toBe(true);
    expect(isSystemRole('buyer:all')).toBe(false); // the DR-10 AUDIT ACTOR string
    expect(isSystemRole('buyer_everything')).toBe(false);
    expect(SYSTEM_ROLES.buyer_all.length).toBeGreaterThan(0);
  });

  it('the six lanes this file names are exactly the buyer lanes on the seat', () => {
    // The list above is a local convenience; if it drifts from the seed, every
    // assertion below is measuring a set nobody holds.
    expect([...SEEDED_SEAT_ROLES.buyer].sort()).toEqual([...BUYER_LANES].sort());
  });
});

describe('⚠️ WHAT IT GRANTS — derived, and bilateral', () => {
  it('holds EVERY atom the six lanes hold, except `role:grant`', () => {
    const lanes = new Set(BUYER_LANES.flatMap((r) => SYSTEM_ROLES[r]));
    lanes.delete('role:grant');
    expect(lanes.size).toBeGreaterThan(0); // population guard
    expect(new Set(SYSTEM_ROLES.buyer_all)).toEqual(lanes);
  });

  it('⚠️ DOES NOT HOLD `role:grant` — and the exclusion is asserted BOTH ways', () => {
    // The negative alone would pass on an EMPTY bundle. The positive beside it
    // is what makes the negative mean something (§39).
    expect(SYSTEM_ROLES.buyer_all).not.toContain('role:grant');
    expect(SYSTEM_ROLES.compliance).toContain('role:grant');
    // …and it still holds the REST of compliance, so the subtraction is one atom
    // rather than one bundle.
    for (const a of SYSTEM_ROLES.compliance) {
      if (a === 'role:grant') continue;
      expect(SYSTEM_ROLES.buyer_all, `lost '${a}' with the subtraction`).toContain(a);
    }
  });

  it('⚠️ REACHES NO SUPPLIER ATOM — the tenancy line, asserted at the bundle', () => {
    const supplier = new Set<string>(atomsOfSide('supplier'));
    expect(supplier.size).toBeGreaterThan(0);
    for (const a of SYSTEM_ROLES.buyer_all) {
      expect(supplier.has(a), `'${a}' is a supplier atom`).toBe(false);
    }
    // Known-GOOD control: a supplier atom that genuinely exists, and which
    // `admin` DOES hold — so this is measuring tenancy, not an empty set.
    expect(supplier.has('po:confirm')).toBe(true);
    expect(SYSTEM_ROLES.admin).toContain('po:confirm');
    expect(SYSTEM_ROLES.buyer_all).not.toContain('po:confirm');
  });

  it('holds no machine-only atom — a manager is not the platform', () => {
    const assignable = new Set(
      (Object.keys(SYSTEM_ROLES) as SystemRoleId[])
        .filter((r) => !SUPERSET_ROLES.has(r))
        .flatMap((r) => SYSTEM_ROLES[r]),
    );
    const machineOnly = AUTOMATION_ATOMS.filter((a) => !assignable.has(a));
    expect(machineOnly.length, 'no machine-only atoms — the probe is vacuous').toBeGreaterThan(0);
    for (const a of machineOnly) {
      expect(SYSTEM_ROLES.buyer_all, `holds machine-only '${a}'`).not.toContain(a);
    }
  });
});

describe('⚠️ IT IS STRICTLY NARROWER THAN `admin` — the two seats are different jobs', () => {
  it('admin holds everything buyer_all holds, and strictly more', () => {
    const admin = new Set<string>(SYSTEM_ROLES.admin);
    for (const a of SYSTEM_ROLES.buyer_all) expect(admin.has(a)).toBe(true);
    expect(SYSTEM_ROLES.admin.length).toBeGreaterThan(SYSTEM_ROLES.buyer_all.length);
  });

  it('and the difference is exactly: the supplier side, plus `role:grant`', () => {
    // Named, not counted — the difference IS the ruling, so it is asserted as a
    // set rather than as a size that would drift the day a lane gains an atom.
    const diff = new Set(
      SYSTEM_ROLES.admin.filter((a) => !SYSTEM_ROLES.buyer_all.includes(a)),
    );
    const expected = new Set<string>([...atomsOfSide('supplier'), 'role:grant']);
    expect(diff).toEqual(expected);
  });
});

describe('⚠️ HOLDABLE, AND NOT SEEDED — the split the ruling required', () => {
  it('the panel OFFERS it: it is in what a buyer persona may hold', () => {
    expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).toContain('buyer_all');
  });

  it('⚠️ THE SEAT DOES NOT OPEN HOLDING IT', () => {
    expect(SEEDED_SEAT_ROLES.buyer as readonly string[]).not.toContain('buyer_all');
  });

  it('⚠️ THE SEED IS A PROPER SUBSET OF THE OFFER — both directions', () => {
    // Direction 1: nothing seeded is un-offerable. A seat cannot open holding a
    // role the panel would refuse to hand back.
    for (const persona of ['buyer', 'supplier'] as const) {
      for (const r of SEEDED_SEAT_ROLES[persona]) {
        expect(PERSONA_SYSTEM_ROLES[persona] as readonly string[]).toContain(r);
      }
    }
    // Direction 2: at least one offerable role is UNSEEDED — otherwise the two
    // constants are the same list wearing two names, and the next edit quietly
    // re-merges them.
    const unseeded = (PERSONA_SYSTEM_ROLES.buyer as readonly string[]).filter(
      (r) => !(SEEDED_SEAT_ROLES.buyer as readonly string[]).includes(r),
    );
    expect(unseeded).toEqual(['buyer_all']);
  });

  it('it is on the BUYER side, so it collapses no tenancy answer', () => {
    expect(sideOfSystemRole('buyer_all')).toBe('buyer');
    // `admin` is the one that is on NO side — which is why it is not offerable.
    expect(sideOfSystemRole('admin')).toBeNull();
    expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).not.toContain('admin');
  });

  it('⚠️ `PERSONA_ROLES.buyer` IS UNCHANGED BY ITS PRESENCE — it adds no atom', () => {
    // The reason `buyer_all` can be offerable where `admin` cannot: its atoms
    // are a SUBSET of what the lanes already contribute, so `personaCan` — which
    // `nextActorFrom`, `catalogView` and the surfaceable invariant all read —
    // answers exactly as before.
    const withIt = new Set(atomsFor(PERSONA_SYSTEM_ROLES.buyer));
    const lanesOnly = new Set(atomsFor(SEEDED_SEAT_ROLES.buyer));
    expect(withIt).toEqual(lanesOnly);
    expect(personaCan('buyer', 'po:confirm')).toBe(false); // still a supplier act
    expect(personaCan('buyer', 'gr:post')).toBe(true); // known-GOOD control
  });
});

describe('⚠️ IT IS A SUPERSET, NOT AN OWNER — the handoff must not name it', () => {
  it('`rolesHolding` never returns it', () => {
    for (const atom of SYSTEM_ROLES.buyer_all) {
      expect(rolesHolding(atom), `named as an owner of '${atom}'`).not.toContain('buyer_all');
    }
  });

  it('and the lane owners are still named — the filter did not empty the answer', () => {
    // The failure this guards is a filter that removes too much and reports a
    // clean "no owners" — `EMPTY-INPUT-REPORTS-CLEAN-01` inside a handoff.
    expect(rolesHolding('invoice:pay')).toEqual(['finance']);
    expect(rolesHolding('gr:post')).toEqual(['receiving']);
    expect(rolesHolding('po:confirm')).toEqual(['supplier']);
    expect(rolesHolding('role:grant')).toEqual(['compliance']);
  });

  it('⚠️ `SUPERSET_ROLES` IS DERIVED-TRUE, NOT A HAND-KEPT LIST', () => {
    // Every member must actually BE a superset of some other role, and every
    // non-member must NOT be — so a third wide role cannot be added without
    // either joining the set or turning this red.
    const ids = Object.keys(SYSTEM_ROLES) as SystemRoleId[];
    const isSuperset = (r: SystemRoleId) =>
      ids.some(
        (o) =>
          o !== r &&
          SYSTEM_ROLES[o].length > 0 &&
          SYSTEM_ROLES[o].every((a) => SYSTEM_ROLES[r].includes(a)),
      );
    for (const r of ids) {
      expect(isSuperset(r), `'${r}' superset=${isSuperset(r)} but SUPERSET_ROLES says otherwise`)
        .toBe(SUPERSET_ROLES.has(r));
    }
    expect(SUPERSET_ROLES.size).toBeGreaterThan(1); // population guard
  });
});

describe('⚠️ THE COPY DEAD END IS ASSERTED, NOT HIDDEN', () => {
  it('the verb ACCEPTS it as a parent — it is on a side', () => {
    expect(copyableParentRefusal('buyer_all')).toBeNull();
    // Known-BAD control beside the known-good one.
    expect(copyableParentRefusal('admin')).toContain('spans both tenancies');
  });

  it('⚠️ …AND THERE IS NOTHING TO ADD TO IT, WHICH IS WHY IT IS NOT THE COPY PARENT', () => {
    // The measurement that killed the duplicate-and-narrow justification, kept
    // as a test so it cannot be quietly re-proposed: the addable set for a
    // ceiling parent is EMPTY, and `adds` is a required field. The surface says
    // so honestly (`roles.page.createAddsNone`); this pins the arithmetic.
    const held = new Set<string>(SYSTEM_ROLES.buyer_all);
    const addable = atomsOfSide('buyer').filter((a) => !held.has(a));
    expect(addable).toEqual(['role:grant']);
    // …and `role:grant` is exactly the atom a manager's seat must not gain by
    // copying itself, so the one addable atom is the one the ruling forbids.
    // A child of `buyer_all` is therefore either identical to it (refused
    // MISSING_FIELDS:adds) or it is `admin` by another name.
  });
});

describe('⚠️ IT IS NAMED AND DESCRIBED, IN BOTH LOCALES', () => {
  it('the handoff record stays total over the union', () => {
    expect(ROLE_LABEL_KEY.buyer_all).toBe('roles.owner.buyer_all');
    expect(ROLE_ORDER).toContain('buyer_all');
    // Total, both ways — a role missing from the order would silently vanish
    // from an owner line rather than fail.
    expect([...ROLE_ORDER].sort()).toEqual((Object.keys(SYSTEM_ROLES) as string[]).sort());
  });

  it.each(['en', 'id'])('%s names it as a name and describes it', async (lng) => {
    await i18n.changeLanguage(lng);
    const name = i18n.t('roles.owner.buyer_all');
    const desc = i18n.t('roles.desc.buyer_all');
    expect(name).not.toBe('roles.owner.buyer_all'); // key did not resolve = missing
    expect(desc).not.toBe('roles.desc.buyer_all');
    expect(name[0]).toBe(name[0].toUpperCase()); // a noun, not a sentence fragment
    expect(desc.length).toBeGreaterThan(80);
    await i18n.changeLanguage('en');
  });

  it('⚠️ THE DESCRIPTION STATES WHAT IT IS NOT, AND THE SEGREGATION IT DISSOLVES', () => {
    // The operator's requirement, asserted rather than trusted to review: a
    // reader choosing between this and Super Admin must be able to tell them
    // apart ON THE PAGE, and §76d's crossing must be readable rather than
    // implied.
    const desc = i18n.t('roles.desc.buyer_all');
    expect(desc).toMatch(/supplier side/i); // what it is NOT, half one
    expect(desc).toMatch(/no authority over roles/i); // what it is NOT, half two
    expect(desc).toMatch(/Super Admin/); // how to tell the two apart
    expect(desc).toMatch(/revise/i); // the segregation it dissolves
    expect(desc).toMatch(/approve/i);
  });
});
