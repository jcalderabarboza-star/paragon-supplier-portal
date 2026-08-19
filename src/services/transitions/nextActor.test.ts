// ────────────────────────────────────────────────────────────────────────────
// `nextActorFrom` — whose act is next, derived from the machine.
//
// ⚠️ **THE POPULATION IS DERIVED, NOT LISTED.** Every case below iterates
// `getFlow(...).states`, so a state added to a machine cannot slip past this
// spec by not being mentioned in it. A hand-written list of five state names
// would have been shorter and would have stopped tracking the flow the day it
// gained a sixth (CLAUDE.md, derivation rule 1).
//
// ⚠️ **AND THE GUARD IS PROBED BOTH WAYS.** The failure this helper invites is
// not "it returns nothing" — it is "it confidently returns the WRONG actor",
// which renders as a calm, plausible sentence telling a supplier to wait for
// someone who is not coming. So the controls assert a known-TRUE membership
// (`Draft` IS the supplier's) beside a known-FALSE one (`Submitted` is NOT),
// on the same instrument. A one-directional probe passes on a helper that
// answers "buyer" to everything.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

// ⚠️ THE BARREL, NOT `./registry` — `EMPTY-INPUT-REPORTS-CLEAN-01` (§42b).
// `./registry` is the store; `./index` is what makes the shipped flows
// SELF-REGISTER. Imported narrowly, every assertion here runs over an empty
// machine and the whole file goes green-by-vacuum. The first draft of this
// spec did exactly that, and only the membership control caught it.
import { nextActorFrom, userVerbsFrom, isTerminalState, getFlow } from './index';
import { PERSONA_ROLES, personaCan } from './roles';

const RR = 'requirementResponse';
const states = () => getFlow(RR)!.states;

describe('nextActorFrom — controls (a wrong actor is worse than no actor)', () => {
  it('CONTROL, known-TRUE: Draft is the SUPPLIER\'s turn — the one state they own', () => {
    const next = nextActorFrom(RR, 'Draft');
    expect(next.kind).toBe('actors');
    expect(next.kind === 'actors' && next.personas).toContain('supplier');
  });

  it('CONTROL, known-FALSE: Submitted is NOT the supplier\'s turn', () => {
    const next = nextActorFrom(RR, 'Submitted');
    expect(next.kind).toBe('actors');
    expect(next.kind === 'actors' && next.personas).not.toContain('supplier');
    expect(next.kind === 'actors' && next.personas).toContain('buyer');
  });

  it('CONTROL: the flow is registered and non-trivial (an empty machine reports clean)', () => {
    // EMPTY-INPUT-REPORTS-CLEAN-01 (§42b): every assertion below is vacuously
    // true over an unregistered flow, so membership is asserted, never a count.
    expect(states()).toContain('Disputed');
    expect(getFlow(RR)!.transitions.length).toBeGreaterThan(0);
  });
});

describe('nextActorFrom — the three outcomes stay distinct', () => {
  it('a declared terminal is `ended`, and nobody acts there', () => {
    for (const s of states().filter((x) => isTerminalState(RR, x))) {
      expect(nextActorFrom(RR, s)).toEqual({ kind: 'ended' });
    }
    // The terminal set is non-empty, or the loop above proved nothing.
    expect(states().filter((x) => isTerminalState(RR, x)).length).toBeGreaterThan(0);
  });

  it('⚠️ NO RequirementResponse state is `stranded` — the branch that renders NOTHING', () => {
    // `stranded` is a FINDING, and the surface renders nothing for it. That is
    // right (inventing copy for a hole would hide it) but it means a regression
    // into `stranded` would look like a quiet, tidy page. This test is the only
    // thing watching that branch, so it names the offender rather than counting.
    const stranded = states().filter((s) => nextActorFrom(RR, s).kind === 'stranded');
    expect(stranded).toEqual([]);
  });

  it('an unknown entity and an unknown state are `stranded`, never `ended`', () => {
    // Distinct from `userVerbsFrom`, which returns [] for both — right for
    // "what may I offer?", wrong for "who acts next?".
    expect(nextActorFrom('__no_such_entity__', 'Draft').kind).toBe('stranded');
    expect(nextActorFrom(RR, '__no_such_state__').kind).toBe('stranded');
  });
});

describe('nextActorFrom — agrees with the machine on every state', () => {
  it('the named personas are exactly those holding a surfaceable exit role', () => {
    for (const s of states()) {
      const verbs = userVerbsFrom(RR, s);
      const expected = (Object.keys(PERSONA_ROLES) as Array<keyof typeof PERSONA_ROLES>).filter(
        (p) => verbs.some((v) => personaCan(p, v.requiredRole)),
      );
      const next = nextActorFrom(RR, s);
      if (expected.length === 0) {
        expect(next.kind).not.toBe('actors');
      } else {
        expect(next).toEqual({ kind: 'actors', personas: expected });
      }
    }
  });

  it('every non-terminal state names at least one actor (the R1a claim, derived)', () => {
    const silent = states().filter(
      (s) => !isTerminalState(RR, s) && nextActorFrom(RR, s).kind !== 'actors',
    );
    expect(silent).toEqual([]);
  });
});
