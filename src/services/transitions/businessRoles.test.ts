import { describe, it, expect } from 'vitest';
// ⚠️ THE BARREL, NOT `./registry` (§42b). Importing the bare registry module
// means no shipped flow has self-registered, `getKnownFlows()` returns `[]`, and
// every "nothing is wrong" assertion below passes over an EMPTY population —
// a right answer from an instrument that examined nothing.
import { getKnownFlows, catalogRoles } from './index';
import {
  SYSTEM_ROLES,
  AUTOMATION_ATOMS,
  AUTOMATION_ROLE,
  PERSONA_SYSTEM_ROLES,
  atomsFor,
  isSystemRole,
  rolesHolding,
  type SystemRoleId,
} from './businessRoles';
import { CASCADES } from './cascades';
import { getTransition } from './registry';

// ─────────────────────────────────────────────────────────────────────────────
// THE POPULATION GUARD RUNS FIRST AND ASSERTS MEMBERSHIP, NEVER A COUNT
// (§42b, `EMPTY-INPUT-REPORTS-CLEAN-01`). Every assertion in this file is of
// the form "nothing is unheld" / "nothing is extra" — the exact shape that
// passes vacuously over an empty catalog.
// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION GUARD — the catalog is loaded', () => {
  it('a known-GOOD atom is present and a known-BAD one is absent', () => {
    const roles = catalogRoles();
    expect(roles).toContain('gr:post');
    expect(roles).toContain('invoice:pay');
    expect(roles).not.toContain('buyer:all');
    expect(roles).not.toContain('buyer:planner');
    expect(getKnownFlows().length).toBeGreaterThan(10);
  });
});

describe('THE BUNDLES ARE BILATERAL AGAINST THE CATALOG', () => {
  // Both directions, because a one-sided version ships looking like a working
  // gate: "every bundle atom exists" would let an atom belong to NO bundle
  // (unreachable by anyone, silently); "every catalog atom is held" would let a
  // bundle name an atom no transition requires — the plausible-looking string
  // C10 §3.4 calls a checkable defect.
  const held = new Set<string>([
    ...Object.values(SYSTEM_ROLES).flat(),
    ...AUTOMATION_ATOMS,
  ]);

  it('every atom named by a bundle is required by a registered transition', () => {
    const catalog = new Set(catalogRoles());
    const invented = [...held].filter((a) => !catalog.has(a)).sort();
    expect(
      invented,
      'A BUNDLE NAMES AN ATOM NO TRANSITION REQUIRES. There is nothing for it\n' +
        'to permit; a surface that wants one is asking for a transition (C10 §3.3).\n' +
        invented.join('\n'),
    ).toEqual([]);
  });

  it('every atom in the catalog is held by a bundle or the automation grant', () => {
    const unheld = catalogRoles().filter((a) => !held.has(a)).sort();
    expect(
      unheld,
      'AN ATOM NO ROLE HOLDS IS A VERB NOBODY — PERSON OR MACHINE — CAN FIRE.\n' +
        'It would refuse at the role gate with no owner to name, which is the\n' +
        'silent-unreachability failure this batch exists to prevent:\n' +
        unheld.join('\n'),
    ).toEqual([]);
  });
});

describe('⚠️ THE AUTOMATION GRANT IS NOT A BUSINESS ROLE', () => {
  it('`automation` is absent from SYSTEM_ROLES and from every persona', () => {
    // The mechanism, not the convention: it cannot be assigned because it is
    // not in the record a catalogue would iterate (C10 §6.4 — attribution
    // absent = a machine act, never a person holding a role).
    expect(Object.keys(SYSTEM_ROLES)).not.toContain(AUTOMATION_ROLE);
    expect(isSystemRole(AUTOMATION_ROLE)).toBe(false);
    expect(PERSONA_SYSTEM_ROLES.buyer as readonly string[]).not.toContain(AUTOMATION_ROLE);
    expect(PERSONA_SYSTEM_ROLES.supplier as readonly string[]).not.toContain(AUTOMATION_ROLE);
    // Known-GOOD control for the same predicate — a guard probed one way only
    // ships looking like it works (§39).
    expect(isSystemRole('finance')).toBe(true);
  });

  it('⚠️ COVERS EVERY CASCADE TARGET — the silent-failure path', () => {
    // The dispatcher's fan-out re-dispatches inside a `catch {}`. A cascade
    // refused at the role gate fails SILENTLY and best-effort, so this is the
    // one place where narrowing a grant deletes a reachable act with nothing to
    // report it. DERIVED from CASCADES, never restated.
    const targets = Object.values(CASCADES)
      .flat()
      .map((c) => c.targetTransitionId);
    expect(targets.length).toBeGreaterThan(0); // population guard
    const granted = new Set(AUTOMATION_ATOMS);
    const uncovered = targets
      .filter((id) => {
        const t = getTransition(id);
        return !t || !granted.has(t.requiredRole);
      })
      .sort();
    expect(
      uncovered,
      'A CASCADE TARGET THE AUTOMATION GRANT DOES NOT COVER WILL FAIL SILENTLY\n' +
        'inside the fan-out’s catch. Nothing else in the suite would notice:\n' +
        uncovered.join('\n'),
    ).toEqual([]);
  });

  it('the machine atoms are exactly the ones no human surface can fire', () => {
    // DERIVED from `surfaceable`, not from `trigger` — the two disagree, and
    // `t_gr_post` is the disagreement that matters: `trigger: system` but
    // `surfaced: true`, because a person presses it on BuyerGoodsReceipt.
    // Deriving ownership from `trigger` would take the SAP post off the dock.
    const humanAtoms = new Set(
      getKnownFlows()
        .flatMap((f) => f.transitions)
        .filter((t) => t.surfaceable.surfaced)
        .map((t) => t.requiredRole),
    );
    expect(humanAtoms.has('gr:post')).toBe(true);
    const assignable = new Set(Object.values(SYSTEM_ROLES).flat());
    const missing = [...humanAtoms].filter((a) => !assignable.has(a)).sort();
    expect(
      missing,
      'A SURFACEABLE VERB WHOSE ATOM NO ASSIGNABLE ROLE HOLDS renders as\n' +
        '"no role holds this action" on a screen a person is meant to act on:\n' +
        missing.join('\n'),
    ).toEqual([]);
  });
});

