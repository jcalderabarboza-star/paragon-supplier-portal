// ─────────────────────────────────────────────────────────────────────────────
// THE BOUNDARY HAS AN OWNER — the gate, bilateral in every direction it has.
//
// The claim this file defends: **every act Paragon refuses to originate names
// the system that does, and nothing else names one.** That is one sentence with
// two halves, and a gate asserting only the first would go green on a `computed`
// verb declaring "Owned by S/4HANA" over the platform's own arithmetic — a seam
// claimed where none exists, which is the boundary statement INVERTED rather
// than merely incomplete.
//
// ⚠️ **THE POPULATION CONTROL IS THE FIRST TEST AND IT ASSERTS MEMBERSHIP, NEVER
// A COUNT** (`EMPTY-INPUT-REPORTS-CLEAN-01`, §42b). Every assertion below is a
// filter over the registry, and a filter over an EMPTY registry passes — the
// import-graph mistake that produced *"0 colliding"* over zero flows. Importing
// `./index` rather than `./registry` is what makes the flows self-register; the
// control is what proves they did.
//
// ⚠️ **AND THE COUNTS ARE DERIVED, NEVER RESTATED** (`FLOOR-IN-PROSE-01`). This
// file does not assert "15 external facts" or "3 owners". It asserts the two
// SETS agree, in both directions, so the day a verb is added or an owner seeded
// the gate re-decides itself with nobody editing a number.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getKnownFlows } from './index';
import { validateFlow } from './validate';
import type { ExternalFactOwner, FlowDefinition, Surfaceability } from './schema';
import { EXTERNAL_FACT_OWNER_KEY } from '../../lib/i18n/externalFactOwner';
import { processFlowsEn, processFlowsId } from '../../lib/i18n/processFlows';

/**
 * The union's members AS DATA, exhaustive BY TYPE. A `Record<ExternalFactOwner,
 * true>` cannot omit a member without `tsc` failing HERE, so this list tracks
 * the union rather than restating it — which is what lets the assertions below
 * compare the type against the runtime set instead of against a literal.
 */
const OWNERS = Object.keys({
  s4hana: true,
  tms: true,
  bank: true,
} satisfies Record<ExternalFactOwner, true>) as ExternalFactOwner[];

const allTransitions = () => getKnownFlows().flatMap((f) => f.transitions);
const notSurfaced = () => allTransitions().filter((t) => t.surfaceable.surfaced === false);
const becauseOf = (s: Surfaceability): string => (s as { because: string }).because;
const ownerOf = (s: Surfaceability): unknown => (s as { owner?: unknown }).owner;

describe('POPULATION CONTROL — everything below filters, and a filter over nothing passes', () => {
  it('the registry is populated and holds a known-true member', () => {
    const ids = allTransitions().map((t) => t.id);
    // Known-TRUE and known-FALSE on the same instrument, in the same run.
    expect(ids).toContain('t_po_issue');
    expect(ids).not.toContain('t_no_such_verb');
    expect(notSurfaced().length).toBeGreaterThan(0);
  });

  it('external-fact AND computed are both represented — the render branches on the difference', () => {
    const reasons = new Set(notSurfaced().map((t) => becauseOf(t.surfaceable)));
    expect(reasons).toContain('external-fact');
    expect(reasons).toContain('computed');
  });
});

describe('the owner is declared, both directions', () => {
  it('every external-fact act names an owner from the closed set', () => {
    const unowned = notSurfaced()
      .filter((t) => becauseOf(t.surfaceable) === 'external-fact')
      .filter((t) => !OWNERS.includes(ownerOf(t.surfaceable) as ExternalFactOwner))
      .map((t) => `${t.id} names ${String(ownerOf(t.surfaceable))}`);
    expect(unowned).toEqual([]);
  });

  it('NO act that is not an external fact carries an owner', () => {
    // The half a one-directional gate would miss.
    const overclaimed = allTransitions()
      .filter((t) => t.surfaceable.surfaced === true || becauseOf(t.surfaceable) !== 'external-fact')
      .filter((t) => ownerOf(t.surfaceable) !== undefined)
      .map((t) => t.id);
    expect(overclaimed).toEqual([]);
  });

  it('every member of the union is USED — no owner is decorative', () => {
    // An arm nothing reaches is two locale strings nobody ever sees, and it
    // lets the render carry copy for a seam that was never declared.
    const used = new Set(
      notSurfaced()
        .filter((t) => becauseOf(t.surfaceable) === 'external-fact')
        .map((t) => ownerOf(t.surfaceable) as ExternalFactOwner),
    );
    expect([...used].sort()).toEqual([...OWNERS].sort());
  });
});

