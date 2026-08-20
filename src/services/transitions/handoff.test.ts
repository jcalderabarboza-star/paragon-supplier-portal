import { describe, it, expect } from 'vitest';
import { getKnownFlows } from './index';
import {
  availabilityOfAtom,
  availabilityOf,
  ROLE_LABEL_KEY,
  ownerLabelKeys,
} from './handoff';
import { SYSTEM_ROLES, AUTOMATION_ROLE, type SystemRoleId } from './businessRoles';
import { getTransition } from './registry';
import { rolesEn, rolesId } from '../../lib/i18n/roles';

describe('POPULATION GUARD', () => {
  it('the catalog is loaded and the verbs under test exist', () => {
    expect(getKnownFlows().length).toBeGreaterThan(10);
    expect(getTransition('t_invoice_release_payment')).toBeDefined();
    expect(getTransition('t_gr_post')).toBeDefined();
    expect(getTransition('t_not_a_verb')).toBeUndefined();
  });
});

describe('⚠️ THE BINDING CONSTRAINT — a withheld verb names its owner', () => {
  it('a procurement seat does not HOLD the release, and the owner is FINANCE', () => {
    const release = getTransition('t_invoice_release_payment')!;
    const seat = availabilityOf(release, ['procurement']);
    expect(seat.kind).toBe('withheld');
    // The whole point: not merely "you may not", but WHOSE act it is. An
    // affordance that vanishes and an affordance that says "Awaiting Finance"
    // are the difference between a clean process boundary and finance being an
    // invisible bottleneck.
    expect(seat.kind === 'withheld' && seat.owners).toEqual(['finance']);
  });

  it('a finance seat HOLDS it — the known-GOOD half of the probe', () => {
    // §39: assert a known-GOOD input passes before believing a known-BAD one
    // failed. Without this, "withheld" above is equally consistent with a
    // broken resolver, an unregistered flow, or a typo in the atom.
    const release = getTransition('t_invoice_release_payment')!;
    expect(availabilityOf(release, ['finance']).kind).toBe('held');
    expect(availabilityOf(release, ['procurement', 'finance']).kind).toBe('held');
  });

  it('⚠️ `unowned` IS KEPT APART FROM `withheld` — never "Awaiting nobody"', () => {
    // A machine atom has no assignable owner. Collapsing the two arms would let
    // a surface promise an act that will never come — the same error
    // `nextActorFrom` refuses when it keeps `stranded` apart from `ended`.
    expect(availabilityOfAtom('shipment:advance', ['procurement']).kind).toBe('unowned');
    expect(availabilityOfAtom('po:issue', ['procurement', 'finance'])).toEqual({
      kind: 'unowned',
    });
    // The automation grant genuinely holds it — `unowned` is about ASSIGNABLE
    // owners, not about whether anything can fire it.
    expect(availabilityOfAtom('po:issue', [AUTOMATION_ROLE]).kind).toBe('held');
  });

  it('an empty seat withholds rather than crashing, and still names the owner', () => {
    const a = availabilityOfAtom('gr:post', []);
    expect(a.kind).toBe('withheld');
    expect(a.kind === 'withheld' && a.owners).toEqual(['receiving']);
  });
});

describe('⚠️ THE LABEL BIND — what replaced the two-arm ternary', () => {
  // THE LIVE TRAP: `SupplierForecasts.tsx` keyed the R1a actor line on
  // `personas.includes('supplier') ? supplier : buyer`, TOTAL ONLY BECAUSE
  // `PersonaType` has two members. A third actor falls through to "Awaiting
  // Paragon" over a finance-owned verb — the exact mislabel the constraint
  // forbids, produced by the mechanism meant to prevent it.
  it('every system role has a label key, in BOTH locales', () => {
    const roles = Object.keys(SYSTEM_ROLES) as SystemRoleId[];
    expect(roles.length).toBeGreaterThan(0); // population guard
    for (const r of roles) {
      const key = ROLE_LABEL_KEY[r];
      expect(key, `no label key for role '${r}'`).toBeTruthy();
      expect(rolesEn[key], `EN missing ${key}`).toBeTruthy();
      expect(rolesId[key], `ID missing ${key}`).toBeTruthy();
    }
  });

  it('ROLE_LABEL_KEY has no key that is not a system role', () => {
    // The other direction — a stale key for a role that no longer exists would
    // never render and would never fail.
    const extra = Object.keys(ROLE_LABEL_KEY).filter((k) => !(k in SYSTEM_ROLES));
    expect(extra).toEqual([]);
  });

  it('ID is a real translation, not an English passthrough', () => {
    // A locale fragment that copies EN reads as "translated" to every count and
    // to every smoke test that only checks presence.
    expect(rolesId['roles.owner.finance']).not.toBe(rolesEn['roles.owner.finance']);
    expect(rolesId['roles.handoff.awaiting']).not.toBe(rolesEn['roles.handoff.awaiting']);
    // …but the interpolation token must survive translation, or the owner's
    // name silently disappears from the Indonesian line.
    expect(rolesId['roles.handoff.awaiting']).toContain('{{owner}}');
    expect(rolesEn['roles.handoff.awaiting']).toContain('{{owner}}');
  });

  it('ownerLabelKeys is stable and order-independent of its input', () => {
    expect(ownerLabelKeys(['finance'])).toEqual(['roles.owner.finance']);
    const a = ownerLabelKeys(['finance', 'procurement']);
    const b = ownerLabelKeys(['procurement', 'finance']);
    expect(a).toEqual(b);
    expect(a).toEqual(['roles.owner.procurement', 'roles.owner.finance']);
  });
});

describe('EVERY SURFACEABLE VERB CAN NAME AN OWNER', () => {
  it('no surfaceable verb resolves to `unowned` for a full buyer seat', () => {
    // If this goes red, some human-facing act renders "no role holds this
    // action" — which is a FINDING about the bundles, not copy.
    const fullBuyer: SystemRoleId[] = [
      'procurement',
      'receiving',
      'finance',
      'compliance',
      'planning',
      'requisitioner',
    ];
    const surfaced = getKnownFlows()
      .flatMap((f) => f.transitions)
      .filter((t) => t.surfaceable.surfaced);
    expect(surfaced.length).toBeGreaterThan(20); // population guard
    const orphans = surfaced
      .filter((t) => availabilityOf(t, [...fullBuyer, 'supplier']).kind === 'unowned')
      .map((t) => t.id);
    expect(orphans).toEqual([]);
  });
});