describe('THE OPERATOR RULINGS, ASSERTED', () => {
  it('procurement does NOT hold invoice:pay; finance DOES', () => {
    expect(SYSTEM_ROLES.procurement).not.toContain('invoice:pay');
    expect(SYSTEM_ROLES.finance).toContain('invoice:pay');
    // The segregation is only real if it is mutual — finance must not quietly
    // acquire the sourcing verbs either.
    expect(SYSTEM_ROLES.finance).not.toContain('rfq:award');
    expect(SYSTEM_ROLES.procurement).toContain('rfq:award');
  });

  it('award, sourcing, orders and receipts stay on the procurement side', () => {
    expect(SYSTEM_ROLES.procurement).toEqual(
      expect.arrayContaining(['rfq:award', 'rfq:publish', 'quotation:review']),
    );
    expect(SYSTEM_ROLES.receiving).toEqual(
      expect.arrayContaining(['gr:receive', 'gr:inspect', 'gr:disposition', 'gr:post']),
    );
  });

  it('⚠️ enforcement:set is STILL procurement — the ruled move waits on a caller', () => {
    // The operator ruled it belongs to `compliance` (segregation of duties: if
    // procurement can set the halal enforcement mode, procurement can lower the
    // bar it is measured against). The ruling is BOOKED, NOT WITHDRAWN, and its
    // precondition is a caller: `useEnforcementSet` does not exist, no shipped
    // site dispatches `t_enforcement_set`, and the verb is `ruled-unsurfaced`.
    // Retiring the persona-wide grant AND moving the atom in one batch would
    // leave the enforcement lane unreachable with nothing to catch it.
    //
    // ⚠️ THIS TEST IS THE BOOKMARK. It fails the day the atom moves, which is
    // the day somebody must confirm the caller exists.
    expect(SYSTEM_ROLES.procurement).toContain('enforcement:set');
    expect(SYSTEM_ROLES.compliance).not.toContain('enforcement:set');
  });

  it('the ruled successor is not foreclosed — a bundle is copyable data', () => {
    // "A custom role is a COPY of a system role's atoms plus additions."
    // Copying a bundle must be a value operation, not a fork of a code path.
    const custom = [...SYSTEM_ROLES.procurement, 'gr:post'];
    expect(custom).toEqual(expect.arrayContaining([...SYSTEM_ROLES.procurement]));
    expect(custom).toContain('gr:post');
    // ADDITIVE, NOT SUBTRACTIVE — a copy never loses what it copied.
    expect(custom.length).toBe(SYSTEM_ROLES.procurement.length + 1);
    // And a custom id stays distinguishable at the record level.
    expect(isSystemRole('procurement-jakarta-night-shift')).toBe(false);
  });
});

describe('atomsFor — resolution', () => {
  it('unions bundles and dedupes a shared atom', () => {
    // `asn:flag` is in `receiving` AND the automation grant: the clerk resolves
    // a discrepancy, the GR cascade raises one, on the SAME atom.
    const both = atomsFor(['receiving', AUTOMATION_ROLE]);
    expect(both.filter((a) => a === 'asn:flag')).toHaveLength(1);
    expect(both).toContain('gr:post');
    expect(both).toContain('quotation:award');
  });

  it('an unknown role grants NOTHING — it does not throw and does not widen', () => {
    // The failure direction matters: an unrecognised id must contribute zero
    // atoms, never fall back to a persona span. That fallback IS the wildcard.
    expect(atomsFor(['not-a-role'])).toEqual([]);
    expect(atomsFor([])).toEqual([]);
    // Known-GOOD control beside it.
    expect(atomsFor(['finance'])).toContain('invoice:pay');
  });

  it('a buyer persona spans exactly the union of its six bundles', () => {
    const six = PERSONA_SYSTEM_ROLES.buyer;
    expect(six).toHaveLength(6);
    const union = new Set(six.flatMap((r) => SYSTEM_ROLES[r as SystemRoleId]));
    expect(new Set(atomsFor(six))).toEqual(union);
  });
});

describe('rolesHolding', () => {
  it('names the owners of a withheld atom, and is empty for a machine one', () => {
    expect(rolesHolding('invoice:pay')).toEqual(['finance']);
    expect(rolesHolding('gr:post')).toEqual(['receiving']);
    // A machine atom has no assignable owner — which is what makes the
    // `unowned` arm of the handoff distinguishable from `withheld`.
    expect(rolesHolding('shipment:advance')).toEqual([]);
    expect(rolesHolding('po:issue')).toEqual([]);
  });
});
