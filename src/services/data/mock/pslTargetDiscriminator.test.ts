// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE WRITE-VERB DISCRIMINATOR — AIMED AT A DEFECT `materialRequestTarget`
// NAMES IN ITS OWN COMMENT.
//
// `CommandTarget.applyTransition` receives `(entityId, toState, payload,
// scope)` and **NO `transitionId`**. `materialRequestTarget` keys on `toState`
// alone and says why that is safe there:
//
//   *"each of the three states written below has exactly ONE inbound edge …
//   DERIVE IT FROM THE FLOW BEFORE ADDING A FOURTH: a state that gains a second
//   inbound edge makes one of these writes fire on the wrong verb, SILENTLY."*
//
// **On `psl` that condition is false from day one.** `Listed` has FIVE inbound
// edges: `t_psl_grant` moves to it, and `t_psl_change_status`, `t_psl_renew`,
// `t_psl_publish` and `t_psl_cap_override` are all `statePreserving` on it. So
// `pslWriteVerbFor` exists, and this file is what stops it rotting.
//
// ── ⚠️ DERIVED FROM THE FLOW, NEVER FROM A LIST ────────────────────────────
//   The population is `pslFlow.transitions` — the shipped machine. Each
//   non-creation edge is replayed through the SHIPPED discriminator using its
//   own declared `requiredFields`, and the answers must be DISTINCT. Add a
//   sixth edge into `Listed` whose fields collide with an existing one and this
//   goes red before the wrong write can ship.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { pslWriteVerbFor } from './MockCommandService';
import { pslFlow } from '../../transitions/flows/psl.flow';

/** A payload carrying exactly the fields a transition declares. */
const payloadFor = (fields: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(fields.map((f) => [f, 'x']));

/** The lifecycle a transition departs FROM. `statePreserving` edges rest on
 *  their own state, so `from[0]` is what the store holds when they fire. */
const fromStateOf = (t: (typeof pslFlow.transitions)[number]): string | null =>
  t.from.length > 0 ? t.from[0] : null;

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the machine really has the shape this guard exists for', () => {
  it('⚠️ `Listed` HAS MORE THAN ONE INBOUND EDGE — else the discriminator is pointless', () => {
    const inbound = pslFlow.transitions.filter((t) => t.to === 'Listed');
    expect(inbound.length).toBeGreaterThan(1);
    // and the population is the whole machine, not a sample.
    expect(pslFlow.transitions.length).toBeGreaterThan(5);
  });

  it('⚠️ AND `materialRequest`S CONDITION GENUINELY DOES NOT HOLD HERE', () => {
    // The comment this guard answers is a claim about the OTHER flow. Asserting
    // the contrast is what stops somebody "simplifying" this target back to a
    // `toState` switch by reading that comment and not this one.
    const byState = new Map<string, number>();
    for (const t of pslFlow.transitions) {
      if (t.trigger === 'creation') continue;
      byState.set(t.to, (byState.get(t.to) ?? 0) + 1);
    }
    expect([...byState.values()].some((n) => n > 1)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EVERY NON-CREATION EDGE RESOLVES TO A DISTINCT WRITE VERB', () => {
  it('the discriminator names each transition uniquely, derived from the flow', () => {
    const resolved = new Map<string, string>();
    for (const t of pslFlow.transitions) {
      if (t.trigger === 'creation') continue;
      const verb = pslWriteVerbFor(t.to, fromStateOf(t), payloadFor(t.requiredFields));
      expect(verb, `${t.id} resolves to no write verb`).not.toBeNull();
      resolved.set(t.id, verb!);
    }
    // ⚠️ THE PROPERTY: distinct transitions, distinct verbs. A collision means
    // one edge's write fires on another edge's dispatch — silently.
    const verbs = [...resolved.values()];
    expect(new Set(verbs).size, `collision: ${JSON.stringify([...resolved])}`).toBe(
      verbs.length,
    );
    // and it covered the machine rather than a subset of it.
    expect(resolved.size).toBe(pslFlow.transitions.filter((t) => t.trigger !== 'creation').length);
  });

  it('⚠️ THE MAPPING IS THE ONE THE TARGET MEANS — named, not merely distinct', () => {
    // Distinctness alone would be satisfied by a permutation. These are the
    // assignments the writes in `pslTarget` depend on.
    const verbOf = (id: string): string | null => {
      const t = pslFlow.transitions.find((x) => x.id === id)!;
      return pslWriteVerbFor(t.to, fromStateOf(t), payloadFor(t.requiredFields));
    };
    expect(verbOf('t_psl_grant')).toBe('grant');
    expect(verbOf('t_psl_reject')).toBe('reject');
    expect(verbOf('t_psl_withdraw')).toBe('withdraw');
    expect(verbOf('t_psl_change_status')).toBe('change_status');
    expect(verbOf('t_psl_renew')).toBe('renew');
    expect(verbOf('t_psl_publish')).toBe('publish');
    expect(verbOf('t_psl_cap_override')).toBe('cap_override');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE DISCRIMINATOR ITSELF, PROBED BOTH WAYS', () => {
  it('a state this machine does not write resolves to NOTHING, never to a default', () => {
    // ⚠️ A discriminator that fell back to `publish` on an unknown state would
    // silently disclose a listing on any future edge somebody added.
    expect(pslWriteVerbFor('Proposed', 'Proposed', {})).toBeNull();
    expect(pslWriteVerbFor('Archived', 'Listed', {})).toBeNull();
  });

  it('⚠️ THE GRANT IS SEPARATED BY THE CURRENT LIFECYCLE, not by the payload', () => {
    // `t_psl_grant` and `t_psl_withdraw`-on-Listed both carry `{reason}`. The
    // FROM state is what tells them apart, which is why the target reads the
    // row before it writes.
    expect(pslWriteVerbFor('Listed', 'Proposed', { reason: 'x' })).toBe('grant');
    expect(pslWriteVerbFor('Listed', 'Listed', { reason: 'x' })).toBe('publish');
  });

  it('⚠️ AND THE FOUR APPENDS ARE SEPARATED BY THEIR OWN DECLARED FIELD', () => {
    expect(pslWriteVerbFor('Listed', 'Listed', {})).toBe('publish');
    expect(pslWriteVerbFor('Listed', 'Listed', { status: 'Mandatory', reason: 'x' })).toBe(
      'change_status',
    );
    expect(pslWriteVerbFor('Listed', 'Listed', { validUntil: '2030-01-01', reason: 'x' })).toBe(
      'renew',
    );
    expect(
      pslWriteVerbFor('Listed', 'Listed', { capDaysOverride: 90, capJustification: 'x' }),
    ).toBe('cap_override');
  });
});
