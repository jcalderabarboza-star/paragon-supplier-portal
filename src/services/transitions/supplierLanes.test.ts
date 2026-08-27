import { describe, it, expect } from 'vitest';
// ⚠️ THE BARREL, NOT `./registry` (§42b) — the bare module leaves
// `getKnownFlows()` empty and every "nothing is unheld" assertion below passes
// over a population of nothing.
import { getKnownFlows, catalogRoles } from './index';
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  SUPERSET_ROLES,
  atomsFor,
  rolesHolding,
  type SystemRoleId,
} from './businessRoles';
import { sideOfSystemRole } from './customRoles';
import { PERSONA_ROLES, personaCan } from './roles';
import { ROLE_LABEL_KEY, ROLE_ORDER } from './handoff';
import i18n from '../../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER SIDE, SPLIT INTO THREE LANES AND AN ANCHOR.
//
// ⚠️ **WHAT THIS REPLACES:** ONE bundle holding all 16 supplier atoms, so every
// supplier act was authorised by the fact of being a supplier — the same
// undifferentiated shape the persona-wide buyer grant was retired for. The role
// gate was ALREADY live on this side (measured at the dispatcher, not read off
// the role table); it simply had nothing to say while one bundle held
// everything.
//
// ⚠️ **AND THE ANCHOR IS NOT A TENANCY GATE, WHICH IS THE ONE THING THIS FILE
// MUST NOT LET DRIFT.** The ruling that created it described `supplier` as
// *what makes a seat a supplier seat*. Measured: the dispatcher's only tenancy
// branches read `scope.personaType`, and **no code anywhere tests membership of
// `businessRoles` to decide a side.** So the anchor names the side; it does not
// enforce it, and the catalogue copy is asserted below to say the honest thing.
// ─────────────────────────────────────────────────────────────────────────────

const LANES = ['commercial', 'fulfilment', 'back_office'] as const;

describe('POPULATION GUARD — the catalog is loaded and the split is present', () => {
  it('a known-GOOD atom is present and a known-BAD one is absent', () => {
    const roles = catalogRoles();
    expect(roles).toContain('po:confirm');
    expect(roles).toContain('quotation:submit');
    expect(roles).not.toContain('supplier:all');
    expect(getKnownFlows().length).toBeGreaterThan(10);
  });

  it('all three lanes exist and hold something', () => {
    for (const l of LANES) {
      expect(SYSTEM_ROLES[l], `lane '${l}' missing`).toBeDefined();
      expect(SYSTEM_ROLES[l].length, `lane '${l}' is empty`).toBeGreaterThan(0);
    }
  });
});

describe('⚠️ THE ANCHOR HOLDS NOTHING — it names the side, it does not grant', () => {
  it('`supplier` grants zero atoms', () => {
    expect(SYSTEM_ROLES.supplier).toEqual([]);
  });

  it('…so `rolesHolding` can never name it, and it is not filtered — it is unreturnable', () => {
    // Distinct from the SUPERSET roles, which ARE filtered: a superset names
    // nothing because it holds everything; the anchor names nothing because it
    // holds nothing. Only the first needs a filter.
    expect(SUPERSET_ROLES.has('supplier')).toBe(false);
    for (const atom of PERSONA_ROLES.supplier) {
      expect(rolesHolding(atom), `named as owner of '${atom}'`).not.toContain('supplier');
    }
  });

  it('⚠️ AND A SEAT HOLDING ONLY THE ANCHOR CAN ACT ON NOTHING — stated, not implied', () => {
    expect(atomsFor(['supplier'])).toEqual([]);
  });
});

describe('⚠️ THE THREE LANES PARTITION THE SUPPLIER SIDE — bilateral, both directions', () => {
  const laneAtoms = LANES.flatMap((l) => [...SYSTEM_ROLES[l]]);

  it('no atom is claimed by two lanes', () => {
    const dupes = laneAtoms.filter((a, i) => laneAtoms.indexOf(a) !== i);
    expect(dupes, `an atom in two lanes has two owners: ${dupes.join(', ')}`).toEqual([]);
  });

  it('⚠️ every supplier atom is owned by exactly one lane — NOTHING IS LEFT BEHIND', () => {
    // ⚠️ **THIS IS THE ASSERTION THAT FORCED THE TWO JUDGEMENT CALLS.** The
    // ruling permitted an atom to stay UNOWNED and say so. It cannot: the
    // shipped bilateral gate in `businessRoles.test.ts` refuses an atom no
    // bundle holds — *"AN ATOM NO ROLE HOLDS IS A VERB NOBODY CAN FIRE"* — and
    // `PERSONA_ROLES.supplier` is DERIVED from the offer, so an orphan would
    // also make `nextActorFrom` report two live, wired, surfaced verbs as
    // `stranded` while a supplier performs them daily. Unowned is not a quiet
    // filing here; it is a false statement on a surface.
    const unowned = [...PERSONA_ROLES.supplier].filter((a) => !laneAtoms.includes(a)).sort();
    expect(unowned, `unowned supplier atoms: ${unowned.join(', ')}`).toEqual([]);
  });

  it('and no lane names an atom outside the supplier side', () => {
    const buyerOnly = laneAtoms.filter(
      (a) => !(PERSONA_ROLES.supplier as readonly string[]).includes(a),
    );
    expect(buyerOnly).toEqual([]);
  });
});

