// GL-1 — the appearance derivation, and the PROOF THAT IT BITES.
//
// ⚠️ **THE HEADLINE RESULT OF THIS DERIVATION IS SUSPICIOUSLY SMALL: 3 of 64
// glossary terms appear in any transition table.** Under the standing heuristic
// (`CENSUS-MUST-DERIVE-01`) a small clean number is a bug report about the
// instrument until proved otherwise, so this file proves it otherwise BEFORE
// the page is allowed to report it: every one of the four match kinds is
// asserted against a known-true registry identifier, and a known-false one is
// asserted absent. Only then is 3/64 a fact about the tree rather than about a
// matcher that could not see.
import { describe, it, expect } from 'vitest';
import { appearancesOf, relatedTo, buildGlossaryView } from './appearances';
import { REFUSALS_OUTSIDE_ENFORCEMENT } from '../../lib/enforcement';

describe('appearance derivation — the instrument bites (GL-1)', () => {
  it('finds a STATE, and reports its initial/terminal flags and its edges', () => {
    // `Missing` is the compliance machine's declared initial state.
    const found = appearancesOf('Missing');
    const compliance = found.find((a) => a.entity === 'compliance');
    expect(compliance, 'compliance declares Missing as a state').toBeDefined();
    expect(compliance?.kinds).toContain('state');
    expect(compliance?.isInitial).toBe(true);
    expect(compliance?.transitionIds.length).toBeGreaterThan(0);
  });

  it('finds a TRANSITION id', () => {
    const found = appearancesOf('t_po_confirm');
    expect(found.map((a) => a.entity)).toContain('purchaseOrder');
    expect(found.find((a) => a.entity === 'purchaseOrder')?.kinds).toContain('transition');
    // A verb match reports no edges of its own — reporting the flow's whole edge
    // set there would be noise dressed as derivation.
    expect(found.find((a) => a.entity === 'purchaseOrder')?.transitionIds).toEqual([]);
  });

  it('finds a REQUIRED FIELD', () => {
    const found = appearancesOf('confirmedQuantities');
    expect(found.find((a) => a.entity === 'purchaseOrder')?.kinds).toContain('field');
  });

  it('finds a POLICY HOOK by its registered name', () => {
    const found = appearancesOf('enforcement_set_governed');
    expect(found.find((a) => a.entity === 'enforcement')?.kinds).toContain('hook');
  });

  it('reports ABSENCE for a word no machine spells', () => {
    expect(appearancesOf('SCOPE_DENIED')).toEqual([]);
    expect(appearancesOf('definitely-not-in-any-flow')).toEqual([]);
  });

  it('leaves the CLOCK-PROJECTED compliance states empty — law 0.5, not a gap', () => {
    // Expiring/Expired are read-time projections from a date. Law 0.5 keeps them
    // out of every transition table, so an empty appearance list here is the
    // schema being correct. If either of these ever comes back non-empty, a
    // clock-derived state has leaked into a machine.
    expect(appearancesOf('Expiring')).toEqual([]);
    expect(appearancesOf('Expired')).toEqual([]);
  });

  it('shows a SHARED WORD across machines rather than hiding it', () => {
    // `Under Review` is a state in three unrelated machines. The match is exact
    // spelling, so it says so — which is the vocabulary collision the review is
    // for, not a false positive to be matched away.
    const entities = appearancesOf('Under Review').map((a) => a.entity);
    expect(entities).toEqual(expect.arrayContaining(['compliance', 'quotation', 'supplierDocument']));
  });
});

describe('related concepts — derived from shipped declarations only (GL-1)', () => {
  it('relates the halal and BPOM twins by shared key, in both directions', () => {
    const halal = relatedTo('HalalRefusalReason', 'UNKNOWN_MATERIAL');
    expect(halal).toContainEqual({
      sourceType: 'BpomRefusalReason',
      term: 'UNKNOWN_MATERIAL',
      relation: 'shared-word',
    });
    const bpom = relatedTo('BpomRefusalReason', 'UNKNOWN_MATERIAL');
    expect(bpom).toContainEqual({
      sourceType: 'HalalRefusalReason',
      term: 'UNKNOWN_MATERIAL',
      relation: 'shared-word',
    });
  });

  it('never relates a term to itself', () => {
    for (const v of buildGlossaryView()) {
      expect(
        v.related.some((r) => r.sourceType === v.sourceType && r.term === v.term),
        `${v.anchor} relates to itself`,
      ).toBe(false);
    }
  });

  it('links the out-of-domain refusals to UNANSWERED, from the shipped census', () => {
    for (const reason of REFUSALS_OUTSIDE_ENFORCEMENT) {
      const rel = relatedTo('HalalRefusalReason', reason);
      expect(
        rel.some((r) => r.sourceType === 'GovernedVerdict' && r.term === 'UNANSWERED'),
        `${reason} should point at UNANSWERED`,
      ).toBe(true);
    }
    // …and the same declaration read backwards, from one array, not two lists.
    const back = relatedTo('GovernedVerdict', 'UNANSWERED');
    expect(back.length).toBe(REFUSALS_OUTSIDE_ENFORCEMENT.length * 2); // halal + bpom
    expect(back.every((r) => r.relation === 'outside-enforcement')).toBe(true);
  });

  it('relates nothing where the code states nothing', () => {
    expect(relatedTo('QtyRefusalReason', 'EMPTY_QTY')).toEqual([]);
    expect(relatedTo('CommandRefusal', 'ROLE_NOT_PERMITTED')).toEqual([]);
  });
});

describe('the page-ready view (GL-1)', () => {
  it('carries every defined term exactly once, with a unique anchor', () => {
    const view = buildGlossaryView();
    expect(view.length).toBeGreaterThan(40);
    expect(new Set(view.map((v) => v.anchor)).size).toBe(view.length);
  });

  it('every row still carries both locales — the page cannot render half a term', () => {
    for (const v of buildGlossaryView()) {
      expect(v.entry.en.length, `${v.anchor} EN`).toBeGreaterThan(0);
      expect(v.entry.id.length, `${v.anchor} ID`).toBeGreaterThan(0);
    }
  });

  it('renders NOTHING rather than a guess where a derivation is empty', () => {
    // The contract the page depends on: an absent appearance list is `[]`, never
    // a fabricated singleton and never `undefined`. Most terms are refusal
    // reasons — words that describe what happened INSTEAD of a transition — so
    // the empty case is the common one and has to be the safe one.
    const view = buildGlossaryView();
    const empty = view.filter((v) => v.appearances.length === 0);
    expect(empty.length).toBeGreaterThan(0);
    expect(empty.every((v) => Array.isArray(v.appearances) && Array.isArray(v.related))).toBe(true);
  });
});