describe('the copy is bilateral — an owner with no string, or a string with no owner, is red', () => {
  it('every owner has a key, and every key resolves in BOTH locales', () => {
    for (const o of OWNERS) {
      const key = EXTERNAL_FACT_OWNER_KEY[o];
      expect(key, o).toBeTruthy();
      expect(processFlowsEn[key], `${o} EN`).toBeTruthy();
      expect(processFlowsId[key], `${o} ID`).toBeTruthy();
    }
    for (const k of ['processFlows.owner.ownedBy', 'processFlows.owner.computedHere']) {
      expect(processFlowsEn[k], `${k} EN`).toBeTruthy();
      expect(processFlowsId[k], `${k} ID`).toBeTruthy();
    }
  });

  it('no owner key exists that no owner claims', () => {
    const FRAMING = ['processFlows.owner.ownedBy', 'processFlows.owner.computedHere'];
    const claimed = new Set(OWNERS.map((o) => EXTERNAL_FACT_OWNER_KEY[o]));
    const orphans = Object.keys(processFlowsEn)
      .filter((k) => k.startsWith('processFlows.owner.'))
      .filter((k) => !claimed.has(k) && !FRAMING.includes(k));
    expect(orphans).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE VALIDATOR, PROBED BOTH WAYS ON THE SAME SYNTHETIC FLOW (rule 4).
//
// ⚠️ **KNOWN-GOOD FIRST, AND THAT ORDER IS THE RULE, NOT A PREFERENCE.** A
// refusal proves nothing until acceptance is shown on the same instrument: a
// validator that refuses EVERYTHING refuses the bad input too, and reads exactly
// like a working gate. `surfaceable.test.ts` states this at length; the harness
// shape is reused here so the two cannot drift.
// ─────────────────────────────────────────────────────────────────────────────

const flow = (surfaceable: unknown): FlowDefinition =>
  ({
    entity: 'probe_owner',
    version: 1,
    states: ['A', 'B'],
    initial: 'A',
    terminals: ['B'],
    transitions: [
      {
        id: 't_probeowner_move',
        from: ['A'],
        to: 'B',
        trigger: 'system',
        requiredRole: 'po:issue',
        requiredFields: [],
        policyHooks: [],
        surfaceable,
        version: 1,
      },
    ],
  }) as unknown as FlowDefinition;

const WHY = 'A carrier feed reports this milestone; nobody in Paragon initiates it.';

describe('the runtime validator — probed BOTH ways on the same synthetic flow', () => {
  it('KNOWN-GOOD FIRST: a well-formed external fact with an owner VALIDATES', () => {
    const r = validateFlow(
      flow({ surfaced: false, because: 'external-fact', owner: 'tms', why: WHY }),
    );
    expect(r.ok, r.ok ? '' : r.errors.join(' | ')).toBe(true);
  });

  it('a MISSING owner is refused', () => {
    const r = validateFlow(flow({ surfaced: false, because: 'external-fact', why: WHY }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/must name its owner/);
  });

  it('an INVENTED owner is refused — the set is closed, not a suggestion', () => {
    const r = validateFlow(
      flow({ surfaced: false, because: 'external-fact', owner: 'coupa', why: WHY }),
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/must name its owner/);
  });

  it('an owner on a COMPUTED act is refused — the other direction', () => {
    const r = validateFlow(
      flow({
        surfaced: false,
        because: 'computed',
        owner: 's4hana',
        why: 'The match engine derives this from what the platform already holds.',
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/only 'external-fact' may carry an 'owner'/);
  });

  it('a surfaced act is untouched by any of this', () => {
    const r = validateFlow(flow({ surfaced: true }));
    expect(r.ok, r.ok ? '' : r.errors.join(' | ')).toBe(true);
  });
});