describe('⚠️ THE TENANCY ANSWER IS UNCHANGED — the whole point of keeping the anchor', () => {
  it('`PERSONA_ROLES.supplier` still spans every supplier atom', () => {
    // Bit-identical to what one bundle spanned. If this drifts, the split
    // silently narrowed a PERSONA rather than a SEAT, and `nextActorFrom`,
    // `catalogView` and the per-persona `surfaceable` invariant move with it.
    expect([...PERSONA_ROLES.supplier].sort()).toEqual(
      [...atomsFor(PERSONA_SYSTEM_ROLES.supplier)].sort(),
    );
    expect(personaCan('supplier', 'po:confirm')).toBe(true);
    expect(personaCan('supplier', 'requirementresponse:acknowledge')).toBe(true);
    expect(personaCan('supplier', 'inventorydeclaration:declare')).toBe(true);
    // …and the sides stay strictly disjoint.
    expect(PERSONA_ROLES.supplier.filter((a) => PERSONA_ROLES.buyer.includes(a))).toEqual([]);
  });

  it('no supplier lane leaks into the buyer offer, and `buyer_all` gains nothing', () => {
    for (const l of LANES) {
      expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).not.toContain(l);
    }
    for (const a of PERSONA_ROLES.supplier) {
      expect(SYSTEM_ROLES.buyer_all, `buyer_all reached '${a}'`).not.toContain(a);
    }
  });

  it('`admin` still spans both sides — it is the union of every lane', () => {
    for (const a of PERSONA_ROLES.supplier) expect(SYSTEM_ROLES.admin).toContain(a);
    for (const a of SYSTEM_ROLES.buyer_all) expect(SYSTEM_ROLES.admin).toContain(a);
  });
});

describe('⚠️ THE OWNER OF A SUPPLIER ACT IS NOW A LANE', () => {
  it('names the lane, never the anchor', () => {
    expect(rolesHolding('po:confirm')).toEqual(['fulfilment']);
    expect(rolesHolding('asn:submit')).toEqual(['fulfilment']);
    expect(rolesHolding('quotation:submit')).toEqual(['commercial']);
    expect(rolesHolding('requirementresponse:submit')).toEqual(['commercial']);
    expect(rolesHolding('invoice:submit')).toEqual(['back_office']);
    expect(rolesHolding('compliance:submit')).toEqual(['back_office']);
  });

  it('⚠️ …AND THE ONE ENTITY THAT SPANS TWO LANES PROVES THE SPLIT IS PER-ATOM', () => {
    // `requirementResponse` holds a COMMITMENT verb and a VISIBILITY verb. The
    // flow header draws the line itself — a visibility-only line "carries NO
    // commitment ask" — so the split does NOT run along flow boundaries, and a
    // per-flow assignment would have been wrong about exactly this pair.
    expect(rolesHolding('requirementresponse:submit')).toEqual(['commercial']);
    expect(rolesHolding('requirementresponse:acknowledge')).toEqual(['back_office']);
  });
});

describe('THE OFFER AND THE SEED', () => {
  it('both list the anchor plus the three lanes', () => {
    const expected = ['supplier', ...LANES].sort();
    expect([...PERSONA_SYSTEM_ROLES.supplier].sort()).toEqual(expected);
    expect([...SEEDED_SEAT_ROLES.supplier].sort()).toEqual(expected);
  });

  it('⚠️ THE SEED GRANTS ALL FOUR, so a narrowed seat is reached by REMOVAL', () => {
    // The buyer side's shape, mirrored (operator ruling). It is also what
    // retires the always-on last-role notice: a one-role seat could never
    // follow the advice its own notice gave.
    expect(SEEDED_SEAT_ROLES.supplier.length).toBeGreaterThan(1);
  });

  it('every offered supplier role resolves to the supplier side', () => {
    for (const r of SEEDED_SEAT_ROLES.supplier) {
      expect(sideOfSystemRole(r), `'${r}' is not on the supplier side`).toBe('supplier');
    }
    // Known-BAD control beside the known-good sweep.
    expect(sideOfSystemRole('admin')).toBeNull();
    expect(sideOfSystemRole('procurement')).toBe('buyer');
  });
});

