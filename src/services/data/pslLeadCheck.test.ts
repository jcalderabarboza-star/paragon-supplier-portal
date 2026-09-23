// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE RESTRICTIVE-DESIGNATION CHECK — the pure function, and its two readers.
//
// ⚠️ **THE POINT OF THIS FILE IS THAT THE HOOK AND THE SURFACE ASK THE SAME
// FUNCTION.** `handlePinConfirm` / `rfq_fx_pin_well_formed` is the precedent
// and its note is the reason: *"the dialog's own button is already disabled on
// a refusal; this is the structural twin, so a keyboard or a future caller
// cannot route around it."* Two implementations that agree today are two
// implementations, and the one that drifts is always the one nobody renders in
// the case that matters.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import {
  restrictiveDecisionVerdict,
  suspendsBidding,
  PSL_DECIDE_ATOM,
  PSL_PROPOSE_ATOM,
} from './pslLeadCheck';
import { suspendsCompetitiveBidding } from './pslSourcingSeam';
import { PSL_STATUSES } from './pslListing';
import { SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '../transitions/businessRoles';
import { atomsForSeat } from '../transitions/customRoles';

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the vocabulary and the lanes are real', () => {
  it('the designation union is non-empty and the two atoms are held by somebody', () => {
    expect(PSL_STATUSES.length).toBeGreaterThan(2);
    const holders = (atom: string): string[] =>
      Object.keys(SYSTEM_ROLES).filter((r) =>
        (SYSTEM_ROLES as Record<string, readonly string[]>)[r].includes(atom),
      );
    expect(holders(PSL_PROPOSE_ATOM).length).toBeGreaterThan(0);
    expect(holders(PSL_DECIDE_ATOM).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ ONE RULE, TWO READERS — the split cannot drift', () => {
  it('`suspendsBidding` and `suspendsCompetitiveBidding` agree across the WHOLE vocabulary', () => {
    // ⚠️ **DERIVED OVER THE UNION, NEVER SAMPLED.** A spec that checked two
    // designations would pass on a pair that happened to agree; a third member
    // added tomorrow is covered here with no edit.
    for (const status of PSL_STATUSES) {
      const bare = suspendsBidding(status);
      const viaStanding = suspendsCompetitiveBidding({
        kind: 'IN_FORCE',
        status,
        listings: [],
      });
      expect(bare, status).toBe(viaStanding);
    }
    // ANTI-VACUITY: the two answers must not be uniformly true or uniformly
    // false, or the agreement above would be satisfied by a constant.
    const answers = new Set(PSL_STATUSES.map(suspendsBidding));
    expect(answers.size).toBe(2);
  });

  it('`Validated` competes, the other two do not — the policy split, by name', () => {
    expect(suspendsBidding('Validated')).toBe(false);
    expect(suspendsBidding('Mandatory')).toBe(true);
    expect(suspendsBidding('Sole Source')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE VERDICT — and what it deliberately does NOT claim', () => {
  const both = [PSL_PROPOSE_ATOM, PSL_DECIDE_ATOM];

  it('`Validated` is NOT_RESTRICTIVE even on a seat holding both authorities', () => {
    // The exemption is about the DESIGNATION, not the seat: a pre-qualification
    // that still competes removes nothing, so there is nothing extra to sign.
    expect(restrictiveDecisionVerdict('Validated', both).kind).toBe('NOT_RESTRICTIVE');
  });

  it('⚠️ A SEAT HOLDING BOTH IS REFUSED ON A RESTRICTIVE DESIGNATION', () => {
    expect(restrictiveDecisionVerdict('Mandatory', both).kind).toBe('SEAT_HOLDS_BOTH');
    expect(restrictiveDecisionVerdict('Sole Source', both).kind).toBe('SEAT_HOLDS_BOTH');
  });

  it('⚠️ AND A SEAT HOLDING ONLY THE DECIDING ATOM IS ADMITTED — rule 4, in order', () => {
    // Known-GOOD before the known-BAD is believed. A predicate that refused
    // everything would pass every assertion above.
    expect(restrictiveDecisionVerdict('Mandatory', [PSL_DECIDE_ATOM]).kind).toBe('SEGREGATED');
    expect(restrictiveDecisionVerdict('Sole Source', [PSL_DECIDE_ATOM]).kind).toBe(
      'SEGREGATED',
    );
  });

  it('a seat holding only the PROPOSING atom is `SEGREGATED` too — it simply cannot decide', () => {
    // ⚠️ This is not the check's business. Such a seat is refused at the ROLE
    // gate before any hook runs, and printing a seat-segregation warning at a
    // seat whose real problem is that it holds no deciding authority would be
    // the wrong sentence. `useVerbAvailability` is what says that.
    expect(restrictiveDecisionVerdict('Mandatory', [PSL_PROPOSE_ATOM]).kind).toBe(
      'SEGREGATED',
    );
    expect(restrictiveDecisionVerdict('Mandatory', []).kind).toBe('SEGREGATED');
    expect(restrictiveDecisionVerdict('Mandatory', undefined).kind).toBe('SEGREGATED');
  });

  it('⚠️ IT READS ATOMS, NEVER LANE NAMES — the `buyer:all` lesson', () => {
    // A check keyed on the STRING `'procurement'` would wave through a custom
    // role that copies `procurement` under another id. The wildcard was the
    // SHAPE of the grant, not a token in it.
    expect(restrictiveDecisionVerdict('Mandatory', ['procurement', 'compliance']).kind).toBe(
      'SEGREGATED',
    );
    expect(restrictiveDecisionVerdict('Mandatory', both).kind).toBe('SEAT_HOLDS_BOTH');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ §76d — THE DEFAULT BUYER SEAT IS THE CASE THIS EXISTS FOR', () => {
  it('⚠️ THE OUT-OF-BOX SEAT HOLDS BOTH ATOMS, AND IS THEREFORE REFUSED', () => {
    // ⚠️ **MEASURED FROM THE SHIPPED SEED, NOT ASSERTED.** `SEEDED_SEAT_ROLES
    // .buyer` is what a buyer session opens holding, and this is the first
    // place in the platform where §76d's segregation actually BINDS rather than
    // being merely expressible.
    const atoms = atomsForSeat([...SEEDED_SEAT_ROLES.buyer]);
    expect(atoms).toContain(PSL_PROPOSE_ATOM);
    expect(atoms).toContain(PSL_DECIDE_ATOM);
    expect(restrictiveDecisionVerdict('Sole Source', atoms).kind).toBe('SEAT_HOLDS_BOTH');

    // ⚠️ AND THE REMEDY IS REACHABLE: narrowing to the deciding lane admits.
    // Without this the gate would be a wall rather than a segregation.
    const narrowed = atomsForSeat(['compliance']);
    expect(narrowed).toContain(PSL_DECIDE_ATOM);
    expect(narrowed).not.toContain(PSL_PROPOSE_ATOM);
    expect(restrictiveDecisionVerdict('Sole Source', narrowed).kind).toBe('SEGREGATED');
  });

  it('⚠️ AND THE DEFAULT SEAT CAN STILL DECIDE A `Validated` LISTING', () => {
    // The gate is narrow on purpose: it bites only on the designations that
    // suspend competitive bidding, which is where the policy puts the bar. A
    // gate that stopped every decision would be a different rule.
    const atoms = atomsForSeat([...SEEDED_SEAT_ROLES.buyer]);
    expect(restrictiveDecisionVerdict('Validated', atoms).kind).toBe('NOT_RESTRICTIVE');
  });
});