describe('THE HANDOFF VOCABULARY STAYS TOTAL', () => {
  it('every lane has a label key and a place in the order', () => {
    for (const r of ['supplier', ...LANES] as SystemRoleId[]) {
      expect(ROLE_LABEL_KEY[r], `no label key for '${r}'`).toBeTruthy();
      expect(ROLE_ORDER, `'${r}' missing from ROLE_ORDER`).toContain(r);
    }
    // Total in the other direction too — an id in the order with no label is
    // the quiet half of the same defect.
    expect([...ROLE_ORDER].sort()).toEqual(
      (Object.keys(SYSTEM_ROLES) as SystemRoleId[]).sort(),
    );
  });
});

describe('⚠️ THE COPY — EN AND ID, AND THE ANCHOR MUST NOT CLAIM TO BE A GATE', () => {
  it.each(['en', 'id'])('%s names every lane, never a raw key', async (lng) => {
    await i18n.changeLanguage(lng);
    for (const r of ['supplier', ...LANES]) {
      const name = i18n.t(`roles.owner.${r}`);
      const desc = i18n.t(`roles.desc.${r}`);
      expect(name, `'${r}' name unresolved in ${lng}`).not.toMatch(/^roles\./);
      expect(desc, `'${r}' description unresolved in ${lng}`).not.toMatch(/^roles\./);
      expect(desc.length, `'${r}' description too thin in ${lng}`).toBeGreaterThan(80);
    }
    await i18n.changeLanguage('en');
  });

  it('⚠️ the anchor says it grants NOTHING and does not enforce tenancy', async () => {
    await i18n.changeLanguage('en');
    const d = i18n.t('roles.desc.supplier');
    expect(d).toMatch(/grants nothing/i);
    expect(d).toMatch(/not enforced by this role/i);
    // …and it points at where the acts went, or a reader meets a stripped role.
    for (const l of ['Commercial', 'Fulfilment', 'Back Office']) expect(d).toContain(l);
  });

  it('each lane states what it CANNOT do, not only what it can', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('roles.desc.commercial')).toMatch(/does not confirm orders/i);
    expect(i18n.t('roles.desc.fulfilment')).toMatch(/cannot quote/i);
    expect(i18n.t('roles.desc.back_office')).toMatch(/cannot quote/i);
  });
});

describe('⚠️ `supplierdoc:upload` — RULED TO BACK OFFICE, AND NOW ASSIGNED (§82)', () => {
  // ⚠️ **THIS BLOCK ASSERTED THE ABSENCE UNTIL §82, AND THE INVERSION IS THE
  // POINT RATHER THAN AN EDIT.** §79e filed two defects: the atom was UNOWNED
  // (ruled to back office, unassignable) and the VERB was UNAUTHORED. The
  // ownership could not be written into the bundle because the shipped bilateral
  // gate refuses an atom no transition requires — *"there is nothing for it to
  // permit"* (C10 §3.4). **The gate was right, and the resolution was never to
  // weaken it:** §82 authored `t_supplierdoc_declare`, which gives the atom
  // something to permit, and the ownership stops being a ruling held in prose
  // and becomes a fact about the catalog.
  //
  // The assertions run in the SAME two directions the absence ran in, so an
  // accidental un-assignment reddens exactly as an accidental assignment used to.
  it('the atom exists in the catalog, and back office holds it', () => {
    expect(catalogRoles()).toContain('supplierdoc:upload');
    expect(SYSTEM_ROLES.back_office).toContain('supplierdoc:upload');
  });

  it('it is required by exactly the verb that was authored for it', () => {
    const requiring = getKnownFlows()
      .flatMap((f) => f.transitions)
      .filter((t) => t.requiredRole === 'supplierdoc:upload')
      .map((t) => t.id);
    expect(requiring).toEqual(['t_supplierdoc_declare']);
  });

  it('CONTROL — the sibling supply verb is still a DISTINCT atom, also back office’s', () => {
    // The two are deliberately not merged: `_submit` fills a slot the BUYER
    // opened, `_declare` is the supplier volunteering. Same lane, different
    // authority — and if a later batch collapses them, this control is what says
    // so out loud instead of the merge passing silently.
    expect(SYSTEM_ROLES.back_office).toContain('supplierdoc:submit');
    expect('supplierdoc:submit').not.toBe('supplierdoc:upload');
  });

  it('CONTROL — a genuinely absent atom is still absent (the negative half)', () => {
    // Without this, every assertion above would pass on a `catalogRoles()` that
    // returned everything. §39 — a one-sided probe proves nothing.
    expect(catalogRoles()).not.toContain('supplierdoc:incinerate');
  });
});
